const { col2num } = require('xlsx-coordinates')

module.exports = function parseCellRef (cellRef) {
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
