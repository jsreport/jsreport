module.exports = function(doc, {document}) {
  const external = document.test

  doc.addPageOf(1, external)

  doc.text('Should be on second page ...')
}
