module.exports = function(doc, {image, lorem}) {
  doc.text(lorem.shorter)

  doc.image(image.complexPdf)

  doc.text(lorem.shorter)
}
