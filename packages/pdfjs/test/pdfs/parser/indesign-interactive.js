const pdf = require('../../../')
const path = require('path')
const fs = require('fs')

module.exports = function(doc) {
  const img = new pdf.Image(fs.readFileSync(path.join(__dirname, '/fixtures/indesign-interactive.pdf')))

  doc.image(img, {
    wrap: false, x: 0, y: 841.89, width: 595.28, height: 841.89
  })
}
