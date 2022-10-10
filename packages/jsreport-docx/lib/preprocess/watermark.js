const { nodeListToArray } = require('../utils')

module.exports = (files, headerFooterRefs) => {
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const headerReferences = headerFooterRefs.filter((r) => r.type === 'header')
  const watermarkHeaderReferenceEls = []

  for (const { doc: headerDoc, referenceEl: headerReferenceEl } of headerReferences) {
    const pictELS = nodeListToArray(headerDoc.getElementsByTagName('w:pict'))

    let found = false

    for (const pictEl of pictELS) {
      const watermarkShapeEl = nodeListToArray(pictEl.childNodes).find((el) => (
        el.nodeName === 'v:shape' &&
        el.getAttribute('id') != null &&
        el.getAttribute('id').startsWith('PowerPlusWaterMarkObject')
      ))

      if (watermarkShapeEl == null) {
        continue
      }

      const textPathEl = nodeListToArray(watermarkShapeEl.childNodes).find((el) => el.nodeName === 'v:textpath')

      if (textPathEl.getAttribute('string').includes('{{docxWatermark')) {
        found = true
        break
      }
    }

    if (found) {
      watermarkHeaderReferenceEls.push(headerReferenceEl)
    }
  }

  if (watermarkHeaderReferenceEls.length > 0) {
    const newEl = documentDoc.createElement('docxWatermarkHeaderRefs')
    newEl.textContent = watermarkHeaderReferenceEls.map(el => el.getAttribute('r:id')).join(',')
    documentDoc.documentElement.appendChild(newEl)
  }
}
