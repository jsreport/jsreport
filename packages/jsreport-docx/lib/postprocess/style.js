const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, serializeXml } = require('../utils')

// see the preprocess/styles.js for some explanation

function color (doc, wR, currentStyleEl) {
  let wRpr = wR.getElementsByTagName('w:rPr')[0]
  if (!wRpr) {
    wRpr = doc.createElement('w:rPr')
    if (wR.childNodes.length === 0) {
      wR.appendChild(wRpr)
    } else {
      wR.insertBefore(wRpr, wR.getElementsByTagName('w:t')[0])
    }
  }
  let color = wRpr.getElementsByTagName('w:color')[0]
  if (!color) {
    color = doc.createElement('w:color')
    wRpr.appendChild(color)
  }
  color.setAttribute('w:val', currentStyleEl.getAttribute('textColor'))
  color.removeAttribute('w:themeColor')
}

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')

  documentFile.data = documentFile.data.replace(/<docxStyles[^/]*\/>.*?(?=<docxStyleEnd\/>)<docxStyleEnd\/>/g, (val) => {
    // no need to pass xml namespaces here because the nodes there are just used for reads,
    // and are not inserted (re-used) somewhere else
    const doc = new DOMParser().parseFromString('<docxXml>' + val + '</docxXml>')
    const docxStylesEl = doc.getElementsByTagName('docxStyles')[0]

    const wrs = doc.getElementsByTagName('w:r')
    let started = false
    let currentStyleEl
    for (let i = 0; i < wrs.length; i++) {
      const wR = wrs[i]
      const ts = wR.getElementsByTagName('w:t')
      if (ts.length === 0) {
        continue
      }

      if (started === false && ts[0].textContent.includes('$docxStyleStart')) {
        started = true
        ts[0].textContent = ts[0].textContent.replace('$docxStyleStart', '')
        const id = ts[0].textContent.substring(0, ts[0].textContent.indexOf('$'))
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
    const docxStyleEndEl = doc.getElementsByTagName('docxStyleEnd')[0]
    docxStyleEndEl.parentNode.removeChild(docxStyleEndEl)

    return serializeXml(doc).replace('<docxXml>', '').replace('</docxXml>', '')
  })
}
