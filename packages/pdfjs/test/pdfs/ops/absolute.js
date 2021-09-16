module.exports = function(doc, {lorem}) {
  // absolute
  doc.op(0, 0, 1, 'sc')
  doc.op(0, 830, 297.6648, 11.896, 're')
  doc.op('f')

  doc.text(lorem.short)
}
