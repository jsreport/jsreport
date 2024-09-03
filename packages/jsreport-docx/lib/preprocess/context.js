const { findChildNode } = require('../utils')

module.exports = (files, headerFooterRefs, ctx) => {
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml')
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentRelsFile = files.find(f => f.path === 'word/_rels/document.xml.rels')
  const bodyEl = findChildNode('w:body', documentFile.doc.documentElement)
  const toProcess = [
    {
      doc: contentTypesFile.doc,
      path: contentTypesFile.path,
      startRefEl: contentTypesFile.doc.documentElement.firstChild,
      endRefEl: contentTypesFile.doc.documentElement.lastChild,
      contextType: 'contentTypes'
    },
    { doc: documentFile.doc, path: documentFile.path, startRefEl: bodyEl, endRefEl: bodyEl, contextType: 'document' },
    {
      doc: documentRelsFile.doc,
      path: documentRelsFile.path,
      startRefEl: documentRelsFile.doc.documentElement.firstChild,
      endRefEl: documentRelsFile.doc.documentElement.lastChild,
      contextType: 'documentRels'
    }
  ]

  for (const hfRef of headerFooterRefs) {
    toProcess.push({
      doc: hfRef.doc,
      path: hfRef.path,
      startRefEl: hfRef.doc.documentElement.firstChild,
      endRefEl: hfRef.doc.documentElement.lastChild,
      contextType: hfRef.type
    })
  }

  for (const { doc: targetDoc, path: targetPath, startRefEl, endRefEl, contextType } of toProcess) {
    for (const [key, idManager] of ctx.localIdManagers.all(targetPath)) {
      ctx.templating.setLocalValue(targetPath, `${key}MaxNumId`, idManager.last.numId)
    }

    const extraAttrs = ctx.templating.serializeToHandlebarsAttrs(ctx.templating.allLocalValues(targetPath))
    const extraAttrsStr = extraAttrs.length > 0 ? ' ' + extraAttrs.join(' ') : ''

    const contextStartEl = targetDoc.createElement('docxRemove')
    contextStartEl.textContent = `{{#docxContext type='${contextType}'${extraAttrsStr}}}`

    const contextEndEl = targetDoc.createElement('docxRemove')
    contextEndEl.textContent = '{{/docxContext}}'

    startRefEl.parentNode.insertBefore(contextStartEl, startRefEl)
    endRefEl.parentNode.insertBefore(contextEndEl, endRefEl.nextSibling)
  }
}
