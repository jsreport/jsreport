module.exports = function(doc) {
  doc.cell('First', {
    fontSize: 15, width: 100, padding: 10, borderWidth: 1, backgroundColor: 0xeeeeee,
    y: doc._cursor.startY, minHeight: 60
  })

  doc.cell('Second', {
    fontSize: 15, width: 100, padding: 0, borderWidth: 1, backgroundColor: 0xbbbbbb,
    x: 120, y: doc._cursor.startY, minHeight: 60
  })

  doc.cell('Toooooooooooo loooooong for minHeight', {
    fontSize: 15, width: 100, padding: 10, borderWidth: 1, backgroundColor: 0xdddddd,
    x: 230, y: doc._cursor.startY, minHeight: 60
  })

  doc.text('after')

  // minHeight pageBreak
  doc.cell('Next page', {
    fontSize: 15, padding: 10, borderWidth: 1, minHeight: doc._cursor.startY - doc._cursor.bottom
  })

  // minHeight > document height
  doc.cell('Next page', {
    fontSize: 15, padding: 10, borderWidth: 1, minHeight: 900
  })
}
