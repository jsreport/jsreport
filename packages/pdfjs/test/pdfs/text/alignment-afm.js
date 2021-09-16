module.exports = function(doc, fixtures) {
  doc.text(fixtures.lorem.short + '\n\n', { textAlign: 'left' })
  doc.text(fixtures.lorem.short + '\n\n', { textAlign: 'center' })
  doc.text(fixtures.lorem.short + '\n\n', { textAlign: 'right' })
  doc.text(fixtures.lorem.short + '\n\n', { textAlign: 'justify' })
}
