const pdf    = require('../../../lib')

module.exports = function(_, { lorem, font }) {
  const doc = new pdf.Document({
    font:    font.afm.regular,
    paddingLeft: 0,
    paddingRight: 0,
  })
  doc.text(lorem.short)
  return doc
}
