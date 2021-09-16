const pdfjs = require('@jsreport/pdfjs')

module.exports = async (contentBuffer, appendBuffer) => {
  const extContent = new pdfjs.ExternalDocument(contentBuffer)
  const extAppend = new pdfjs.ExternalDocument(appendBuffer)
  const doc = new pdfjs.Document()

  doc.addPagesOf(extContent)
  doc.addPagesOf(extAppend)
  return {
    buffer: await doc.asBuffer(),
    pagesInContent: extContent.pageCount,
    pagesInAppend: extAppend.pageCount
  }
}
