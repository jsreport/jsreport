module.exports = function(doc, { lorem })  {
  const table = doc.table({ widths: [null, null] })
  const row = table.row()

  const cell1 = row.cell({ padding: 0, backgroundColor: 0xeeeeee })
  cell1.text(lorem.short, { fontSize: 20 })

  const cell2 = row.cell({ padding: 20, backgroundColor: 0xbbbbbb })

  const inner = cell2.table({ widths: [null] })
  const innerRow = inner.row()
  const innerCell = innerRow.cell({ padding: 10, backgroundColor: 0xdddddd })

  for (let i = 0; i < 2; ++i) {
    innerCell.text(lorem.short, { fontSize: 20 })
  }

  doc.text(lorem.shorter, { fontSize: 20 })
}

