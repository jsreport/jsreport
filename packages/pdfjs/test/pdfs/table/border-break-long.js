module.exports = function(doc, { lorem })  {
  const table = doc.table({
    widths: [256, 256],
    padding: 0,
    borderWidth: 10,
  })

  const row = table.row()

  row.cell(lorem.short, { textAlign: 'justify', fontSize: 20, padding: 10, backgroundColor: 0xdddddd })
  row.cell(lorem.long + '\n' + lorem.long, { textAlign: 'justify', fontSize: 20, padding: 10, backgroundColor: 0xeeeeee })
}

