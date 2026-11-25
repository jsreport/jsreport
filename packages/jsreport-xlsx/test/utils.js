const os = require('os')
const fs = require('fs')
const path = require('path')
const { DOMParser } = require('@xmldom/xmldom')
const sax = require('sax')
const { parseCell } = require('xlsx-coordinates')
const { decompress } = require('@jsreport/office')
const xlsx = require('xlsx')
const { contentIsXML, isWorksheetFile } = require('../lib/utils')

async function getDocumentsFromXlsxBuf (xlsxBuf, documentPaths, options = {}) {
  // the validation can be skipped when the xlsx was already validated
  // (for example when parseSheetFromXlsxBuf was called with the same xlsx)
  const files = options.validate === false ? await decompress()(xlsxBuf) : await validateXlsxBuf(xlsxBuf)
  const targetFiles = []

  for (const documentPath of documentPaths) {
    const fileRef = files.find((f) => f.path === documentPath)
    targetFiles.push(fileRef)
  }

  const result = targetFiles.map((file) => {
    if (file == null) {
      return null
    }

    return new DOMParser().parseFromString(file.data.toString())
  })

  if (options.returnFiles) {
    return {
      files,
      documents: result
    }
  }

  return result
}

async function parseSheetFromXlsxBuf (xlsxBuf, _sheetNameOrIdx, parseOpts) {
  await validateXlsxBuf(xlsxBuf)

  const workbook = xlsx.read(xlsxBuf, parseOpts)
  let sheet
  let refType
  const sheetNameOrIdx = _sheetNameOrIdx ?? 0

  const output = { workbook }
  const target = []

  if (!Array.isArray(sheetNameOrIdx)) {
    target.push(sheetNameOrIdx)
  } else {
    target.push(...sheetNameOrIdx)
  }

  for (let idx = 0; idx < target.length; idx++) {
    const nameOrIdx = target[idx]

    if (typeof nameOrIdx === 'number') {
      refType = 'index'
      sheet = workbook.Sheets[workbook.SheetNames[nameOrIdx]]
    } else {
      refType = 'name'
      sheet = workbook.Sheets[nameOrIdx]
    }

    if (sheet == null) {
      throw new Error(`Sheet not found for ${refType} "${nameOrIdx}"`)
    }

    let targetName = 'sheet'

    if (idx > 0) {
      targetName += idx + 1
    }

    output[targetName] = sheet
  }

  return output
}

function mergeCellExists (sheet, cellRange) {
  const cellRangeParts = cellRange.split(':')
  const parsedStart = parseCell(cellRangeParts[0])
  const parsedEnd = parseCell(cellRangeParts[1])

  let found = false

  found = sheet['!merges'].find((item) => (
    item.s.r === parsedStart[1] &&
    item.s.c === parsedStart[0] &&
    item.e.r === parsedEnd[1] &&
    item.e.c === parsedEnd[0]
  )) != null

  return found
}

function calcChainCellExists (cellEls, cellRef, sheetId) {
  return cellEls.find((el) => (
    el.getAttribute('r') === cellRef &&
    (sheetId == null || el.getAttribute('i') === sheetId)
  )) != null
}

function createAssertMode (supportedModes) {
  return function assertMode (currentMode, modesFn) {
    if (!supportedModes.includes(currentMode)) {
      throw new Error(`Invalid mode "${currentMode}". Valid modes are: ${supportedModes.join(', ')}`)
    }

    const doAssertFn = modesFn[currentMode]

    if (doAssertFn == null) {
      throw new Error(`Asserts for mode "${currentMode}" not implemented`)
    }

    doAssertFn()
  }
}

const XLSX_FIXTURES_PATH = path.join(__dirname, 'xlsx')
const OUTPUT_PATH = path.join(__dirname, '../out.xlsx')

