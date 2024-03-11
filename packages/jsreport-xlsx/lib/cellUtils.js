const { col2num } = require('xlsx-coordinates')

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

function getNewFormula (helperType, originalFormula, parsedOriginCellRef, meta) {
  let newFormula
  const result = {}

  if (meta.type === 'normal') {
    result.lazyCellRefs = {}
  }

  if (meta.type !== 'normal' && meta.type !== 'lazy') {
    throw new Error('meta parameter must be either "normal" or "lazy"')
  }

  const { originCellIsFromLoop, previousLoopIncrement, currentLoopIncrement, trackedCells } = meta

  const { newValue } = evaluateCellRefsFromExpression(originalFormula, (cellRefInfo, cellRefPosition) => {
    const originMetadata = { workbookName: parsedOriginCellRef.workbookName, sheetName: parsedOriginCellRef.sheetName }
    const targetMetadata = { workbookName: cellRefInfo.parsed.workbookName, sheetName: cellRefInfo.parsed.sheetName }
    const lazyCellRefId = `${cellRefInfo.localRef}@${cellRefPosition}`

    if (meta.type === 'lazy') {
      const { lazyCellRefs } = meta
      const shouldEvaluate = lazyCellRefs[lazyCellRefId] != null

      // reuse already calculated cell refs
      if (!shouldEvaluate) {
        return generateNewCellRefFromRow(cellRefInfo.parsed, cellRefInfo.parsed.rowNumber)
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
      cellRefIsFromLoop = trackedCells[cellRefInfo.localRef].inLoop
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

    if (!isLocalRef) {
      // cell references to other sheets
      newRowNumber = cellRefInfo.parsed.rowNumber

      if (!cellRefInfo.parsed.lockedRow) {
        newRowNumber += currentLoopIncrement
      }

      // else if (parsedNewOriginCellRef.rowNumber === parsedOriginCellRef.rowNumber) {
      //   // if cells were not changed then we don't need to do anything and let
      //   // the normal cell reference of the formula as it is
      //   newRowNumber = cellRefInfo.parsed.rowNumber
      // }
    } else if (meta.type === 'normal' && parsedOriginCellRef.rowNumber < cellRefInfo.parsed.rowNumber) {
      // if formula has a cell reference that is greater than origin then we
      // mark it as lazy
      result.lazyCellRefs[lazyCellRefId] = {
        cellRef: cellRefInfo.localRef,
        position: cellRefPosition,
        includeLoopIncrement
      }

      // left the cell as it is
      // (the final row number will be calculated later in other helper)
      newRowNumber = cellRefInfo.parsed.rowNumber
    } else {
      let increment

      if (trackedCells[cellRefInfo.localRef] != null && trackedCells[cellRefInfo.localRef].count > 0) {
        const tracked = trackedCells[cellRefInfo.localRef]

        const shouldUseFirst = (
          cellRefInfo.parsed.lockedRow ||
          (!originCellIsFromLoop && cellRefIsFromLoop && cellRefInfo.type === 'rangeStart')
        )

        const parsedLastCellRef = shouldUseFirst ? parseCellRef(tracked.first) : parseCellRef(tracked.last)
        increment = parsedLastCellRef.rowNumber - cellRefInfo.parsed.rowNumber
      } else {
        // cell reference points to cell which does not exists as content of the template
        increment = previousLoopIncrement

        if (includeLoopIncrement) {
          increment += currentLoopIncrement
        }
      }

      newRowNumber = cellRefInfo.parsed.rowNumber + increment
    }

    const newCellRef = generateNewCellRefFromRow(cellRefInfo.parsed, newRowNumber)

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
      parsedOriginCellRef,
      originCellIsFromLoop,
      previousLoopIncrement,
      currentLoopIncrement,
      cellRefs: result.lazyCellRefs
    }

    newFormula = lazyFormulaRefId
  } else {
    newFormula = newValue
  }

  result.formula = newFormula

  return result
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
module.exports.getNewFormula = getNewFormula
module.exports.generateNewCellRefFromRow = generateNewCellRefFromRow
