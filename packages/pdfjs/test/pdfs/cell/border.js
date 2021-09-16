module.exports = function(doc) {
  doc.text('before')

  doc.cell('Cell 1', {
    fontSize: 15, width: 256, padding: 10,
    borderWidth: 5
  })

  doc.text('in between')

  doc.cell('Cell 2', {
    fontSize: 15, width: 256, padding: 10,
    borderWidth: 1, borderColor: 0x2980b9
  })

  doc.text('after')
}
