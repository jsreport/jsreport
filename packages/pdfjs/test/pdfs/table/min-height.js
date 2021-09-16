module.exports = function(doc, {lorem}) {
  {
    const table = doc.table({ widths: [null, null, null], borderWidth: 1 })
    const row = table.row()

    row.cell('First', { backgroundColor: 0xeeeeee })
    row.cell('Second', { backgroundColor: 0xdddddd, minHeight: 60 })
    row.cell('Third', { backgroundColor: 0xcccccc, minHeight: 100 })
  }

  // row minHeight
  {
    const table = doc.table({ widths: [null, null], borderWidth: 1 })
    const row = table.row({ minHeight: 60})

    row.cell('First', { backgroundColor: 0xeeeeee })
    row.cell('Second', { backgroundColor: 0xdddddd })
  }

  doc.text('Done')

  // page break
  {
    const table = doc.table({ widths: [null, null], borderWidth: 1 })
    const row = table.row()

    row.cell('First', { backgroundColor: 0xeeeeee })
    row.cell('Second', { backgroundColor: 0xdddddd, minHeight: doc._cursor.startY - doc._cursor.bottom })
  }
}

