const { nodeListToArray, findChildNode, getHeaderFooterDocs } = require('../utils')

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentDoc = documentFile.doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

  const headerReferences = nodeListToArray(documentDoc.getElementsByTagName('w:headerReference')).map((el) => ({
    type: 'header',
    referenceEl: el
  }))

  const footerReferences = nodeListToArray(documentDoc.getElementsByTagName('w:footerReference')).map((el) => ({
    type: 'footer',
    referenceEl: el
  }))

  // we add a wrapper to be able to parse this easily in the post-process
  if (headerReferences.length > 0 || footerReferences.length > 0) {
    const bodyEl = findChildNode('w:body', documentDoc.documentElement)
    const sectPrEl = findChildNode('w:sectPr', bodyEl)

    const wrapperEl = documentDoc.createElement('docxWrappedSectPr')
    const clonedSectPrEl = sectPrEl.cloneNode(true)
    wrapperEl.appendChild(clonedSectPrEl)
    sectPrEl.parentNode.replaceChild(wrapperEl, sectPrEl)
  }

  return getHeaderFooterDocs([...headerReferences, ...footerReferences], documentFilePath, documentRelsDoc, files)
}
