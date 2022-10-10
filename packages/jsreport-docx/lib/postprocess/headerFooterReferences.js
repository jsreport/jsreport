const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const { nodeListToArray, serializeXml, getHeaderFooterDocs } = require('../utils')

module.exports = async (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const headerFooterReferences = []

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<docxWrappedSectPr>',
    '</docxWrappedSectPr>',
    'g',
    async (val, content, hasNestedMatch) => {
      const doc = new DOMParser().parseFromString(val)

      const headerReferences = nodeListToArray(doc.getElementsByTagName('w:headerReference')).map((el) => ({
        type: 'header',
        referenceEl: el
      }))

      const footerReferences = nodeListToArray(doc.getElementsByTagName('w:footerReference')).map((el) => ({
        type: 'footer',
        referenceEl: el
      }))

      if (documentRelsDoc != null) {
        const referenceResults = getHeaderFooterDocs([...headerReferences, ...footerReferences], documentFilePath, documentRelsDoc, files)
        headerFooterReferences.push(...referenceResults)
      }

      // return without the wrapping
      return serializeXml(doc.documentElement.firstChild)
    }
  )

  return headerFooterReferences
}
