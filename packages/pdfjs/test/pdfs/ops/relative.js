module.exports = function(doc, {lorem}) {
  doc.text(lorem.short)

  // relative
  doc.op(1, 0, 0, 'sc')
  doc.op((x, y) => {
    const height = 40
    return [x, y - height, x + 60, height, 're']
  })
  doc.op('f')
}
