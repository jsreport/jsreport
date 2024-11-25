const { getDimension, cmToEMU, pxToEMU, emuToTOAP } = require('./utils')

module.exports = function getColWidth (colWidthInput) {
  const targetWidth = getDimension(colWidthInput)

  if (targetWidth == null) {
    return
  }

  const valueInEMU = targetWidth.unit === 'cm' ? cmToEMU(targetWidth.value) : pxToEMU(targetWidth.value)

  return emuToTOAP(valueInEMU)
}