function createRender (getReporter, { modesPrefix } = {}) {
  return async function render (fixture, data, { helpers, files, sheets, parseOptions, template, prepare } = {}) {
    let fixtureName

    if (fixture != null && typeof fixture === 'object') {
      if (modesPrefix == null) {
        throw new Error('render with { mode, name } fixture requires the "modesPrefix" option')
      }

      switch (fixture.mode) {
        case 'row':
          fixtureName = modesPrefix
          break
        case 'block':
          fixtureName = `${modesPrefix}-block`
          break
        case 'vertical':
          fixtureName = `${modesPrefix}-vertical`
          break
        case 'dynamic':
          fixtureName = `${modesPrefix}-dynamic`
          break
        default:
          throw new Error(`Invalid mode "${fixture.mode}"`)
      }

      if (fixture.name != null && fixture.name !== '') {
        fixtureName += fixture.name
      }
    } else {
      fixtureName = fixture
    }

    const templateContent = fs.readFileSync(path.join(XLSX_FIXTURES_PATH, `${fixtureName}.xlsx`))

    let request = {
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        helpers,
        xlsx: {
          templateAsset: {
            content: templateContent
          }
        }
      },
      data
    }

    if (prepare != null) {
      request = await prepare(request)
    }

    const result = await getReporter().render(request)

    fs.writeFileSync(OUTPUT_PATH, result.content)

    previewXlsx({ name: fixtureName, template: templateContent, output: result.content })

    const output = await parseXlsx(result.content, { files, sheets, parseOptions })

    if (template != null && template !== false) {
      output.template = await parseXlsx(templateContent, {
        files: template === true ? undefined : template.files,
        sheets,
        parseOptions
      })
    }

    return output
  }
}

async function parseXlsx (xlsxBuf, { files, sheets, parseOptions }) {
  const output = await parseSheetFromXlsxBuf(xlsxBuf, sheets, { cellFormula: true, ...parseOptions })
  // the paths can start with "/" (for example the paths from workbook.Directory), the files
  // inside the xlsx are stored without it so we normalize the input paths
  const targetFiles = (typeof files === 'function' ? files(output.workbook) : files)?.map((filePath) => (
    filePath.startsWith('/') ? filePath.slice(1) : filePath
  ))

  // the xlsx was already validated when parsing the sheet
  output.documents = targetFiles != null ? await getDocumentsFromXlsxBuf(xlsxBuf, targetFiles, { validate: false }) : []

  return output
}

// saves a copy of the template and the output xlsx of the render (in a folder in the temp dir), so they can be
// opened to check the result, only when the XLSX_PREVIEW env var is set:
// - XLSX_PREVIEW=1, it only saves the files (the path of the output is printed)
// - XLSX_PREVIEW=<path to a js file>, it saves the files and calls the hook exported by the file with
//   { templatePath, templateName, template, previewOutputPath, output }, the hook can open the files
//   (for example in Excel), the hook is a local script that is not part of the repo
function previewXlsx ({ name, template, output }) {
  const previewValue = process.env.XLSX_PREVIEW

  if (!previewValue) {
    return
  }

  const hookPath = previewValue === '1' || previewValue === 'true' ? null : path.resolve(previewValue)
  const previewDirPath = path.join(os.tmpdir(), 'jsreport-xlsx-preview')

  try {
    fs.mkdirSync(previewDirPath, { recursive: true })

    // the template is saved as a copy (with a different name) so changes done to it can not be saved
    // by mistake into the fixture, and so it does not conflict with the fixture if it is already open
    const templateName = `${path.basename(name)}-template.xlsx`
    const templatePath = path.join(previewDirPath, templateName)

    // the template is usually the same for the different renders of a case (for example in the tests
    // for true and false), it is written only when it changed, so a template that is already open is not
    // touched (some apps lock the files that are open)
    if (!fs.existsSync(templatePath) || !fs.readFileSync(templatePath).equals(template)) {
      fs.writeFileSync(templatePath, template)
    }

    // apps like Excel can not open two files with the same name, so each output gets a number that is
    // not used yet, this allows to open the output of the same fixture more than once
    const usedNumbers = fs.readdirSync(previewDirPath).map((fileName) => {
      const match = /^(\d+)-/.exec(fileName)
      return match != null ? parseInt(match[1], 10) : 0
    })

    const outputNumber = Math.max(0, ...usedNumbers) + 1
    const previewOutputPath = path.join(previewDirPath, `${outputNumber}-${path.basename(name)}-output.xlsx`)

    fs.writeFileSync(previewOutputPath, output)

    if (hookPath == null) {
      console.log(`xlsx preview saved: ${previewOutputPath}`)
      return
    }

    require(hookPath)({ templatePath, templateName, template, previewOutputPath, output })
  } catch (err) {
    console.warn(`Unable to preview xlsx: ${err.message}`)
  }
}

// validates all the xml files and sheets inside the xlsx
async function validateXlsxBuf (xlsxBuf) {
  const files = await decompress()(xlsxBuf)

  for (const file of files) {
    if (file.type !== 'file') {
      continue
    }

    if (!contentIsXML(file.data)) {
      continue
    }

    const fileContent = file.data.toString()

    validateXml(file.path, fileContent)

    if (isWorksheetFile(file.path)) {
      const sheetDoc = new DOMParser().parseFromString(fileContent)
      validateSheetRefs(file.path, sheetDoc)
      validateSheetMergeCells(file.path, sheetDoc)
    }

    if (file.path === 'xl/calcChain.xml') {
      validateCalcChain(file.path, new DOMParser().parseFromString(fileContent))
    }
  }

  return files
}

