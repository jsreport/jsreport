const pdf = require('../../../')
const path = require('path')
const fs = require('fs')

module.exports = function(doc) {
  const external = new pdf.ExternalDocument(
    fs.readFileSync(path.join(__dirname, '/fixtures/objstream.pdf'))
  )
  doc.addPagesOf(external)
}
