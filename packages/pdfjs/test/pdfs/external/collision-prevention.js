module.exports = function(doc, {font, document, lorem}) {
  doc.text('TEST', { fontSize: 200, color: 0xdddddd, textAlign: 'center' })

  doc.setTemplate(document.pdfjsCreated)

  doc.text('TEST', { fontSize: 200, color: 0xdddddd, textAlign: 'center' })
}
