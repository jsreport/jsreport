module.exports = function(doc, {lorem}) {
  for (let i = 0; i < 3; ++i) {
    doc.text(lorem.short, { fontSize: 20 })
  }

  // should be moved to the next page retrospectively
  doc.cell(lorem.short, { backgroundColor: 0xeeeeee, padding: 30, fontSize: 20 })

  doc.text(lorem.short, { fontSize: 20 })
}