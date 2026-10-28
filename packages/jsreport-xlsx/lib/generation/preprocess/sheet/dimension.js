const { parseCellRef } = require('../../../cellUtils')

module.exports.prepareDimension = prepareDimension

// reads the initial dimension (the range of the cells with content) of the sheet, the runtime calculates
// the new one from it. at the end it replaces the ref of <dimension> with the variable of the new dimension
function prepareDimension (sheet) {
  const dimensionEl = sheet.doc.getElementsByTagName('dimension')[0]
  let parsedDimension

  // parse the initial dimension ref if exists
  if (dimensionEl?.hasAttribute('ref') && dimensionEl.getAttribute('ref') !== '') {
    const dimensionRef = dimensionEl.getAttribute('ref')
    const refsParts = dimensionRef.split(':')

    parsedDimension = { start: null, end: null }

    if (refsParts.length === 1) {
      const parsedPart = parseCellRef(refsParts[0])

      parsedDimension.start = {
        rowNumber: parsedPart.rowNumber,
        columnNumber: parsedPart.columnNumber
      }

      parsedDimension.end = {
        rowNumber: parsedPart.rowNumber,
        columnNumber: parsedPart.columnNumber
      }
    } else {
      const parsedPart = parseCellRef(refsParts[0])
      const parsedPart2 = parseCellRef(refsParts[1])

      parsedDimension.start = {
        rowNumber: parsedPart.rowNumber,
        columnNumber: parsedPart.columnNumber
      }

      parsedDimension.end = {
        rowNumber: parsedPart2.rowNumber,
        columnNumber: parsedPart2.columnNumber
      }
    }
  }

  return {
    // the initial dimension ({ start, end } with row and column numbers), undefined when the sheet does not have it
    getInitial () {
      return parsedDimension
    },
    // replaces the ref of <dimension> with the variable of the new dimension
    finish () {
      if (dimensionEl) {
        dimensionEl.setAttribute('ref', '{{@newDimensionRef}}')
      }
    }
  }
}
