module.exports = function(doc) {
  const footer = doc.footer()
  footer.text('before', { textAlign: 'center' })
  footer.pageNumber({ textAlign: 'center', fontSize: 16 })

  const header = doc.header()
  header.pageNumber({ textAlign: 'center', fontSize: 16 })
  header.text('after', { textAlign: 'center' })

  doc.text('Hello World 1')

  doc.pageBreak()

  doc.text('Hello World 2')
}
