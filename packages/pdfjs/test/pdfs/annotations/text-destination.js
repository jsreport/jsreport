const pdf    = require('../../../lib')

module.exports = function(doc, { lorem, font }) {
  doc.text('goto B', { goTo: 'B' })
  doc.text('goto A', { goTo: 'A' })

  doc.pageBreak()
  doc.text('A', { destination: 'A' })

  doc.pageBreak()
  doc.text('B', { destination: 'B' })
}
