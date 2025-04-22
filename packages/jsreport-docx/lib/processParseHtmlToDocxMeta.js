const parseHtmlToDocxMeta = require('./postprocess/html/parseHtmlToDocxMeta')

module.exports = async function processParseHtmlToDocxMeta (html, mode, sectionColsWidth, imageLoader, writeTempFileStream, imageLoaderLock) {
  const imgElements = []

  const docxMeta = parseHtmlToDocxMeta(html, mode, sectionColsWidth, (element) => {
    if (element.type === 'image') {
      imgElements.push(element)
    }
  })

  if (imgElements.length === 0) {
    return docxMeta
  }

  const processImageLoader = require('./processImageLoader')
  const processPromises = []

  for (const imgElement of imgElements) {
    let targetSrc

    if (imageLoader != null) {
      targetSrc = function () {
        return imageLoader(imgElement.src)
      }
    } else {
      targetSrc = imgElement.src
    }

    processPromises.push(
      processImageLoader(targetSrc, null, writeTempFileStream, imageLoaderLock).then((imageResolved) => {
        imgElement.src = imageResolved
      })
    )
  }

  await Promise.all(processPromises)

  return docxMeta
}
