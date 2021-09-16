module.exports = function(doc, { lorem })  {
  doc.text(lorem.shorter, { fontSize: 20 })

  const table = doc.table({ widths: [200, 200] })
  const row = table.row()

  const cell1 = row.cell({ padding: 20, backgroundColor: 0xbbbbbb })
  for (let i = 0; i < 2; ++i) {
    cell1.text(lorem.short, { fontSize: 20 })
  }

  const cell2 = row.cell({ padding: 10, backgroundColor: 0xdddddd })
  cell2.text(lorem.short, { fontSize: 20 })

  doc.text(lorem.shorter, { fontSize: 20 })
}

