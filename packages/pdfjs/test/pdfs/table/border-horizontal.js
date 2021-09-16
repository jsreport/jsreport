module.exports = function(doc, { lorem })  {
  {
    const table = doc.table({
      widths: [256, 256],
      borderHorizontalWidth: 10
    })

    for (let i = 0; i < 3; ++i) {
      const row = table.row()

      row.cell('Left ' + i, { fontSize: 20, padding: 10 })
      row.cell('Right ' + i, { fontSize: 20, padding: 10 })
    }
  }

  doc.text('–––––')

  {
    const table = doc.table({
      widths: [256, 256],
      borderHorizontalWidths: i => (i + 1) * 5
    })

    for (let i = 0; i < 3; ++i) {
      const row = table.row()

      row.cell('Left ' + i, { fontSize: 20, padding: 10 })
      row.cell('Right ' + i, { fontSize: 20, padding: 10 })
    }
  }
}

