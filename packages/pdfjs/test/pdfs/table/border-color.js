module.exports = function(doc, { lorem })  {
  const table = doc.table({
    widths: [256, 256],
    borderWidth: 10,
    borderColor: 0xe74c3c,
  })

  const row = table.row()

  row.cell(lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
  row.cell(lorem.shorter, { textAlign: 'justify', fontSize: 20, padding: 10 })
}

