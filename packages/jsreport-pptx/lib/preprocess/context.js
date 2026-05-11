
module.exports = (files, sharedData) => {
  const toProcess = [
    ...files.filter(f => f.path.includes('ppt/slides/slide')).map(f => ({
      doc: f.doc,
      path: f.path,
      startRefEl: f.doc.documentElement.firstChild,
      endRefEl: f.doc.documentElement.lastChild,
      contextType: 'slide'
    }))
  ]

  for (const { doc: targetDoc, path: targetPath, startRefEl, endRefEl, contextType } of toProcess) {
    const extraAttrs = [`path="${targetPath}"`]
    const extraAttrsStr = extraAttrs.length > 0 ? ' ' + extraAttrs.join(' ') : ''

    const contextStartEl = targetDoc.createElement('pptxRemove')
    contextStartEl.textContent = `{{#pptxContext type='${contextType}'${extraAttrsStr}}}`

    const contextEndEl = targetDoc.createElement('pptxRemove')
    contextEndEl.textContent = '{{/pptxContext}}'

    startRefEl.parentNode.insertBefore(contextStartEl, startRefEl)
    endRefEl.parentNode.insertBefore(contextEndEl, endRefEl.nextSibling)
  }
}
