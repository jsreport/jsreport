module.exports = function(doc, { lorem })  {
  const table = doc.table({ widths: [205, 205] })

  for (let r = 0; r < 3; ++r) {
    const row = table.row()

    for (let c = 0; c < 2; ++c) {
      const cell = row.cell({ padding: 10, backgroundColor: 0xbbbbbb })
      for (let i = 0; i < 2; ++i) {
        cell.text(lorem.short, { fontSize: 20 })
      }
    }
  }

  doc.text(lorem.shorter)
}

