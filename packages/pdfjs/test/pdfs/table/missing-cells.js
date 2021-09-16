module.exports = function(doc, {lorem}) {
  const table = doc.table({ widths: [null, null, null], borderWidth: 1 })
  {
    const row = table.row()
    row.cell("A")
    row.cell("B")
    row.cell("C")
  }
  {
    const row = table.row()
    row.cell("A")
    // missing cells should be added automatically
  }

  doc.text(lorem.shorter)
}

