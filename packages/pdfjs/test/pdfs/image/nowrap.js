module.exports = function(doc, {lorem, image}) {
  doc.image(image.pdf, {
    wrap: false, y: 831.896, x: 10
  })

  doc.text(lorem.shorter)
}