function validateXml (filePath, fileContent) {
  // strict parser will fail on invalid entities found in xml
  const parser = sax.parser(true)

  try {
    parser.write(fileContent).close()
  } catch (stringParsingError) {
    stringParsingError.message = `Error parsing xml file at ${filePath}: ${stringParsingError.message}`
    throw stringParsingError
  }
}

// validates that rows in sheetData are in ascending order, that cells inside a row
// are in ascending order and that the cells refs match the row they belong to
function validateSheetRefs (filePath, sheetDoc) {
  const sheetDataEl = sheetDoc.getElementsByTagName('sheetData')[0]

  if (sheetDataEl == null) {
    return
  }

  const fail = (msg) => { throw new Error(`Invalid sheet at ${filePath}: ${msg}`) }

  let prevRowNumber = 0

  const rowEls = Array.from(sheetDataEl.childNodes).filter((childEl) => childEl.nodeName === 'row')

  for (const rowEl of rowEls) {
    if (!rowEl.hasAttribute('r')) {
      fail('found a row with no ref')
    }

    const rowRef = rowEl.getAttribute('r')

    if (!/^[1-9]\d*$/.test(rowRef)) {
      fail(`row has invalid ref "${rowRef}"`)
    }

    const rowNumber = parseInt(rowRef, 10)

    if (rowNumber <= prevRowNumber) {
      fail(`row with ref "${rowNumber}" found after row with ref "${prevRowNumber}", rows should be in ascending order`)
    }

    let prevColumnNumber = 0
    let prevCellRef

    const cellEls = Array.from(rowEl.childNodes).filter((childEl) => childEl.nodeName === 'c')

    for (const cellEl of cellEls) {
      if (!cellEl.hasAttribute('r')) {
        fail(`found a cell with no ref in row "${rowNumber}"`)
      }

      const cellRef = cellEl.getAttribute('r')
      const match = /^([A-Z]+)([1-9]\d*)$/.exec(cellRef)

      if (match == null) {
        fail(`cell has invalid ref "${cellRef}" in row "${rowNumber}"`)
      }

      if (parseInt(match[2], 10) !== rowNumber) {
        fail(`cell with ref "${cellRef}" does not match the row "${rowNumber}" it belongs to`)
      }

      const columnNumber = parseCell(cellRef)[0] + 1

      if (columnNumber <= prevColumnNumber) {
        fail(`cell with ref "${cellRef}" found after cell with ref "${prevCellRef}" in row "${rowNumber}", cells should be in ascending order`)
      }

      prevColumnNumber = columnNumber
      prevCellRef = cellRef
    }

    prevRowNumber = rowNumber
  }
}

// validates that <mergeCells> has at least one <mergeCell>,
// otherwise it is considered a broken document
function validateSheetMergeCells (filePath, sheetDoc) {
  const mergeCellsEl = sheetDoc.getElementsByTagName('mergeCells')[0]

  if (mergeCellsEl == null) {
    return
  }

  const mergeCellEls = Array.from(mergeCellsEl.childNodes).filter((childEl) => childEl.nodeName === 'mergeCell')

  if (mergeCellEls.length === 0) {
    throw new Error(`Invalid sheet at ${filePath}: <mergeCells> should not be empty, it should be removed when there are no merged cells`)
  }

  if (mergeCellsEl.hasAttribute('count') && parseInt(mergeCellsEl.getAttribute('count'), 10) !== mergeCellEls.length) {
    throw new Error(`Invalid sheet at ${filePath}: <mergeCells> count "${mergeCellsEl.getAttribute('count')}" does not match the number of <mergeCell> (${mergeCellEls.length})`)
  }
}

function validateCalcChain (filePath, calcChainDoc) {
  const cellEls = Array.from(calcChainDoc.documentElement.childNodes).filter((childEl) => childEl.nodeName === 'c')

  if (cellEls.length === 0) {
    throw new Error(`Invalid calcChain at ${filePath}: <calcChain> should not be empty, it should be removed when there are no formulas`)
  }
}

module.exports.createAssertMode = createAssertMode
module.exports.createRender = createRender
module.exports.getDocumentsFromXlsxBuf = getDocumentsFromXlsxBuf
module.exports.parseSheetFromXlsxBuf = parseSheetFromXlsxBuf
module.exports.mergeCellExists = mergeCellExists
module.exports.calcChainCellExists = calcChainCellExists
