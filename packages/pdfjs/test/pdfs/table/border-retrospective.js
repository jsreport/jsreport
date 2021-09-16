module.exports = function(doc, {lorem}) {
  for (let i = 0; i < 3; ++i) {
    doc.text(lorem.short, { fontSize: 20 })
  }

  doc.text('---------------------')

  const table = doc.table({ widths: [200, 200], borderWidth: 10 })

  // should be moved to the next page retrospectively
  const row = table.row()
  row.cell(lorem.short, { backgroundColor: 0xeeeeee, padding: 10, fontSize: 20 })
  row.cell(lorem.short, { backgroundColor: 0xbbbbbb, padding: 10, fontSize: 20 })

  doc.text(lorem.short, { fontSize: 20 })
  doc.text(lorem.short, { fontSize: 20 })
}