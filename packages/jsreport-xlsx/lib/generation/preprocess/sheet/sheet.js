const path = require('path')
const { createContentCollectionManager } = require('@jsreport/office')
const generateDataTemplate = require('./generateDataTemplate')
const { prepareCalcChain } = require('./calcChain')
const { prepareRelationships } = require('./relationships')
const { prepareMergeCells } = require('./mergeCells')
const { prepareDimension } = require('./dimension')
const { prepareTables } = require('./tables')
const { prepareAutoFit } = require('./autoFit')
const { addMissingCellDefinitions } = require('./missingCells')
const { prepareSheetData } = require('./sheetData')
const { addFormulaRefScopes } = require('./formulas')
const { buildDataRanges } = require('./dataRanges')
const { createLastRef } = require('../../runtime/lastRef')
const { createDimension } = require('../../runtime/dimension')
const { createFormulasRuntime } = require('../../runtime/formulas')
const { createLogicBlocks } = require('../../runtime/logicBlocks')
const { createAutoFit } = require('../../runtime/autoFit')
const { createTables } = require('../../runtime/tables')

const {
  getLoops, assertNoOpenLogicBlocks, assertSiblingLoopsInRows, assertConditionsWithLoopsInRows,
  assertConditionsWithMergedCells
} = require('./logicBlocks')

const {
  nodeListToArray, isWorksheetFile, isWorksheetRelsFile,
  getStyleFile
} = require('../../../utils')

module.exports = ({ files, sharedData, addEndCallback }) => {
  const workbookDoc = files.find((file) => file.path === 'xl/workbook.xml')?.doc
  const workbookRelsDoc = files.find((file) => file.path === 'xl/_rels/workbook.xml.rels')?.doc
  const sharedStringsDoc = files.find((f) => f.path === 'xl/sharedStrings.xml')?.doc
  const styleInfo = getStyleInfo(getStyleFile(files)?.doc)

  const workbookCalcPrEl = workbookDoc.getElementsByTagName('calcPr')[0]

  let workbookSheetsEls = []
  let workbookRelsEls = []
  let sharedStringsEls = []

  if (workbookDoc) {
    workbookSheetsEls = nodeListToArray(workbookDoc.getElementsByTagName('sheet'))
  }

  if (workbookRelsDoc != null) {
    workbookRelsEls = nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship'))
  }

  if (sharedStringsDoc != null) {
    sharedStringsEls = nodeListToArray(sharedStringsDoc.getElementsByTagName('si'))
  }

  const calcChain = prepareCalcChain(files, sharedData, workbookRelsEls)

  for (const f of files.filter((f) => isWorksheetFile(f.path))) {
    const sheetContentManagers = createContentCollectionManager()
    const sheetFilepath = f.path
    const sheetFilename = path.posix.basename(sheetFilepath)
    const sheetDoc = f.doc

    const sheetInfo = getSheetInfo(sheetFilepath, workbookSheetsEls, workbookRelsEls)

    if (sheetInfo == null) {
      throw new Error(`Could not find sheet info for sheet at ${sheetFilepath}`)
    }

    const sheetRelsFile = files.find((file) => isWorksheetRelsFile(sheetFilename, file.path))

    // the information of the sheet that the features of the sheet need
    const sheet = {
      path: sheetFilepath,
      doc: sheetDoc,
      info: sheetInfo,
      relsFile: sheetRelsFile,
      contentManagers: sheetContentManagers
    }

    const relationships = prepareRelationships(sheet, sharedData)

    const autoFit = prepareAutoFit(sheet, files)

    const mergeCells = prepareMergeCells(sheet)

    const dimension = prepareDimension(sheet)

    const tables = prepareTables(sheet, files)

    const sheetDataEl = sheetDoc.getElementsByTagName('sheetData')[0]

    if (sheetDataEl == null) {
      throw new Error(`Could not find sheet data for sheet at ${sheetFilepath}`)
    }

    // for the cases where there are merge cells which its range points to cells that do not
    // have a definition in the template, or formulas that reference cells that do not have a definition
    // in the template, we create those cells for the refs update logic to work properly.
    // the cells (and rows) created only for formulas are virtual, they run the logic of the helpers
    // but they do not produce output
    const virtualDefinitions = addMissingCellDefinitions(sheetDoc, sheetDataEl, mergeCells.getRefs())

    const sheetData = prepareSheetData(sheet, sheetDataEl, {
      styleInfo,
      sharedStringsEls,
      mergeCells,
      virtualDefinitions,
      calcChain,
      tables,
      autoFit
    })

    const { parsedSheet, dynamicParts, formulas } = sheetData

    // stores information about the range of elements that are either static or
    // are dynamic (contain handlebars tags or need some evaluation at runtime)
    const dataRanges = buildDataRanges(parsedSheet.rows)

    // the plan to update the formulas (it needs the end of the loops, which are known at this point)
    addFormulaRefScopes(formulas, getLoops(dynamicParts))

    assertNoOpenLogicBlocks(dynamicParts, sheet.path)

    assertSiblingLoopsInRows(dynamicParts, sheet.path)
    assertConditionsWithLoopsInRows(parsedSheet, dynamicParts, sheet.path)

    assertConditionsWithMergedCells(parsedSheet, dynamicParts, mergeCells.getRefs(), sheet.path)

    const dataTemplate = generateDataTemplate(
      dataRanges,
      dynamicParts,
      parsedSheet,
      autoFit.getConfigured()
    )

    sharedData.fileDataMap.set(sheet.path, {
      sheet: {
        id: sheetInfo.id,
        name: sheetInfo.name
      },
      relsPath: sheetRelsFile?.path,
      contentManagers: sheetContentManagers,
      dataVariables: {},
      dataRanges,
      formulas,
      dataTemplate,
      runtime: {
        // the range of the rendered cells, the new dimension of the sheet
        dimension: createDimension(dimension.getInitial()),
        // it will store the last row/column processed in the template and the
        // row/column generated for it, new refs of rows and cells are calculated from it
        lastRef: createLastRef(),
        autoFit: createAutoFit({ enabledFor: autoFit.getEnabledColumns(), styleInfo }),
        // the tree of the evaluated logic block items (loops, conditions)
        logicBlocks: createLogicBlocks(),
        formulas: createFormulasRuntime(formulas),
        tables: createTables(tables.getParts())
      }
    })

    addEndCallback(() => {
      // set that this workbook should perform a full
      // recalculation when the workbook is opened
      if (workbookCalcPrEl) {
        workbookCalcPrEl.setAttribute('fullCalcOnLoad', '1')
      }

      dimension.finish()
      mergeCells.finish()
      calcChain.finish()
      relationships.finish()

      tables.finish()
      autoFit.finish()

      sheetData.finish()
    })
  }
}

