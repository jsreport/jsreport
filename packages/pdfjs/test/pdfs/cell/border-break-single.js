module.exports = function(doc, {lorem}) {
  const cell = doc.cell({
    backgroundColor: 0xeeeeee,
    width: 200,
    padding: 0,
    borderWidth: 10,
  })

  cell.text(lorem.long, { textAlign: 'justify', fontSize: 15 })
}
