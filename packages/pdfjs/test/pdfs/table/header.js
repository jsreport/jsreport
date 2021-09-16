module.exports = function(doc, { lorem })  {
  const table = doc.table({
    widths: [200, 200],
    borderWidth: 1,
  })

  const header = table.header()
  header.cell('Header Left', { textAlign: 'center', padding: 30 })
  header.cell('Header Right', { textAlign: 'center', padding: 30 })

  const row1 = table.row()

  row1.cell(lorem.long, { fontSize: 11, padding: 10, backgroundColor: 0xdddddd })
  row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })


  const row2 = table.row()

  row2.cell(lorem.long, { fontSize: 16, padding: 10, backgroundColor: 0xdddddd })
  row2.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

  const row3 = table.row()

  row3.cell('Cell 1', { fontSize: 16, padding: 10, backgroundColor: 0xdddddd })
  row3.cell(lorem.short, { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

  doc.text('Foo')
}

