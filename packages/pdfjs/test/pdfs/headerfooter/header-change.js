module.exports = function(doc, {lorem, image}) {
  let header = doc.header()
  header.text('First')

  doc.text('Hello World 1')

  header = doc.header()
  header.text('Second')

  doc.text('Hello World 2')
}
