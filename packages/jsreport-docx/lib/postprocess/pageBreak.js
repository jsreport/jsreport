const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const { serializeXml } = require('../utils')

module.exports = async (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<docxPageBreak>',
    '</docxPageBreak>',
    'g',
    async (val, content, hasNestedMatch) => {
      if (hasNestedMatch) {
        return val
      }

      const doc = new DOMParser({ xmlns: { w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' } }).parseFromString(val)
      const pageBreakWBR = doc.createElement('w:br')
      pageBreakWBR.setAttribute('w:type', 'page')

      return serializeXml(pageBreakWBR)
    }
  )
}
