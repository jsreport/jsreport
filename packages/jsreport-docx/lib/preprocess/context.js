const { findChildNode } = require('../utils')

module.exports = (files) => {
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const bodyEl = findChildNode('w:body', documentDoc.documentElement)

  const contextStartEl = documentDoc.createElement('docxRemove')
  contextStartEl.textContent = '{{#docxContext type="document"}}'

  const contextEndEl = documentDoc.createElement('docxRemove')
  contextEndEl.textContent = '{{/docxContext}}'

  bodyEl.parentNode.insertBefore(contextStartEl, bodyEl)
  bodyEl.parentNode.insertBefore(contextEndEl, bodyEl.nextSibling)
}
