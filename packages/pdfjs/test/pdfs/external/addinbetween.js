module.exports = function(doc, {document}) {
  const external = document.test

  doc.text('Should be on first page ...')

  doc.addPagesOf(external)

  doc.text('Should be on fourth page ...')
}
