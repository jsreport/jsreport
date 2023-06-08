const { col2num } = require('xlsx-coordinates')

const getRangeOrMultiCellRefRegexp = () => /(\$?[A-Z]+\$?\d+:)?(\$?[A-Z]+\$?\d+)/g

function parseCellRef (cellRef) {
  const cellRefRegexp = /^(\$?[A-Z]+)(\$?\d+)$/
  const matches = cellRef.match(cellRefRegexp)

  if (matches == null || matches[1] == null) {
    throw new Error(`"${cellRef}" is not a valid cell reference`)
  }

  const lockedColumn = matches[1].startsWith('$')
  const lockedRow = matches[2].startsWith('$')
  const letter = lockedColumn ? matches[1].slice(1) : matches[1]

  return {
    letter,
    lockedColumn,
    columnNumber: col2num(letter) + 1,
    lockedRow,
    rowNumber: parseInt(lockedRow ? matches[2].slice(1) : matches[2], 10)
  }
}

function evaluateCellRefsFromExpression (valueExpr, replacer) {
  const cellRefs = []

  const newValueExpr = valueExpr.replace(getRangeOrMultiCellRefRegexp(), (...args) => {
    const [, _startingCellRef, endingCellRef] = args
    const isRange = _startingCellRef != null

    const cellsRefsToUpdate = []

    if (isRange) {
      const startingCellRef = _startingCellRef.slice(0, -1)
      const parsedStartingCellRef = parseCellRef(startingCellRef)
      const parsedEndingCellRef = parseCellRef(endingCellRef)

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

function generateNewCellRefFromRow (parsedCellRef, rowNumber) {
  return `${parsedCellRef.lockedColumn ? '$' : ''}${parsedCellRef.letter}${parsedCellRef.lockedRow ? '$' : ''}${rowNumber}`
}

module.exports.parseCellRef = parseCellRef
module.exports.evaluateCellRefsFromExpression = evaluateCellRefsFromExpression
module.exports.generateNewCellRefFromRow = generateNewCellRefFromRow
