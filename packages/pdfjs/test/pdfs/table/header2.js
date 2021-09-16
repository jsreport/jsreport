module.exports = function(doc, { lorem })  {
  doc.text('Foo').br().br().br().br().br().br().br().br().br()

  const table = doc.table({
    widths: [null, null],
    borderWidth: 1,
  })

  const header = table.header()
  header.cell('Header Left', { textAlign: 'center', padding: 30 })
  header.cell('Header Right', { textAlign: 'center', padding: 30 })

  const row1 = table.row()

  row1.cell('Cell 1', { fontSize: 11, padding: 10, backgroundColor: 0xdddddd })
  row1.cell('Cell 2', { fontSize: 11, padding: 10, backgroundColor: 0xeeeeee })

  doc.text('Bar')
}

