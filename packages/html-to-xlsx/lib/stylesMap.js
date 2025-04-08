const utils = require('./utils')

module.exports = {
  numFmt: (cellInfo) => {
    if (cellInfo.formatStr != null) {
      return cellInfo.formatStr
    } else if (cellInfo.formatEnum != null && utils.numFmtMap[cellInfo.formatEnum] != null) {
      return utils.numFmtMap[cellInfo.formatEnum]
    }
  },
  alignment: (cellInfo) => {
    const hMap = {
      left: 'left',
      right: 'right',
      center: 'center',
      justify: 'justify'
    }

    const vMap = {
      top: 'top',
      bottom: 'bottom',
      middle: 'middle'
    }

    // we don't add horizontal-tb to valid values because we only care in recognizing
    // values for vertical text
    const validWritingModes = ['vertical-lr', 'vertical-rl', 'sideways-lr', 'sideways-rl']
    // we don't add use-glyph-orientation to valid values because it does not affect any
    // impact for our use case
    const validTextOrientations = ['mixed', 'upright', 'sideways', 'sideways-right']

    const rotationMap = new Map([
      ['sideways-lr-upright', 90],
      ['sideways-rl-upright', -90],
      ['vertical-lr-upright', 'vertical'],
      ['vertical-rl-upright', 'vertical'],
      ['sideways-lr-mixed', 90],
      ['sideways-rl-mixed', -90],
      ['vertical-lr-mixed', -90],
      ['vertical-rl-mixed', -90],
      ['sideways-lr-sideways', 90],
      ['sideways-rl-sideways', -90],
      ['vertical-lr-sideways', -90],
      ['vertical-rl-sideways', -90],
      ['sideways-lr-sideways-right', 90],
      ['sideways-rl-sideways-right', -90],
      ['vertical-lr-sideways-right', -90],
      ['vertical-rl-sideways-right', -90]
    ])

    const props = []

    if (cellInfo.horizontalAlign && hMap[cellInfo.horizontalAlign]) {
      props.push({
        key: 'horizontal',
        value: hMap[cellInfo.horizontalAlign]
      })
    }

    if (cellInfo.verticalAlign && vMap[cellInfo.verticalAlign]) {
      props.push({
        key: 'vertical',
        value: vMap[cellInfo.verticalAlign]
      })
    }

    if (cellInfo.transform != null || cellInfo.writingMode != null || cellInfo.textOrientation != null) {
      const parsedTransform = cellInfo.transform !== 'none' ? utils.parseTransform(cellInfo.transform) : null
      let rotationValue

      if (parsedTransform != null && parsedTransform.rotate != null && typeof parsedTransform.rotate === 'string') {
        const angleRegExp = /^(-?\d*\.?\d+)(deg|grad|turn|rad)$/
        const match = parsedTransform.rotate.match(angleRegExp) ?? []
        const value = match[1] != null ? parseFloat(match[1]) : null
        const unit = match[2]
        let parsedValue
        let normalizedValue

        // normalize the unit to degrees
        if (unit === 'deg') {
          parsedValue = value
        } else if (unit === 'grad') {
          parsedValue = value * 0.9
        } else if (unit === 'turn') {
          parsedValue = value * 360
        } else if (unit === 'rad') {
          parsedValue = value * (180 / Math.PI)
        }

        const intPart = Math.trunc(parsedValue)
        const decimalDiff = parsedValue - intPart

        // normalize the decimals (if any) to just 2 if the multiple of the decimals are
        // the same, this allows us to better reflect some radiants values
        if (decimalDiff !== 0) {
          const asString = parsedValue.toString()
          const decimals = asString.slice(asString.indexOf('.') + 1)

          if (decimals.length > 4) {
            const parts = decimals.split('')
            let equalDecimals = true
            const baseDecimal = parts[0]

            // only check 4 decimals
            for (let i = 0; i < 4; i++) {
              if (baseDecimal !== parts[i]) {
                equalDecimals = false
                break
              }
            }

            if (equalDecimals) {
              parsedValue = baseDecimal === '0' ? Math.trunc(parsedValue) : parsedValue.toFixed(4)
            }
          }
        }

        // normalize the value to always be between -360 and 360
        if (parsedValue > 360 || parsedValue < -360) {
          const repeat = Math.trunc(parsedValue / 360)
          parsedValue = parsedValue - (repeat * 360)
        }

        // we only accept certain degrees for rotation, this is because the rotation in excel
        // only support certain ranges
        if (
          (parsedValue >= 0 && parsedValue <= 90) ||
          (parsedValue >= 270 && parsedValue <= 360)
        ) {
          normalizedValue = parsedValue >= 270 ? parsedValue - 360 : parsedValue
        } else if (parsedValue < 0 && parsedValue >= -90) {
          normalizedValue = parsedValue
        }

        if (normalizedValue != null) {
          // we multiply by -1 because the rotation in excel is different than css transform
          rotationValue = normalizedValue * -1
        }
      } else if (validWritingModes.includes(cellInfo.writingMode) && validTextOrientations.includes(cellInfo.textOrientation)) {
        rotationValue = rotationMap.get(`${cellInfo.writingMode}-${cellInfo.textOrientation}`)
      }

      if (rotationValue != null) {
        props.push({
          key: 'textRotation',
          value: rotationValue
        })
      }
    }

    if (cellInfo.wrapText === 'scroll' || cellInfo.wrapText === 'auto') {
      props.push({
        key: 'wrapText',
        value: true
      })
    }

    if (props.length === 0) {
      return
    }

    return props.reduce((acu, prop) => {
      acu[prop.key] = prop.value
      return acu
    }, {})
  },
  fill: (cellInfo) => {
    if (!utils.isColorDefined(cellInfo.backgroundColor)) {
      return
    }

    return {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: utils.colorToArgb(cellInfo.backgroundColor)
      },
      bgColor: {
        argb: utils.colorToArgb(cellInfo.backgroundColor)
      }
    }
  },
  font: (cellInfo) => {
    const props = []

    if (utils.isColorDefined(cellInfo.foregroundColor)) {
      props.push({
        key: 'color',
        value: {
          argb: utils.colorToArgb(cellInfo.foregroundColor)
        }
      })
    }

    props.push({
      key: 'size',
      value: utils.sizePxToPt(cellInfo.fontSize)
    })

    props.push({
      key: 'name',
      value: cellInfo.fontFamily != null ? cellInfo.fontFamily : 'Calibri'
    })

    props.push({
      key: 'bold',
      value: cellInfo.fontWeight === 'bold' || parseInt(cellInfo.fontWeight, 10) >= 700
    })

    props.push({
      key: 'italic',
      value: cellInfo.fontStyle === 'italic'
    })

    if (cellInfo.textDecoration) {
      props.push({
        key: 'underline',
        value: cellInfo.textDecoration.line === 'underline'
      })
    }

    if (cellInfo.textDecoration) {
      props.push({
        key: 'strike',
        value: cellInfo.textDecoration.line === 'line-through'
      })
    }

    if (props.length === 0) {
      return
    }

    return props.reduce((acu, prop) => {
      acu[prop.key] = prop.value
      return acu
    }, {})
  },
  border: (cellInfo) => {
    const props = []
    const borders = ['left', 'right', 'top', 'bottom']

    borders.forEach((border) => {
      const value = utils.getBorder(cellInfo, border)

      if (value) {
        props.push({
          key: border,
          value: {
            ...(value.style != null ? { style: value.style } : {}),
            color: {
              argb: value.color
            }
          }
        })
      }
    })

    if (props.length === 0) {
      return
    }

    return props.reduce((acu, prop) => {
      acu[prop.key] = prop.value
      return acu
    }, {})
  }
}
