module.exports = function(doc, { lorem })  {
  doc.cell({ y: 60 })

  const table = doc.table({
    widths: [null, null],
    borderWidth: 1,
    padding: 10,
  })

  for (let i = 0; i < 3; ++i) {
    const row = table.row()
    row.cell('Cell ' + i)
    row.cell('Cell ' + i)
  }
}

