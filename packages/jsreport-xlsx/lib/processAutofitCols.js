const { DOMParser } = require('@xmldom/xmldom')
const { col2num } = require('xlsx-coordinates')
const { nodeListToArray } = require('./utils')

module.exports = function processAutofitCols (autofitInfo, xmlStr) {
  const autofitCols = autofitInfo.cols
  const doc = new DOMParser().parseFromString(xmlStr)
  const colsEl = doc.documentElement

  const existingBaseColEls = nodeListToArray(colsEl.getElementsByTagName('col'))

  for (const [colLetter, colInfo] of Object.entries(autofitCols)) {
    const colSizeInNumberCharactersMDW = (colInfo.size / 6.5) + 2 // 2 is for padding
    const colNumber = col2num(colLetter) + 1

    const existingColEl = existingBaseColEls.find((el) => (
      el.getAttribute('min') === colNumber.toString() &&
      el.getAttribute('max') === colNumber.toString()
    ))

    if (existingColEl != null) {
      existingColEl.setAttribute('width', colSizeInNumberCharactersMDW)
      existingColEl.setAttribute('customWidth', '1')
    } else {
      const newCol = doc.createElement('col')
      newCol.setAttribute('min', colNumber.toString())
      newCol.setAttribute('max', colNumber.toString())
      newCol.setAttribute('width', colSizeInNumberCharactersMDW)
      newCol.setAttribute('customWidth', '1')
      colsEl.appendChild(newCol)
    }
  }

  // return empty if there was no existing cols and also no new cols were generated
  if (existingBaseColEls.length === 0 && colsEl.childNodes.length === 0) {
    return ''
  }

  return colsEl.toString()
}
