const color = require('tinycolor2')
const { parse: parseCssTransform } = require('transform-parser')

const numFmtMap = Object.create(null)

Object.entries({
  0: 'general',
  1: '0',
  2: '0.00',
  3: '#,##0',
  4: '#,##0.00',
  9: '0%',
  10: '0.00%',
  11: '0.00e+00',
  12: '# ?/?',
  13: '# ??/??',
  14: 'mm-dd-yy',
  15: 'd-mmm-yy',
  16: 'd-mmm',
  17: 'mmm-yy',
  18: 'h:mm am/pm',
  19: 'h:mm:ss am/pm',
  20: 'h:mm',
  21: 'h:mm:ss',
  22: 'm/d/yy h:mm',
  37: '#,##0 ;(#,##0)',
  38: '#,##0 ;[red](#,##0)',
  39: '#,##0.00;(#,##0.00)',
  40: '#,##0.00;[red](#,##0.00)',
  41: '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)',
  42: '_("$"* #,##0_);_("$* (#,##0);_("$"* "-"_);_(@_)',
  43: '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)',
  44: '_("$"* #,##0.00_);_("$"* (#,##0.00);_("$"* "-"??_);_(@_)',
  45: 'mm:ss',
  46: '[h]:mm:ss',
  47: 'mmss.0',
  48: '##0.0e+0',
  49: '@'
}).forEach(([key, value]) => {
  numFmtMap[key] = value
})

function parsePx (value) {
  if (!value) {
    return 0
  }

  if (typeof value === 'number') {
    return value
  }

  const px = value.match(/([.\d]+)px/i)

  if (px && px.length === 2) {
    return parseFloat(px[1], 10)
  }

  return 0
}

function parseTransform (value) {
  if (!value) {
    return null
  }

  const result = parseCssTransform(value)

  if (!result) {
    return null
  }

  return result
}

function sizeToPx (value) {
  if (!value) {
    return 0
  }

  if (typeof value === 'number') {
    return value
  }

  const pt = value.match(/([.\d]+)pt/i)

  if (pt && pt.length === 2) {
    return parseFloat(pt[1], 10) * 96 / 72
  }

  const em = value.match(/([.\d]+)em/i)

  if (em && em.length === 2) {
    return parseFloat(em[1], 10) * 16
  }

  const px = value.match(/([.\d]+)px/i)

  if (px && px.length === 2) {
    return parseFloat(px[1], 10)
  }

  const pe = value.match(/([.\d]+)%/i)

  if (pe && pe.length === 2) {
    return (parseFloat(pe[1], 10) / 100) * 16
  }

  return 0
}

function sizePxToPt (value) {
  const numPx = sizeToPx(value)

  if (numPx > 0) {
    return numPx * 72 / 96
  }

  return 12
}

function isColorDefined (c) {
  const total = c.length
  let result = false

  for (let i = 0; i < total; i++) {
    result = c[i] !== '0'

    if (result) {
      break
    }
  }

  return result
}

function colorToArgb (c) {
  const input = Array.isArray(c)
    ? { r: c[0], g: c[1], b: c[2], a: c[3] }
    : c

  const rgba = color(input).toHex8()
  return rgba.substr(6) + rgba.substr(0, 6)
}

function getBorder (cellInfo, type) {
  let color = cellInfo.border[`${type}Color`]
  let style = cellInfo.border[`${type}Style`]
  let width = cellInfo.border[`${type}Width`]

  if (!color) {
    return null
  }

  width = sizeToPx(width)

  if (width <= 0) {
    return null
  }

  color = colorToArgb(color)

  if (style === 'none' || style === 'hidden') {
    return { style: null, color }
  }

  if (style === 'dashed' || style === 'dotted' || style === 'double') {
    return { style, color }
  }

  style = 'thin'

  if (width >= 3 && width < 5) {
    style = 'medium'
  }

  if (width >= 5) {
    style = 'thick'
  }

  return { style, color }
}

// this function is used debug the shape of pendingCellStyles,
// which is something we use when debugging why some complex layout with colspan/rowspan
// doesn't work as expected
function getPendingStylesAsCells (pendingCellStylesByRow) {
  const output = []
  let prevRIdx

  for (const rIdx of [...pendingCellStylesByRow.keys()].sort((a, b) => a - b)) {
    const cellMap = pendingCellStylesByRow.get(rIdx)
    const cellsOutput = []

    if (prevRIdx && rIdx - 1 !== prevRIdx) {
      for (let index = prevRIdx + 1; index < rIdx; index++) {
        output.push('-------------(placeholder row)-------------')
      }
    }

    let prevCIdx

    for (const cIdx of [...cellMap.keys()].sort((a, b) => a - b)) {
      const cellInfo = cellMap.get(cIdx)

      if (prevCIdx && cIdx - 1 !== prevCIdx) {
        for (let index = prevCIdx + 1; index < cIdx; index++) {
          cellsOutput.push(`${'-'.repeat(rIdx.toString().length)}-${'-'.repeat(index.toString().length)}`)
        }
      }

      if (cellInfo.styles == null) {
        throw new Error(`Pending Cell style not found for cell ${rIdx}-${cIdx}`)
      }

      cellsOutput.push(`${rIdx}-${cIdx}`)
      prevCIdx = cIdx
    }

    output.push(cellsOutput.join('  '))
    prevRIdx = rIdx
  }

  return output.join('\n')
}

module.exports.sizePxToPt = sizePxToPt
module.exports.parsePx = parsePx
module.exports.parseTransform = parseTransform
module.exports.isColorDefined = isColorDefined
module.exports.numFmtMap = numFmtMap
module.exports.colorToArgb = colorToArgb
module.exports.getBorder = getBorder
module.exports.getPendingStylesAsCells = getPendingStylesAsCells
