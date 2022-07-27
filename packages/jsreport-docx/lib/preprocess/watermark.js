const path = require('path')
const { nodeListToArray } = require('../utils')

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentDoc = documentFile.doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const headerReferenceEls = nodeListToArray(documentDoc.getElementsByTagName('w:headerReference'))

  const watermarkHeaderReferenceEls = []

  const relationshipEls = nodeListToArray(documentRelsDoc.getElementsByTagName('Relationship'))

  for (const headerReferenceEl of headerReferenceEls) {
    const rid = headerReferenceEl.getAttribute('r:id')

    const relationshipEl = relationshipEls.find(r => (
      r.getAttribute('Id') === rid &&
      r.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header'
    ))

    if (relationshipEl == null) {
      continue
    }

    const headerPath = path.posix.join(path.posix.dirname(documentFilePath), relationshipEl.getAttribute('Target'))
    const headerDoc = files.find((file) => file.path === headerPath)?.doc

    if (headerDoc == null) {
      continue
    }

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
