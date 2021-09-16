module.exports = function(doc, {lorem}) {
  for (let i = 0; i < 3; ++i) {
    doc.text(lorem.short, { fontSize: 20 })
  }

  doc.text('--------------------------', { fontSize: 20 })

  // should be moved to the next page retrospectively
  const cell = doc.cell({ backgroundColor: 0xeeeeee, padding: 0, borderWidth: 1 })
  for (let i = 0; i < 4; ++i) {
    cell.text(lorem.short, { fontSize: 20 })
  }

  doc.text(lorem.short, { fontSize: 20 })
}