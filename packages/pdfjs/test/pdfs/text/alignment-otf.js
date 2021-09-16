module.exports = function(doc, fixtures) {
  doc.text(fixtures.lorem.short + '\n\n', { font: fixtures.font.opensans.regular, textAlign: 'left' })
  doc.text(fixtures.lorem.short + '\n\n', { font: fixtures.font.opensans.regular, textAlign: 'center' })
  doc.text(fixtures.lorem.short + '\n\n', { font: fixtures.font.opensans.regular, textAlign: 'right' })
  doc.text(fixtures.lorem.short + '\n\n', { font: fixtures.font.opensans.regular, textAlign: 'justify' })
}
