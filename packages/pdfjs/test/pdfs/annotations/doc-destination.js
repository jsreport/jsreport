const pdf = require('../../../lib')

module.exports = function(doc, { lorem, font }) {
  doc.text('goto', { goTo: 'here' })

  doc.pageBreak()
  doc.destination('here')
}
