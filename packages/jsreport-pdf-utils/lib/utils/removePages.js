const pdfjs = require('@jsreport/pdfjs')
module.exports = (contentBuffer, pageNumbers) => {
  const contentExtDoc = new pdfjs.ExternalDocument(contentBuffer)

  if (!Array.isArray(pageNumbers)) {
    pageNumbers = [pageNumbers]
  }

  for (const n of pageNumbers) {
    if (!Number.isInteger(n)) {
      throw new Error('Page number for remove operation needs to be an integer, got ' + pageNumbers)
    }

    if (n < 1) {
      throw new Error('Page number for remove operation needs to be bigger than 0')
    }
  }

  const finalDoc = new pdfjs.Document()
  for (let i = 1; i < contentExtDoc.pageCount + 1; i++) {
    if (!pageNumbers.includes(i)) {
      finalDoc.addPageOf(i, contentExtDoc)
    }
  }

  return finalDoc.asBuffer()
}
