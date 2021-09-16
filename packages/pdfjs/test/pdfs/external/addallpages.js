module.exports = function(doc, {document}) {
  const external = document.test

  doc.addPagesOf(external)

  doc.text('Should be on third page ...')
}
