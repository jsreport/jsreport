module.exports = function(doc, {image, lorem}) {
  doc.image(image.jpeg, {
    goTo: 'here'
  })

  doc.pageBreak()

  doc.text('here', { destination: 'here' })
}
