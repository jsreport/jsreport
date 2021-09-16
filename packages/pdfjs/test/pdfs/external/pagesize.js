module.exports = function(doc, {document}) {
  doc.text('First')

  const pdf = require('../../../')
  const path = require('path')
  const fs = require('fs')

  const external = new pdf.ExternalDocument(fs.readFileSync(path.join(__dirname, '/fixtures/200x200.pdf')))
  doc.addPagesOf(external)

  doc.text('Second')
}
