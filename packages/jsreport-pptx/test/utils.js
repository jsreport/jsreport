const path = require('path')
const fs = require('fs')

module.exports.getImageSize = async function getImageSize (blipEl) {
  const picEl = blipEl.parentNode.parentNode

  if (picEl.nodeName !== 'p:pic') {
    return
  }

  const grpSpEl = picEl.parentNode

  if (grpSpEl.nodeName !== 'p:grpSp') {
    return
  }

  const aExtEl = grpSpEl.getElementsByTagName('p:grpSpPr')[0].getElementsByTagName('a:xfrm')[0].getElementsByTagName('a:ext')[0]

  return {
    width: parseFloat(aExtEl.getAttribute('cx')),
    height: parseFloat(aExtEl.getAttribute('cy'))
  }
}

function getImageMimeType (format) {
  return `image/${format}${format === 'svg' ? '+xml' : ''}`
}

function getImageDataUri (format, imageBuf) {
  const mimeType = getImageMimeType(format)
  return `data:${mimeType};base64,` + imageBuf.toString('base64')
}

function readImage (pptxDirPath, format, basename) {
  const fileExtensions = format === 'jpeg' ? ['jpeg', 'jpg'] : [format]

  while (fileExtensions.length > 0) {
    const fileExtension = fileExtensions.shift()

    try {
      const imagePath = path.join(pptxDirPath, `${basename}.${fileExtension}`)
      const buf = fs.readFileSync(imagePath)
      return { imageBuf: buf, imagePath, imageExtension: fileExtension }
    } catch (error) {
      const shouldThrow = error.code !== 'ENOENT' || fileExtensions.length === 0

      if (shouldThrow) {
        throw error
      }
    }
  }
}

module.exports.getImageMimeType = getImageMimeType
module.exports.getImageDataUri = getImageDataUri
module.exports.readImage = readImage
