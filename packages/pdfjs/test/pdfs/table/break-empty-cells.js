module.exports = function(doc, { lorem })  {
  doc.cell({ y: 28 })

  const table = doc.table({
    widths: [null, null, null, null, null, null, null],
    borderWidth: 1,
    padding: 0,
  })

  for (let i = 0; i < 3; ++i) {
    const row = table.row()
    row.cell('Cell ' + i)
    row.cell()
    row.cell()
    row.cell('Cell ' + i)
    row.cell()
    row.cell('Cell ' + i)
    row.cell('Cell ' + i)
  }
}

module.exports.padding = 0
