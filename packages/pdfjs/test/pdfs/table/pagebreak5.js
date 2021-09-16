module.exports = function(doc, { lorem })  {
  const table = doc.table({ widths: [200, 200] })
  const row = table.row()
  row.cell(lorem.short, { backgroundColor: 0xeeeeee, padding: 10, fontSize: 20 })
  row.cell('Uneven ...', { backgroundColor: 0xbbbbbb, padding: 10, fontSize: 20 })
}

