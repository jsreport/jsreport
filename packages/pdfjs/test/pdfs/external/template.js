module.exports = function(doc, {document, lorem}) {
  doc.setTemplate(document.test)

  doc.text('TEST', { fontSize: 40 })

  doc.pageBreak()

  doc.text(lorem.short, { fontSize: 20 })
}