function getSheetInfo (_sheetPath, workbookSheetsEls, workbookRelsEls) {
  const sheetPath = _sheetPath.startsWith('xl/') ? _sheetPath.replace(/^xl\//, '') : _sheetPath

  const sheetRefEl = workbookRelsEls.find((el) => (
    el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet' &&
    el.getAttribute('Target') === sheetPath
  ))

  if (sheetRefEl == null) {
    return
  }

  const sheetEl = workbookSheetsEls.find((el) => el.getAttribute('r:id') === sheetRefEl.getAttribute('Id'))

  if (sheetEl == null) {
    return
  }

  return {
    id: sheetEl.getAttribute('sheetId'),
    name: sheetEl.getAttribute('name'),
    path: _sheetPath,
    rId: sheetRefEl.getAttribute('Id')
  }
}

function getStyleInfo (styleDoc) {
  if (styleDoc == null) {
    return
  }

  const cellXfsEls = nodeListToArray(styleDoc.getElementsByTagName('cellXfs')[0]?.getElementsByTagName('xf'))
  const cellStyleXfsEls = nodeListToArray(styleDoc.getElementsByTagName('cellStyleXfs')[0]?.getElementsByTagName('xf'))
  const fontEls = nodeListToArray(styleDoc.getElementsByTagName('fonts')[0]?.getElementsByTagName('font'))

  return {
    doc: styleDoc,
    cellXfsEls,
    cellStyleXfsEls,
    fontEls
  }
}
