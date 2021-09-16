module.exports = async function(doc, fixtures, t) {
  await doc._endPage()
  t.equal(doc._pages.length, 0)

  doc.text('Foobar')

  // necessary to render the last started content
  if (doc._current) {
    doc._current.end()
    doc._current = null
  }

  // render all queued content
  await doc._next()
  await doc._endPage()

  t.equal(doc._pages.length, 1)

  if (doc._pages.length % 2 !== 0) {
    await doc._startPage()
  }
}
