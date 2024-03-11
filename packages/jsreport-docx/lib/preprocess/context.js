const { findChildNode } = require('../utils')

module.exports = (files, headerFooterRefs) => {
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const bodyEl = findChildNode('w:body', documentDoc.documentElement)
  const toProcess = [{ doc: documentDoc, startRefEl: bodyEl, endRefEl: bodyEl, contextType: 'document' }]

  for (const hfRef of headerFooterRefs) {
    toProcess.push({
      doc: hfRef.doc,
      startRefEl: hfRef.doc.documentElement.firstChild,
      endRefEl: hfRef.doc.documentElement.lastChild,
      contextType: hfRef.type
    })
  }

  for (const { doc: targetDoc, startRefEl, endRefEl, contextType } of toProcess) {
    const contextStartEl = targetDoc.createElement('docxRemove')
    contextStartEl.textContent = `{{#docxContext type="${contextType}"}}`

    const contextEndEl = documentDoc.createElement('docxRemove')
    contextEndEl.textContent = '{{/docxContext}}'

    startRefEl.parentNode.insertBefore(contextStartEl, startRefEl)
    endRefEl.parentNode.insertBefore(contextEndEl, endRefEl.nextSibling)
  }
}
