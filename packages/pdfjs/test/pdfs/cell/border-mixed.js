module.exports = function(doc) {
  doc.text('before')

  doc.cell('Cell 1', {
    fontSize: 15, width: 256, padding: 10,
    borderTopWidth: 2, borderTopColor: 0xe74c3c,
    borderRightWidth: 4, borderRightColor: 0x2980b9,
    borderBottomWidth: 6, borderBottomColor: 0x27ae60,
    borderLeftWidth: 8, borderLeftColor: 0xf1c40f,
  })

  doc.text('after')
}
