const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, findCommonParent } = require('./utils')

module.exports = function processStyles (stylesMap, xmlStr) {
  const doc = new DOMParser().parseFromString(`<pptxXml>${xmlStr}</pptxXml>`)
  const runEls = doc.getElementsByTagName('a:r')

  const activeStyles = []

  for (let i = 0; i < runEls.length; i++) {
    const wR = runEls[i]
    const ts = wR.getElementsByTagName('a:t')

    if (ts.length === 0) {
      continue
    }

    // we only care about checking the first text node, because we have applied normalization
    // that ensures that for nodes containing pptxStyle text it will be in only one text node
    const mainTextEl = ts[0]

    if (mainTextEl.textContent.includes('$pptxStyleStart')) {
      const startIdx = mainTextEl.textContent.indexOf('$pptxStyleStart')
      mainTextEl.textContent = mainTextEl.textContent.replace('$pptxStyleStart', '')
      const id = mainTextEl.textContent.substring(startIdx, mainTextEl.textContent.indexOf('$'))
      mainTextEl.textContent = mainTextEl.textContent.replace(id + '$', '')
      const currentStyle = stylesMap.get(id).shift()
      activeStyles.push(currentStyle)
    }

    if (mainTextEl.textContent.includes('$pptxStyleEnd') && activeStyles.length > 0) {
      mainTextEl.setAttribute('xml:space', 'preserve')
      mainTextEl.textContent = mainTextEl.textContent.replace('$pptxStyleEnd', '')
      const currentStyle = activeStyles.pop()
      color(doc, wR, currentStyle)
      continue
    }

    if (activeStyles.length > 0) {
      const currentStyle = activeStyles[activeStyles.length - 1]
      color(doc, wR, currentStyle)
    }
  }

  const items = nodeListToArray(doc.documentElement.childNodes)

  return items.map((el) => el.toString()).join('')
}

function color (doc, wR, currentStyle) {
  const currentTarget = currentStyle.target

  const validParents = [
    { target: 'paragraph', tag: 'a:p' },
    { target: 'shape', tag: 'p:sp' },
    { target: 'cell', tag: 'a:tc' },
    { target: 'row', tag: 'a:tr' }
  ]

  const targetMap = [{ target: 'text', tag: 'a:r' }, ...validParents].reduce((acu, item) => {
    acu[item.target] = item.tag
    return acu
  }, {})

  const targetTag = targetMap[currentTarget]

  if (targetTag == null) {
    throw new Error(`Invalid target "${currentTarget}" for pptxStyle`)
  }

  const currentBackgroundColor = currentStyle.backgroundColor
  const currentTextColor = currentStyle.textColor

  if (currentBackgroundColor == null && currentTextColor == null) {
    return
  }

  const targetParentsHierarchy = (
    currentTarget === 'text'
      ? []
      : validParents.slice(0, validParents.findIndex((item) => item.target === currentTarget) + 1)
  )

  const targetEl = findCommonParent(wR, targetParentsHierarchy.map((item) => item.tag))
  let elsForBackground
  let elsForText

  switch (targetEl.tagName) {
    case 'a:p':
      elsForBackground = nodeListToArray(targetEl.childNodes).filter((node) => node.tagName === 'a:r')
      elsForText = nodeListToArray(targetEl.childNodes).filter((node) => node.tagName === 'a:r')
      break
    case 'p:sp':
      elsForBackground = [targetEl]
      elsForText = nodeListToArray(targetEl.getElementsByTagName('a:r'))
      break
    case 'a:tc':
      elsForBackground = [targetEl]
      elsForText = nodeListToArray(targetEl.getElementsByTagName('a:r'))
      break
    case 'a:tr':
      elsForBackground = nodeListToArray(targetEl.childNodes).filter((node) => node.tagName === 'a:tc')
      elsForText = nodeListToArray(targetEl.getElementsByTagName('a:r'))
      break
    default:
      elsForBackground = [targetEl]
      elsForText = [targetEl]
      break
  }

  const targetPr = {
    backgroundColor: [],
    textColor: []
  }

  for (const { type, els } of [{ type: 'backgroundColor', els: elsForBackground }, { type: 'textColor', els: elsForText }]) {
    for (const currentEl of els) {
      const expectedPrTag = currentEl.tagName === 'p:sp' ? 'p:spPr' : `${currentEl.tagName}Pr`

      // we add function to allow the creation of nodes to be lazy and only when really needed
      targetPr[type].push(() => {
        let targetPrEl = nodeListToArray(currentEl.childNodes).find((node) => node.tagName === expectedPrTag)

        if (targetPrEl == null) {
          const newPrEl = doc.createElement(expectedPrTag)
          currentEl.insertBefore(newPrEl, currentEl.firstChild)
          targetPrEl = newPrEl
        }

        return targetPrEl
      })
    }
  }

  if (currentBackgroundColor != null && currentBackgroundColor !== '') {
    for (const getTargetPrEl of targetPr.backgroundColor) {
      const targetPrEl = getTargetPrEl()

      if (targetPrEl.tagName === 'p:spPr' || targetPrEl.tagName === 'a:tcPr') {
        let solidFillEl = nodeListToArray(targetPrEl.childNodes).find((node) => node.tagName === 'a:solidFill')

        if (!solidFillEl) {
          solidFillEl = doc.createElement('a:solidFill')
          targetPrEl.appendChild(solidFillEl)
        }

        let rgbClrEl = nodeListToArray(solidFillEl.childNodes).find((node) => node.tagName === 'a:srgbClr')

        if (!rgbClrEl) {
          const newRgbClrEl = doc.createElement('a:srgbClr')
          solidFillEl.appendChild(newRgbClrEl)
          rgbClrEl = newRgbClrEl
        }

        rgbClrEl.setAttribute('val', currentBackgroundColor)
      } else {
        let aHighlight = targetPrEl.getElementsByTagName('a:highlight')[0]

        if (!aHighlight) {
          aHighlight = doc.createElement('a:highlight')
          targetPrEl.insertBefore(aHighlight, targetPrEl.firstChild)
        }

        let color = aHighlight.getElementsByTagName('a:srgbClr')[0]

        if (!color) {
          color = doc.createElement('a:srgbClr')
          aHighlight.insertBefore(color, aHighlight.firstChild)
        }

        color.setAttribute('val', currentBackgroundColor)
        color.removeAttribute('a:themeColor')
        color.removeAttribute('a:themeTint')
        color.removeAttribute('a:themeShade')
        color.removeAttribute('a:themeFill')
        color.removeAttribute('a:themeFillTint')
        color.removeAttribute('a:themeFillShade')
      }
    }
  }

  if (currentTextColor != null && currentTextColor !== '') {
    for (const getTargetPrEl of targetPr.textColor) {
      const targetPrEl = getTargetPrEl()
      let solidFill = targetPrEl.getElementsByTagName('a:solidFill')[0]

      if (!solidFill) {
        solidFill = doc.createElement('a:solidFill')
        targetPrEl.insertBefore(solidFill, targetPrEl.firstChild)
      }

      let colorEl = nodeListToArray(solidFill.childNodes).find((node) => node.tagName === 'a:srgbClr')

      if (!colorEl) {
        colorEl = doc.createElement('a:srgbClr')
        solidFill.appendChild(colorEl)
      }

      colorEl.setAttribute('val', currentTextColor)
      colorEl.removeAttribute('a:themeColor')
    }
  }
}
