module.exports = function(doc, { font }) {
  const pdf = require('../../../')
  const path = require('path')
  const fs = require('fs')

  const external = new pdf.ExternalDocument(fs.readFileSync(path.join(__dirname, '/fixtures/msoffice-toc.pdf')))
  doc.addPagesOf(external)
}
