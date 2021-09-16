module.exports = function(doc, { lorem })  {
  {
    const table = doc.table({
      widths: [256, 256],
      borderHorizontalWidth: 10,
      borderHorizontalColor: 0xe74c3c,
      borderVerticalWidth: 10,
      borderVerticalColor: 0x2980b9,
    })

    for (let i = 0; i < 3; ++i) {
      const row = table.row()

      row.cell('Left ' + i, { fontSize: 20, padding: 10 })
      row.cell('Right ' + i, { fontSize: 20, padding: 10 })
    }
  }

  doc.text('–––––')

  {
    const colors = [0xe74c3c, 0x2980b9, 0x27ae60, 0xf1c40f]
    const table = doc.table({
      widths: [256, 256],
      borderHorizontalWidth: 10,
      borderHorizontalColors: i => colors[i],
      borderVerticalWidth: 10,
      borderVerticalColors: [0xe74c3c, 0x2980b9, 0x27ae60],
    })

    for (let i = 0; i < 3; ++i) {
      const row = table.row()

      row.cell('Left ' + i, { fontSize: 20, padding: 10 })
      row.cell('Right ' + i, { fontSize: 20, padding: 10 })
    }
  }
}

