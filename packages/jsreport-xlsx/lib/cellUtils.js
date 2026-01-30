const { col2num, num2col } = require('xlsx-coordinates')
const pixelWidth = require('string-pixel-width')

const CELL_REG_REGEXP = /^(?:('?(?:\[([A-Za-z0-9_. ]+\.xlsx)\])?([A-Za-z0-9_. ]+)'?)!)?(\$?[A-Z]+)(\$?\d+)$/

// allows to parse cell expressions like:
// - B6, $B6 (locked column), B$6 (locked row), $B$6 (locked column and row)
// - B6:B10 (ranges) and variants with locked columns and rows
// - SheetName!B6:B10, 'SheetName'!B6:B10 (sheet name reference) and variants with locked columns and rows
// - [WorkbookName.xlsx]SheetName!B6:B10, '[WorkbookName.xlsx]SheetName'!B6:B10 (workbook name reference) and variants with locked columns and rows
// - [WorkbookName.xlsx]SheetName!B6:[WorkbookName.xlsx]SheetName!B10, '[WorkbookName.xlsx]SheetName'!B6:'[WorkbookName.xlsx]SheetName'!B10 (workbook name reference) and variants with locked columns and rows
// result: <complete ref from left>:<complete ref from right>
// it is returned from a fn because it needs to use the global flag on regexp,
// and we can not reuse the same regexp instance safely, it needs to be a new one for execution
const getRangeOrMultiCellRefExpressionRegexp = () => /((?:'?(?:\[(?:[A-Za-z0-9_. ]+\.xlsx)\])?(?:[A-Za-z0-9_. ]+)'?!)?(?:\$?[A-Z]+\$?\d+:))?((?:'?(?:\[(?:[A-Za-z0-9_. ]+\.xlsx)\])?(?:[A-Za-z0-9_. ]+)'?!)?(?:\$?[A-Z]+\$?\d+))/g

function parseCellRef (cellRef, parsedStartCellRef) {
  // parses single cell ref like:
  // B6, $B6 (locked column), B$6 (locked row), $B$6 (locked column and row)
  // SheetName!B6, 'SheetName'!B6 (sheet name reference) and variants with locked columns and rows
  // [WorkbookName.xlsx]SheetName!B6, '[WorkbookName.xlsx]SheetName'!B6 (workbook name reference) and variants with locked columns and rows
  const matches = cellRef.match(CELL_REG_REGEXP)

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

  if (matches[3] == null && parsedStartCellRef != null) {
    workbookName = parsedStartCellRef.workbookName
    sheetName = parsedStartCellRef.sheetName
    sensitiveName = parsedStartCellRef.sensitiveName
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
    // output columnNumber as 1 based
    columnNumber: col2num(letter) + 1,
    lockedRow,
    rowNumber: parseInt(lockedRow ? matches[5].slice(1) : matches[5], 10)
  }
}

function getColumnFor (columnNumberOrLetter, _increment) {
  const increment = _increment ?? 0

  if (typeof increment !== 'number' || isNaN(increment)) {
    throw new Error('Increment must be a number')
  }

  let newColumnNumber

  if (typeof columnNumberOrLetter === 'number') {
    newColumnNumber = columnNumberOrLetter + increment
  } else {
    // we expect columnNumber to be 1 based
    newColumnNumber = (col2num(columnNumberOrLetter) + 1) + increment
  }

  if (newColumnNumber < 0) {
    throw new Error('Column number can not be negative')
  }

  const newColumnLetter = num2col(newColumnNumber - 1)

  return [newColumnLetter, newColumnNumber]
}

function generateNewCellRefFrom (parsedCellRef, { columnLetter, rowNumber }, fullMetadata = false) {
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

  const letter = columnLetter != null ? columnLetter : parsedCellRef.letter
  const number = rowNumber != null ? rowNumber : parsedCellRef.rowNumber

  return `${prefix}${parsedCellRef.lockedColumn ? '$' : ''}${letter}${parsedCellRef.lockedRow ? '$' : ''}${number}`
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

    for (let cellRefPosition = 0; cellRefPosition < cellsRefsToUpdate.length; cellRefPosition++) {
      const cellRefToUpdate = cellsRefsToUpdate[cellRefPosition]
      cellRefToUpdate.localRef = `${cellRefToUpdate.parsed.letter}${cellRefToUpdate.parsed.rowNumber}`
      const newCellRef = replacer != null ? replacer(cellRefToUpdate, cellRefPosition) : cellRefToUpdate.ref
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

function getFontSizeFromStyle (_styleId, styleInfo, cache) {
  let styleId

  if (_styleId != null && _styleId !== '') {
    styleId = parseInt(_styleId, 10)
  } else {
    styleId = 0
  }

  const cacheKey = styleId.toString()

  if (cache != null && cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const { cellXfsEls, cellStyleXfsEls, fontEls } = styleInfo

  const selectedXfEl = cellXfsEls[styleId]

  let fontId = selectedXfEl.getAttribute('fontId')
  const applyFont = selectedXfEl.getAttribute('applyFont')
  const xfId = selectedXfEl.getAttribute('xfId')

  if (
    applyFont == null ||
    applyFont === '' ||
    applyFont === '0'
  ) {
    const selectedStyleXfEl = cellStyleXfsEls[xfId]
    const nestedFontId = selectedStyleXfEl.getAttribute('fontId')
    const nestedApplyFont = selectedStyleXfEl.getAttribute('applyFont')

    if (
      nestedApplyFont == null ||
      nestedApplyFont === '' ||
      nestedApplyFont === '1'
    ) {
      fontId = nestedFontId
    }
  }

  const fontEl = fontEls[fontId]
  const sizeEl = fontEl.getElementsByTagName('sz')[0]

  // size stored in xlsx is in pt
  const fontSize = parseFloat(sizeEl.getAttribute('val'))

  if (cache != null) {
    cache.set(cacheKey, fontSize)
  }

  return fontSize
}

function getPixelWidthOfValue (value, fontSize) {
  const fontSizeInPx = fontSize * (96 / 72)
  const size = pixelWidth(value, { font: 'Arial', size: fontSizeInPx })

  return parseFloat(size.toFixed(2))
}

module.exports.parseCellRef = parseCellRef
module.exports.getColumnFor = getColumnFor
module.exports.generateNewCellRefFrom = generateNewCellRefFrom
module.exports.evaluateCellRefsFromExpression = evaluateCellRefsFromExpression
module.exports.getFontSizeFromStyle = getFontSizeFromStyle
module.exports.getPixelWidthOfValue = getPixelWidthOfValue
