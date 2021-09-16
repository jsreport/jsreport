module.exports = function(doc, {lorem, image}) {
  const header = doc.header()
  header.text('text')

  const cell = header.cell({ padding: 20, backgroundColor: 0xdddddd })
  cell.text('TESTING')
  cell.image(image.pdf)

  doc.text('Hello')

  doc.pageBreak()

  doc.text(lorem.long, { fontSize: 20 })
}
