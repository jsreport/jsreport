const { nodeListToArray, findChildNode, findOrCreateChildNode, serializeXml } = require('../utils')

module.exports = (files, headerFooterRefs, sharedData) => {
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
    {
      doc: documentFile.doc,
      path: documentFile.path,
      startRefEl: bodyEl,
      endRefEl: bodyEl,
      contextType: 'document'
    },
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
      name: hfRef.name,
      path: hfRef.path,
      startRefEl: hfRef.doc.documentElement.firstChild,
      endRefEl: hfRef.doc.documentElement.lastChild,
      contextType: hfRef.type
    })
  }

  for (const { doc: targetDoc, path: targetPath, name, startRefEl, endRefEl, contextType } of toProcess) {
    const extraAttrs = [`path="${targetPath}"`]

    if (contextType === 'header' || contextType === 'footer') {
      extraAttrs.push(`name="${name}"`)
    }

    const extraAttrsStr = extraAttrs.length > 0 ? ' ' + extraAttrs.join(' ') : ''

    const contextStartEl = targetDoc.createElement('docxRemove')
    contextStartEl.textContent = `{{#docxContext type='${contextType}'${extraAttrsStr}}}`

    const contextEndEl = targetDoc.createElement('docxRemove')
    contextEndEl.textContent = '{{/docxContext}}'

    startRefEl.parentNode.insertBefore(contextStartEl, startRefEl)
    endRefEl.parentNode.insertBefore(contextEndEl, endRefEl.nextSibling)

    if (targetPath === documentFile.path) {
      const bodyChildEls = nodeListToArray(findChildNode('w:body', targetDoc.documentElement)?.childNodes ?? [])
      let pendingParagraphEls = []
      const sectionsMap = new Map()

      for (const childEl of bodyChildEls) {
        let sectionPrEl

        if (childEl.nodeName === 'w:p') {
          const pPrEl = findChildNode('w:pPr', childEl)

          if (pPrEl) {
            sectionPrEl = findChildNode('w:sectPr', pPrEl)
          }

          if (sectionPrEl == null) {
            pendingParagraphEls.push(childEl)
          }
        } else if (childEl.nodeName === 'w:sectPr') {
          sectionPrEl = childEl
        }

        if (sectionPrEl == null) {
          continue
        }

        const sectionId = sectionPrEl.getAttribute('__cId__')

        if (!sectionId) {
          throw new Error('Section element does not have a valid __cId__ attribute')
        }

        sectionsMap.set(sectionId, {
          paragraphEls: [...pendingParagraphEls],
          sectionPrEl
        })

        if (pendingParagraphEls.length > 0) {
          pendingParagraphEls = []
        }
      }

      // remove the __cId__ attribute from all sectionPrEls, regardless of whether it was part of
      // a detected section or not
      const sectionPrEls = nodeListToArray(targetDoc.getElementsByTagName('w:sectPr'))

      for (const sectionPrEl of sectionPrEls) {
        sectionPrEl.removeAttribute('__cId__')
      }

      for (const [sectionId, { paragraphEls, sectionPrEl }] of sectionsMap.entries()) {
        sharedData.sections.template.data.get(sectionId).xml = serializeXml(sectionPrEl, true)

        // only mark paragraphs when there is more than one section in the document
        if (sectionsMap.size > 1) {
          for (const paragraphEl of paragraphEls) {
            const pPrEl = findOrCreateChildNode(targetDoc, 'w:pPr', paragraphEl)
            const helperCallEl = targetDoc.createElement('docxRemove')
            helperCallEl.textContent = `{{docxSData type='sectionMark' cId='${sectionId}'}}`
            pPrEl.appendChild(helperCallEl)
          }
        }

        const helperCallEl = targetDoc.createElement('docxRemove')
        helperCallEl.textContent = `{{docxSData type='sectionMark' cId='${sectionId}'}}`
        sectionPrEl.parentNode.replaceChild(helperCallEl, sectionPrEl)
      }
    }
  }
}
