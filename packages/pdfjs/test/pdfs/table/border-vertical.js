module.exports = function(doc, { lorem })  {
  {
    const table = doc.table({
      widths: [256, 256],
      borderWidth: 1,
      borderVerticalWidth: 10
    })

    const row = table.row()

    row.cell(lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
    row.cell(lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
  }

  doc.text('----')

  {
    const table = doc.table({
      widths: [256, 256],
      borderVerticalWidths: [5, 15, 20]
    })

    const row = table.row()

    row.cell(lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
    row.cell(lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
  }
}

