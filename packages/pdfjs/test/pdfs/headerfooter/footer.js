module.exports = function(doc, {lorem, image}) {
  const footer = doc.footer()
  footer.text('text')

  const cell = footer.cell({ padding: 20, backgroundColor: 0xdddddd })
  cell.text('TESTING')
  cell.image(image.pdf)

  doc.text('Hello')

  doc.pageBreak()

  doc.text(lorem.long, { fontSize: 20 })
}
