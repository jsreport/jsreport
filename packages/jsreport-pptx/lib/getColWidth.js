
const { getDimension, cmToEMU, pxToEMU } = require('./utils')

module.exports = function getColWidth (colWidthInput) {
  const targetWidth = getDimension(colWidthInput)

  if (targetWidth == null) {
    return
  }

  return targetWidth.unit === 'cm' ? cmToEMU(targetWidth.value) : pxToEMU(targetWidth.value)
}
