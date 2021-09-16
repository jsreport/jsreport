module.exports = function(doc, {image, lorem}) {
  doc.text('goto', { goTo: 'here' })

  doc.pageBreak()

  doc.image(image.jpeg, {
    destination: 'here'
  })
}
