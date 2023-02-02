const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const { getSectionDetail } = require('../sectionUtils')
const { serializeXml } = require('../utils')

module.exports = async (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const sections = []

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<docxWrappedSectPr>',
    '</docxWrappedSectPr>',
    'g',
    async (val, content, hasNestedMatch) => {
      const doc = new DOMParser().parseFromString(val)
      const sectionPrEl = doc.documentElement.firstChild
      const section = getSectionDetail(sectionPrEl, { documentFilePath, documentRelsDoc, files })
      let sectionIdx = parseInt(sectionPrEl.getAttribute('__sectionIdx__'), 10)
      sectionIdx = isNaN(sectionIdx) ? 0 : sectionIdx

      sectionPrEl.removeAttribute('__sectionIdx__')

      section.idx = sectionIdx

      sections.push(section)

      // return without the wrapping
      return serializeXml(sectionPrEl)
    }
  )

  return sections
}
