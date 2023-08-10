const { col2num } = require('xlsx-coordinates')

// allows to parse cell expressions like:
// - B6, $B6 (locked column), B$6 (locked row), $B$6 (locked column and row)
// - B6:B10 (ranges) and variants with locked columns and rows
// - SheetName!B6:B10, 'SheetName'!B6:B10 (sheet name reference) and variants with locked columns and rows
// - [WorkbookName.xlsx]SheetName!B6:B10, '[WorkbookName.xlsx]SheetName'!B6:B10 (workbook name reference) and variants with locked columns and rows
// - [WorkbookName.xlsx]SheetName!B6:[WorkbookName.xlsx]SheetName!B10, '[WorkbookName.xlsx]SheetName'!B6:'[WorkbookName.xlsx]SheetName'!B10 (workbook name reference) and variants with locked columns and rows
// result: <complete ref from left>:<complete ref from right>
const getRangeOrMultiCellRefExpressionRegexp = () => /((?:'?(?:\[(?:[A-Za-z0-9_. ]+\.xlsx)\])?(?:[A-Za-z0-9_. ]+)'?!)?(?:\$?[A-Z]+\$?\d+:))?((?:'?(?:\[(?:[A-Za-z0-9_. ]+\.xlsx)\])?(?:[A-Za-z0-9_. ]+)'?!)?(?:\$?[A-Z]+\$?\d+))/g

function parseCellRef (cellRef, startCellRef) {
  // parses single cell ref like:
  // B6, $B6 (locked column), B$6 (locked row), $B$6 (locked column and row)
  // SheetName!B6, 'SheetName'!B6 (sheet name reference) and variants with locked columns and rows
  // [WorkbookName.xlsx]SheetName!B6, '[WorkbookName.xlsx]SheetName'!B6 (workbook name reference) and variants with locked columns and rows
  const cellRefRegexp = /^(?:('?(?:\[([A-Za-z0-9_. ]+\.xlsx)\])?([A-Za-z0-9_. ]+)'?)!)?(\$?[A-Z]+)(\$?\d+)$/
  const matches = cellRef.match(cellRefRegexp)

  if (matches == null || matches[4] == null) {
    throw new Error(`"${cellRef}" is not a valid cell reference`)
  }

  const lockedColumn = matches[4].startsWith('$')
  const lockedRow = matches[5].startsWith('$')
  const letter = lockedColumn ? matches[4].slice(1) : matches[4]
  let ownWorkbookName
  let ownSheetName
  let ownSensitiveName = false
  let workbookName
  let sheetName
  let sensitiveName

  if (matches[3] != null) {
    ownWorkbookName = matches[2]
    ownSheetName = matches[3]
    ownSensitiveName = matches[1].startsWith('\'')
  }

  workbookName = ownWorkbookName
  sheetName = ownSheetName
  sensitiveName = ownSensitiveName

  if (matches[3] == null && startCellRef != null) {
    workbookName = startCellRef.workbookName
    sheetName = startCellRef.sheetName
    sensitiveName = startCellRef.sensitiveName
  }

  return {
    workbookName,
    sheetName,
    sensitiveName,
    ownMetadata: {
      workbookName: ownWorkbookName,
      sheetName: ownSheetName,
      sensitiveName: ownSensitiveName
    },
    letter,
    lockedColumn,
    columnNumber: col2num(letter) + 1,
    lockedRow,
    rowNumber: parseInt(lockedRow ? matches[5].slice(1) : matches[5], 10)
  }
}

function evaluateCellRefsFromExpression (valueExpr, replacer) {
  const cellRefs = []

  const newValueExpr = valueExpr.replace(getRangeOrMultiCellRefExpressionRegexp(), (...args) => {
    const [, _startingCellRef, endingCellRef] = args
    const isRange = _startingCellRef != null

    const cellsRefsToUpdate = []

    if (isRange) {
      const startingCellRef = _startingCellRef.slice(0, -1)
      const parsedStartingCellRef = parseCellRef(startingCellRef)
      const parsedEndingCellRef = parseCellRef(endingCellRef, parsedStartingCellRef)

      cellsRefsToUpdate.push({
        type: 'rangeStart',
        ref: startingCellRef,
        parsed: parsedStartingCellRef,
        parsedRangeStart: parsedStartingCellRef,
        parsedRangeEnd: parsedEndingCellRef
      })

      cellsRefsToUpdate.push({
        type: 'rangeEnd',
        ref: endingCellRef,
        parsed: parsedEndingCellRef,
        parsedRangeStart: parsedStartingCellRef,
        parsedRangeEnd: parsedEndingCellRef
      })
    } else {
      const parsedEndingCellRef = parseCellRef(endingCellRef)
      cellsRefsToUpdate.push({ type: 'standalone', ref: endingCellRef, parsed: parsedEndingCellRef })
    }

    const cellsRefsUpdated = []

    for (const cellRefToUpdate of cellsRefsToUpdate) {
      cellRefToUpdate.localRef = `${cellRefToUpdate.parsed.letter}${cellRefToUpdate.parsed.rowNumber}`
      const newCellRef = replacer != null ? replacer(cellRefToUpdate) : cellRefToUpdate.ref
      cellsRefsUpdated.push(newCellRef)
      cellRefs.push({ ...cellRefToUpdate, newRef: newCellRef })
    }

    return cellsRefsUpdated.join(':')
  })

  return {
    cellRefs,
    newValue: newValueExpr
  }
}

function generateNewCellRefFromRow (parsedCellRef, rowNumber, fullMetadata = false) {
  let prefix = ''

  const prefixData = fullMetadata
    ? {
        workbookName: parsedCellRef.workbookName,
        sheetName: parsedCellRef.sheetName,
        sensitiveName: parsedCellRef.sensitiveName
      }
    : parsedCellRef.ownMetadata

  if (prefixData.sheetName != null) {
    if (prefixData.workbookName != null) {
      prefix += `[${prefixData.workbookName}]`
    }

    prefix += prefixData.sheetName

    if (prefixData.sensitiveName) {
      prefix = `'${prefix}'`
    }

    prefix += '!'
  }

  return `${prefix}${parsedCellRef.lockedColumn ? '$' : ''}${parsedCellRef.letter}${parsedCellRef.lockedRow ? '$' : ''}${rowNumber}`
}

module.exports.parseCellRef = parseCellRef
module.exports.evaluateCellRefsFromExpression = evaluateCellRefsFromExpression
module.exports.generateNewCellRefFromRow = generateNewCellRefFromRow
