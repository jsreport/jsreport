module.exports = function(doc, {lorem}) {
  const cell = doc.cell({
    backgroundColor: 0xeeeeee,
    width: 250,
    padding: 10
  })

  cell.text(lorem.shorter, { fontSize: 20 })

  const inner = cell.cell({
    backgroundColor: 0xdddddd,
    padding: 10
  })

  inner.text(lorem.long, { fontSize: 20 })

  cell.text(lorem.shorter, { fontSize: 20 })
}
