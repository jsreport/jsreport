const { getFontSizeFromStyle, getPixelWidthOfValue } = require('../../cellUtils')

module.exports.createAutoFit = createAutoFit

// keeps the max width (in pixels) of the content of the columns with autofit enabled, it receives
// the column letters with autofit configured and the style info (to get the font size of the cells)
function createAutoFit ({ enabledFor, styleInfo }) {
  const cols = new Map()
  const fontSizeCache = new Map()
  let allEnabled = false

  const isEnabledFor = (columnLetter) => allEnabled || enabledFor.includes(columnLetter)

  const includeWidth = (columnLetter, width) => {
    const currentWidth = cols.get(columnLetter)

    if (currentWidth == null || width > currentWidth) {
      cols.set(columnLetter, width)
    }
  }

  return {
    // keeps the width of the rendered value if the column has autofit enabled
    // and it is the max of the column
    includeValue (columnLetter, value, styleId) {
      if (!isEnabledFor(columnLetter)) {
        return
      }

      const fontSize = getFontSizeFromStyle(styleId, styleInfo, fontSizeCache)

      includeWidth(columnLetter, getPixelWidthOfValue(value, fontSize))
    },
    includeWidth (columnLetter, width) {
      if (!isEnabledFor(columnLetter)) {
        return
      }

      includeWidth(columnLetter, width)
    },
    // applies the options of the xlsxColAutofit call, when "all" is set all the columns have autofit
    // enabled, otherwise the widths of the columns without autofit enabled are discarded
    configure ({ all }) {
      if (enabledFor.length > 0 && all === true) {
        allEnabled = true
      }

      if (allEnabled) {
        return
      }

      for (const columnLetter of [...cols.keys()]) {
        if (!enabledFor.includes(columnLetter)) {
          cols.delete(columnLetter)
        }
      }
    },
    // the max width by column letter
    getWidths () {
      return [...cols.entries()]
    }
  }
}
