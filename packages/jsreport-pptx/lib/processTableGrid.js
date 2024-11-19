const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray } = require('./utils')

module.exports = function processTableGrid (xmlStr, colWidthsCustomized) {
  const doc = new DOMParser().parseFromString(`<pptxXml>${xmlStr}</pptxXml>`)
  const gridEl = doc.documentElement.firstChild

  // if needed, normalize col widths, this should be done typically only for tables
  // in vertical mode, or in dynamic rows/cell mode and when there was no col widths customization.
  // we calculate the col width based on the total columns in table, each col will get
  // the same width. we do this to improve the end result of table, so it fits better
  // in the slide
  if (
    gridEl.hasAttribute('needsColWidthNormalization') &&
    !colWidthsCustomized
  ) {
    const baseColsWidth = parseInt(gridEl.getAttribute('needsColWidthNormalization'), 10)

    gridEl.removeAttribute('needsColWidthNormalization')

    const gridColEls = nodeListToArray(gridEl.getElementsByTagName('a:gridCol'))
    // ensure we don't end with float number, the w property does not admit it
    const colWidth = Math.trunc(baseColsWidth / gridColEls.length)

    for (const gridColEl of gridColEls) {
      gridColEl.setAttribute('w', colWidth)
    }
  }

  return gridEl.toString()
}
