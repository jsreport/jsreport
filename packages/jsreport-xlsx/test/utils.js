const { DOMParser } = require('@xmldom/xmldom')
const sax = require('sax')
const { parseCell } = require('xlsx-coordinates')
const { decompress } = require('@jsreport/office')
const xlsx = require('xlsx')
const { contentIsXML, isWorksheetFile } = require('../lib/utils')

module.exports.getDocumentsFromXlsxBuf = async function getDocumentsFromXlsxBuf (xlsxBuf, documentPaths, options = {}) {
  const files = await validateXlsxBuf(xlsxBuf)
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

module.exports.parseSheetFromXlsxBuf = async function parseSheetFromXlsxBuf (xlsxBuf, _sheetNameOrIdx, parseOpts) {
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

module.exports.mergeCellExists = function mergeCellExists (sheet, cellRange) {
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
      validateSheetRefs(file.path, new DOMParser().parseFromString(fileContent))
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
