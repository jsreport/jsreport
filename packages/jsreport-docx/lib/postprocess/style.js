const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, serializeXml } = require('../utils')
const { findCommonParent } = require('../styleUtils')

// see the preprocess/styles.js for some explanation

module.exports = (files, headerFooterRefs) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')

  documentFile.data = documentFile.data.replace(/<docxStyles[^/]*\/>.*?(?=<docxStyleEnd\/>)<docxStyleEnd\/>/g, (val) => {
    // no need to pass xml namespaces here because the nodes there are just used for reads,
    // and are not inserted (re-used) somewhere else
    const doc = new DOMParser().parseFromString(`<docxXml>${val}</docxXml>`)
    const docxStylesEl = doc.getElementsByTagName('docxStyles')[0]
    const docxStyleEndEl = doc.getElementsByTagName('docxStyleEnd')[0]
    const runEls = doc.getElementsByTagName('w:r')

    processDocxStylesEl(docxStylesEl, docxStyleEndEl, runEls, doc)

    return serializeXml(doc).replace('<docxXml>', '').replace('</docxXml>', '')
  })

  for (const { doc: headerFooterDoc } of headerFooterRefs) {
    const docxStylesEls = nodeListToArray(headerFooterDoc.getElementsByTagName('docxStyles'))

    for (const docxStylesEl of docxStylesEls) {
      let currentEl = docxStylesEl.nextSibling
      let docxStyleEndEl
      const middleEls = []
      const runEls = []

      if (currentEl != null) {
        do {
          if (currentEl.nodeName === 'docxStyleEnd') {
            docxStyleEndEl = currentEl
            currentEl = null
          } else {
            middleEls.push(currentEl)
            currentEl = currentEl.nextSibling
          }
        } while (currentEl != null)
      }

      if (docxStyleEndEl == null) {
        throw new Error('Could not find docxStyleEnd element for docxStyle processing')
      }

      for (const el of middleEls) {
        const currentREls = nodeListToArray(el.getElementsByTagName('w:r'))
        runEls.push(...currentREls)
      }

      processDocxStylesEl(docxStylesEl, docxStyleEndEl, runEls, headerFooterDoc)
    }
  }
}

function processDocxStylesEl (docxStylesEl, docxStyleEndEl, runEls, doc) {
  const activeStyles = []
  const styleEls = nodeListToArray(docxStylesEl.childNodes)

  for (let i = 0; i < runEls.length; i++) {
    const wR = runEls[i]
    const ts = wR.getElementsByTagName('w:t')

    if (ts.length === 0) {
      continue
    }

    // we only care about checking the first text node, because we have applied normalization
    // that ensures that for nodes containing docxStyle text it will be in only one text node
    const mainTextEl = ts[0]

    if (mainTextEl.textContent.includes('$docxStyleStart')) {
      const startIdx = mainTextEl.textContent.indexOf('$docxStyleStart')
      mainTextEl.textContent = mainTextEl.textContent.replace('$docxStyleStart', '')
      const id = mainTextEl.textContent.substring(startIdx, mainTextEl.textContent.indexOf('$'))
      mainTextEl.textContent = mainTextEl.textContent.replace(id + '$', '')
      const currentStyleEl = styleEls.find(n => n.getAttribute('id') === id)
      activeStyles.push(currentStyleEl)
    }

    if (mainTextEl.textContent.includes('$docxStyleEnd') && activeStyles.length > 0) {
      mainTextEl.setAttribute('xml:space', 'preserve')
      mainTextEl.textContent = mainTextEl.textContent.replace('$docxStyleEnd', '')
      const currentStyleEl = activeStyles.pop()
      color(doc, wR, currentStyleEl)
      continue
    }

    if (activeStyles.length > 0) {
      const currentStyleEl = activeStyles[activeStyles.length - 1]
      color(doc, wR, currentStyleEl)
    }
  }

  docxStylesEl.parentNode.removeChild(docxStylesEl)
  docxStyleEndEl.parentNode.removeChild(docxStyleEndEl)
}

function color (doc, wR, currentStyleEl) {
  const currentTarget = currentStyleEl.getAttribute('target')

  const validParents = [
    { target: 'paragraph', tag: 'w:p' },
    { target: 'cell', tag: 'w:tc' },
    { target: 'row', tag: 'w:tr' }
  ]

  const targetMap = [{ target: 'text', tag: 'w:r' }, ...validParents].reduce((acu, item) => {
    acu[item.target] = item.tag
    return acu
  }, {})

  const targetTag = targetMap[currentTarget]

  if (targetTag == null) {
    throw new Error(`Invalid target "${currentTarget}" for docxStyle`)
  }

  const currentBackgroundColor = currentStyleEl.getAttribute('backgroundColor')
  const currentTextColor = currentStyleEl.getAttribute('textColor')

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
    case 'w:p':
      elsForBackground = [targetEl]
      elsForText = nodeListToArray(targetEl.childNodes).filter((node) => node.tagName === 'w:r')
      break
    case 'w:tc':
      elsForBackground = [targetEl]
      elsForText = nodeListToArray(targetEl.getElementsByTagName('w:r'))
      break
    case 'w:tr':
      elsForBackground = nodeListToArray(targetEl.childNodes).filter((node) => node.tagName === 'w:tc')
      elsForText = nodeListToArray(targetEl.getElementsByTagName('w:r'))
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
      const expectedPrTag = `${currentEl.tagName}Pr`

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
      let wshdEl = nodeListToArray(targetPrEl.childNodes).find((node) => node.tagName === 'w:shd')

      if (!wshdEl) {
        wshdEl = doc.createElement('w:shd')
        targetPrEl.insertBefore(wshdEl, targetPrEl.firstChild)
      }

      wshdEl.setAttribute('w:val', 'clear')
      wshdEl.setAttribute('w:color', 'auto')
      wshdEl.setAttribute('w:fill', currentBackgroundColor)
      wshdEl.removeAttribute('w:themeColor')
      wshdEl.removeAttribute('w:themeTint')
      wshdEl.removeAttribute('w:themeShade')
      wshdEl.removeAttribute('w:themeFill')
      wshdEl.removeAttribute('w:themeFillTint')
      wshdEl.removeAttribute('w:themeFillShade')
    }
  }

  if (currentTextColor != null && currentTextColor !== '') {
    for (const getTargetPrEl of targetPr.textColor) {
      const targetPrEl = getTargetPrEl()
      let colorEl = nodeListToArray(targetPrEl.childNodes).find((node) => node.tagName === 'w:color')

      if (!colorEl) {
        colorEl = doc.createElement('w:color')
        targetPrEl.appendChild(colorEl)
      }

      colorEl.setAttribute('w:val', currentTextColor)
      colorEl.removeAttribute('w:themeColor')
    }
  }
}
