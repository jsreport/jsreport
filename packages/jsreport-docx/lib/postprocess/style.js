const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, serializeXml } = require('../utils')

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
  let started = false
  let currentStyleEl

  for (let i = 0; i < runEls.length; i++) {
    const wR = runEls[i]
    const ts = wR.getElementsByTagName('w:t')
    if (ts.length === 0) {
      continue
    }

    if (started === false && ts[0].textContent.includes('$docxStyleStart')) {
      started = true
      const startIdx = ts[0].textContent.indexOf('$docxStyleStart')
      ts[0].textContent = ts[0].textContent.replace('$docxStyleStart', '')
      const id = ts[0].textContent.substring(startIdx, ts[0].textContent.indexOf('$'))
      ts[0].textContent = ts[0].textContent.replace(id + '$', '')
      currentStyleEl = nodeListToArray(docxStylesEl.childNodes).find(n => n.getAttribute('id') === id)
    }

    if (ts[0].textContent.includes('$docxStyleEnd')) {
      ts[0].setAttribute('xml:space', 'preserve')
      started = false
      ts[0].textContent = ts[0].textContent.replace('$docxStyleEnd', '')
      color(doc, wR, currentStyleEl)
      continue
    }

    if (started === true) {
      ts[0].setAttribute('xml:space', 'preserve')
      color(doc, wR, currentStyleEl)
    }
  }

  docxStylesEl.parentNode.removeChild(docxStylesEl)
  docxStyleEndEl.parentNode.removeChild(docxStyleEndEl)
}

function color (doc, wR, currentStyleEl) {
  let wp = wR.parentNode

  while (wp != null && wp.nodeName !== 'w:p') {
    wp = wp.parentNode
  }

  if (!wp) {
    throw new Error('Could not find paragraph node for styles')
  }

  let wRpr = wR.getElementsByTagName('w:rPr')[0]

  if (!wRpr) {
    wRpr = doc.createElement('w:rPr')
    if (wR.childNodes.length === 0) {
      wR.appendChild(wRpr)
    } else {
      wR.insertBefore(wRpr, wR.getElementsByTagName('w:t')[0])
    }
  }

  const currentBackgroundColor = currentStyleEl.getAttribute('backgroundColor')

  if (currentBackgroundColor != null && currentBackgroundColor !== '') {
    let wpPr = wp.getElementsByTagName('w:pPr')[0]

    if (!wpPr) {
      wpPr = doc.createElement('w:pPr')
      wp.insertBefore(wpPr, wp.firstChild)
    }

    let wshd = wpPr.getElementsByTagName('w:shd')[0]

    if (!wshd) {
      wshd = doc.createElement('w:shd')
      wpPr.insertBefore(wshd, wpPr.firstChild)
    }

    wshd.setAttribute('w:val', 'clear')
    wshd.setAttribute('w:color', 'auto')
    wshd.setAttribute('w:fill', currentBackgroundColor)
    wshd.removeAttribute('w:themeColor')
    wshd.removeAttribute('w:themeTint')
    wshd.removeAttribute('w:themeShade')
    wshd.removeAttribute('w:themeFill')
    wshd.removeAttribute('w:themeFillTint')
    wshd.removeAttribute('w:themeFillShade')
  }

  const currentTextColor = currentStyleEl.getAttribute('textColor')

  if (currentTextColor != null && currentTextColor !== '') {
    let color = wRpr.getElementsByTagName('w:color')[0]

    if (!color) {
      color = doc.createElement('w:color')
      wRpr.appendChild(color)
    }

    color.setAttribute('w:val', currentTextColor)
    color.removeAttribute('w:themeColor')
  }
}
