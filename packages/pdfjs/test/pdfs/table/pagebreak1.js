module.exports = function(doc, { lorem })  {
  doc.text(lorem.shorter, { fontSize: 20 })

  const table = doc.table({ widths: [null, null, null] })
  const row = table.row()

  const cell1 = row.cell({ padding: 0, backgroundColor: 0xeeeeee })
  cell1.text(lorem.short, { fontSize: 20 })

  const cell2 = row.cell({ padding: 20, backgroundColor: 0xbbbbbb })
  for (let i = 0; i < 2; ++i) {
    cell2.text(lorem.short, { fontSize: 20 })
  }

  const cell3 = row.cell({ padding: 10, backgroundColor: 0xdddddd })
  cell3.text(lorem.shorter, { fontSize: 20 })

  doc.text(lorem.shorter, { fontSize: 20 })
}

