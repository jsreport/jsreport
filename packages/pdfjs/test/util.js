const { parseBuffer, getObjectsRecursive } = require('../lib/parser/parser')
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')

require('should')

module.exports.validate = async (buffer, options) => {
  if (!buffer.toString().includes('AFNumber_Keystroke')) {
    buffer.toString().should.not.containEql('null')
  }
  buffer.toString().should.startWith('%PDF-1.6')
  buffer.toString().should.endWith('%%EOF')
  const { catalog, trailer } = parseBuffer(buffer)
  const objects = getObjectsRecursive(catalog)
  objects.should.not.be.empty()
  return {
    catalog,
    trailer,
    texts: await module.exports.parseText(buffer, options)
  }
}

module.exports.parseText = async (buffer, {
  password
} = { }) => {
  const loadTask = pdfjs.getDocument(buffer)
  if (password != null) {
    loadTask.onPassword = (updatePassword) => updatePassword(password)
  }

  const doc = await loadTask.promise

  const result = []
  for (let i = 1; i < doc.numPages + 1; i++) {
    const text = await getPageText(i, doc)
    result.push(text)
  }

  return result
}

async function getPageText (pageNum, doc) {
  const page = await doc.getPage(pageNum)
  const textContent = await page.getTextContent()
  return textContent.items.reduce((a, v) => a + v.str, '')
}
