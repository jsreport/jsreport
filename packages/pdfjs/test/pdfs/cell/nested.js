module.exports = function(doc, fixtures) {
  doc.text(fixtures.lorem.shorter)
  const outer = doc.cell({ width: 400, padding: 20, backgroundColor: 0xeeeeee })
  const inner = outer.cell({ padding: 20, backgroundColor: 0xdddddd })
  inner.text(fixtures.lorem.short)
  inner.text(fixtures.lorem.short)
  outer.text('Hello World')
  doc.text('Hello World')
}

