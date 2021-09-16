module.exports = function(doc, {lorem}) {
  const cell = doc.cell({
    backgroundColor: 0xeeeeee,
    width: 250,
    padding: 10
  })

  cell.text(lorem.long, { textAlign: 'justify', fontSize: 20 })
  cell.text(lorem.long, { textAlign: 'justify', fontSize: 20 })
}
