const { DOMParser } = require('@xmldom/xmldom')
const { decode } = require('html-entities')
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
    columnNumber: col2num(letter) + 1,
    lockedRow,
    rowNumber: parseInt(lockedRow ? matches[5].slice(1) : matches[5], 10)
  }
}

function getNewCellLetter (cellLetter, increment) {
  if (typeof increment !== 'number' || isNaN(increment)) {
    throw new Error('Increment must be a number')
  }

  const colNumber = col2num(cellLetter) + increment

  if (colNumber < 0) {
    throw new Error('Column number can not be negative')
  }

  return num2col(colNumber)
}

function getPixelWidthOfValue (value, fontSize) {
  const fontSizeInPx = fontSize * (96 / 72)
  const size = pixelWidth(value, { font: 'Arial', size: fontSizeInPx })

  return parseFloat(size.toFixed(2))
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

function getNewFormula (originalFormula, parsedOriginCellRef, meta) {
  let newFormula
  const result = {}

  if (meta.type === 'normal') {
    result.lazyCellRefs = {}
  }

  if (meta.type !== 'normal' && meta.type !== 'lazy') {
    throw new Error('meta parameter must be either "normal" or "lazy"')
  }

  const {
    originCellIsFromLoop, rowPreviousLoopIncrement, rowCurrentLoopIncrement,
    columnPreviousLoopIncrement, columnCurrentLoopIncrement, trackedCells
  } = meta

  const { newValue } = evaluateCellRefsFromExpression(originalFormula, (cellRefInfo, cellRefPosition) => {
    const originMetadata = { workbookName: parsedOriginCellRef.workbookName, sheetName: parsedOriginCellRef.sheetName }
    const targetMetadata = { workbookName: cellRefInfo.parsed.workbookName, sheetName: cellRefInfo.parsed.sheetName }
    const lazyCellRefId = `${cellRefInfo.localRef}@${cellRefPosition}`

    if (meta.type === 'lazy') {
      const { lazyCellRefs } = meta
      const shouldEvaluate = lazyCellRefs[lazyCellRefId] != null

      // reuse already calculated cell refs
      if (!shouldEvaluate) {
        return generateNewCellRefFrom(cellRefInfo.parsed, {
          columnLetter: cellRefInfo.parsed.letter,
          rowNumber: cellRefInfo.parsed.rowNumber
        })
      }
    }

    let isLocalRef = true

    if (
      originMetadata.workbookName !== targetMetadata.workbookName ||
      originMetadata.sheetName !== targetMetadata.sheetName
    ) {
      isLocalRef = false
    }

    let cellRefIsFromLoop = false

    if (isLocalRef && trackedCells[cellRefInfo.localRef] != null) {
      cellRefIsFromLoop = trackedCells[cellRefInfo.localRef].currentLoopId != null
    }

    let includeLoopIncrement

    if (meta.type === 'normal') {
      const { includeLoopIncrementResolver } = meta
      includeLoopIncrement = includeLoopIncrementResolver(cellRefIsFromLoop, cellRefInfo)
    } else {
      const { lazyCellRefs } = meta
      const found = lazyCellRefs[lazyCellRefId]
      includeLoopIncrement = found != null ? found.includeLoopIncrement : false
    }

    let newRowNumber
    let newColumnLetter

    if (!isLocalRef) {
      // cell references to other sheets
      newColumnLetter = cellRefInfo.parsed.letter
      newRowNumber = cellRefInfo.parsed.rowNumber

      if (!cellRefInfo.parsed.lockedRow) {
        newRowNumber += rowCurrentLoopIncrement
      }

      if (!cellRefInfo.parsed.lockedColumn) {
        newColumnLetter = getNewCellLetter(cellRefInfo.parsed.letter, columnCurrentLoopIncrement)
      }
    } else if (
      meta.type === 'normal' &&
      (
        parsedOriginCellRef.rowNumber < cellRefInfo.parsed.rowNumber ||
        parsedOriginCellRef.columnNumber < cellRefInfo.parsed.columnNumber
      )
    ) {
      // if formula has a cell reference that is greater than origin then we
      // mark it as lazy
      result.lazyCellRefs[lazyCellRefId] = {
        cellRef: cellRefInfo.localRef,
        position: cellRefPosition,
        includeLoopIncrement
      }

      // let the cell as it is
      // (the final row number will be calculated later in other helper)
      newRowNumber = cellRefInfo.parsed.rowNumber
      newColumnLetter = cellRefInfo.parsed.letter
    } else {
      let columnIncrement
      let rowIncrement

      if (trackedCells[cellRefInfo.localRef] != null && trackedCells[cellRefInfo.localRef].count > 0) {
        const { currentCellRef, getCurrentLoopItem } = meta
        const tracked = trackedCells[cellRefInfo.localRef]

        const shouldUseFirstForRow = (
          cellRefInfo.parsed.lockedRow ||
          (!originCellIsFromLoop && cellRefIsFromLoop && cellRefInfo.type === 'rangeStart')
        )

        let parsedLastCellRef = shouldUseFirstForRow ? parseCellRef(tracked.first) : parseCellRef(tracked.last)
        rowIncrement = parsedLastCellRef.rowNumber - cellRefInfo.parsed.rowNumber

        let cellRefLoopItem

        if (cellRefIsFromLoop) {
          cellRefLoopItem = getCurrentLoopItem(tracked.currentLoopId)
        }

        if (!cellRefInfo.parsed.lockedColumn && originCellIsFromLoop && cellRefLoopItem?.type === 'vertical') {
          const parsedOriginCurrentCellRef = parseCellRef(currentCellRef)
          parsedLastCellRef = parseCellRef(cellRefLoopItem.trackedCells.get(cellRefInfo.localRef)?.get(parsedOriginCurrentCellRef.letter) ?? currentCellRef)
        } else {
          const shouldUseFirstForColumn = (
            cellRefInfo.parsed.lockedColumn ||
            (!originCellIsFromLoop && cellRefIsFromLoop && cellRefInfo.type === 'rangeStart')
          )

          parsedLastCellRef = shouldUseFirstForColumn ? parseCellRef(tracked.first) : parseCellRef(tracked.last)
        }

        columnIncrement = parsedLastCellRef.columnNumber - cellRefInfo.parsed.columnNumber
      } else {
        // cell reference points to cell which does not exists as content of the template
        rowIncrement = rowPreviousLoopIncrement

        if (includeLoopIncrement) {
          rowIncrement += rowCurrentLoopIncrement
        }

        columnIncrement = columnPreviousLoopIncrement

        if (includeLoopIncrement) {
          columnIncrement += columnCurrentLoopIncrement
        }
      }

      newColumnLetter = getNewCellLetter(cellRefInfo.parsed.letter, columnIncrement)
      newRowNumber = cellRefInfo.parsed.rowNumber + rowIncrement
    }

    const newCellRef = generateNewCellRefFrom(cellRefInfo.parsed, {
      columnLetter: newColumnLetter,
      rowNumber: newRowNumber
    })

    return newCellRef
  })

  const lazyCellRefsCount = result.lazyCellRefs != null ? Object.keys(result.lazyCellRefs).length : 0

  if (meta.type === 'normal' && lazyCellRefsCount > 0) {
    const { lazyFormulas, currentCellRef } = meta
    lazyFormulas.count = lazyFormulas.count || 0
    lazyFormulas.count += 1
    lazyFormulas.data = lazyFormulas.data || {}

    const lazyFormulaRefId = `$lazyFormulaRef${lazyFormulas.count}`

    lazyFormulas.data[lazyFormulaRefId] = {
      // the formulaCellRef here is just added for easy debugging
      formulaCellRef: currentCellRef,
      formula: newValue,
      // just placeholder for the key, this is going to be fill at runtime
      //  with the updated formula
      newFormula: null,
      parsedOriginCellRef,
      originCellIsFromLoop,
      rowPreviousLoopIncrement,
      rowCurrentLoopIncrement,
      columnPreviousLoopIncrement,
      columnCurrentLoopIncrement,
      cellRefs: result.lazyCellRefs
    }

    newFormula = lazyFormulaRefId
  } else {
    newFormula = newValue
  }

  result.formula = newFormula

  return result
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

const xmlEscapeMap = {
  '>': '&gt;',
  '<': '&lt;',
  "'": '&apos;',
  '"': '&quot;',
  '&': '&amp;'
}

// we dont'se the encode function of html-entities because want to have the chance to
// escape just some characters
function encodeXML (str, mode = 'all') {
  let pattern

  switch (mode) {
    case 'all':
      pattern = /([&"<>'])/g
      break
    case 'basic':
      pattern = /([&<>])/g
      break
    default:
      throw new Error('Invalid mode for encodeXML')
  }

  const output = str.replace(pattern, (_, item) => {
    return xmlEscapeMap[item]
  })

  return output
}

function decodeXML (str) {
  return decode(str, { level: 'xml' })
}

function getTextContent (xml) {
  const doc = new DOMParser().parseFromString(xml)
  return doc.documentElement.textContent || ''
}

module.exports.parseCellRef = parseCellRef
module.exports.getNewCellLetter = getNewCellLetter
module.exports.getPixelWidthOfValue = getPixelWidthOfValue
module.exports.getFontSizeFromStyle = getFontSizeFromStyle
module.exports.evaluateCellRefsFromExpression = evaluateCellRefsFromExpression
module.exports.getNewFormula = getNewFormula
module.exports.generateNewCellRefFrom = generateNewCellRefFrom
module.exports.encodeXML = encodeXML
module.exports.decodeXML = decodeXML
module.exports.getTextContent = getTextContent
