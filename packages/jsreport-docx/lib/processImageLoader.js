const { resolveImageSrc } = require('./imageUtils')

module.exports = async function processImageLoader (imageSrc, fallbackSrc, writeTempFileStream, imageLoaderLock) {
  let result

  if (imageLoaderLock) {
    result = await imageLoaderLock.execute(function () {
      return loadImage(imageSrc, fallbackSrc, writeTempFileStream)
    })
  } else {
    result = loadImage(imageSrc, fallbackSrc, writeTempFileStream)
  }

  return result
}

async function loadImage (imageSrc, fallbackSrc, writeTempFileStream) {
  const pendingSources = []

  if (imageSrc != null) {
    pendingSources.push(imageSrc)
  }

  if (fallbackSrc != null) {
    pendingSources.push(fallbackSrc)
  }

  let imageContent
  let imageExtension

  while (pendingSources.length > 0) {
    const currentSource = pendingSources.shift()

    try {
      const resolved = await resolveImageSrc(currentSource, writeTempFileStream)
      imageContent = resolved.imageContent
      imageExtension = resolved.imageExtension
    } catch (resolveError) {
      if (
        pendingSources.length === 0 ||
        resolveError.imageSource !== 'remote'
      ) {
        throw resolveError
      }
    }
  }

  if (imageContent.type === 'buffer') {
    imageContent.type = 'base64'
    imageContent.data = imageContent.data.toString('base64')
  }

  return { content: imageContent, extension: imageExtension }
}
