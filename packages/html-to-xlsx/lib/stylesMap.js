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
