module.exports = function(doc, { lorem }) {
  doc.text(lorem.short)

  const cell = doc.cell({
    backgroundColor: 0xeeeeee, padding: 10, width: 256, borderWidth: 1,
    x: 256,
    y: 256,
  })
  cell.text(lorem.short)

  doc.text(lorem.short)
}
