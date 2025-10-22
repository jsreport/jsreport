const fsAsync = require('fs/promises')
const { imageSize } = require('image-size')
const ExifReader = require('exifreader')
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

  let imageBuffer

  if (imageContent.type === 'path') {
    imageBuffer = await fsAsync.readFile(imageContent.data)
  } else {
    imageBuffer = imageContent.data
  }

  // NOTE: size-of supports passing a path to a file in order to read the first bytes of it
  // and identify the image type, but it has issues when reading certain JPG files (with CMYK color code),
  // in those cases if we let it read from path it throws "Corrupt JPG, exceeded buffer limits",
  // however it does not throw if we pass whole buffer, and that is what we do now.
  // in the future, likely in v2 of image-size, we should try to check if the issue is solved
  // and we can just pass it a file and read it from there,
  // this will optimize the memory too so we dont have to buffer the whole image.
  const imageDimensions = imageSize(imageBuffer)

  if (imageContent.type === 'buffer') {
    imageContent.type = 'base64'
    imageContent.data = imageContent.data.toString('base64')
  }

  // we need to parse exif metadata to get the orientation of the image,
  // we need this values to position the image correctly in docx, depending on the orientation
  // the image width and height might need to be swapped
  // https://medium.com/@ageitgey/the-dumb-reason-your-fancy-computer-vision-app-isnt-working-exif-orientation-73166c7d39da
  // https://www.daveperrett.com/articles/2012/07/28/exif-orientation-handling-is-a-ghetto/
  // https://github.com/jsreport/jsreport/issues/1230
  // NOTE: we dont take the orientation from image-size because it only works for jpeg,
  // and we want it to work for png too
  let imageExif

  try {
    imageExif = ExifReader.load(imageBuffer, { expanded: true }).exif
  } catch { /* ignore error, this may happen for unsupported types like svg */ }

  const normalizedSize = { ...imageDimensions }

  return {
    content: imageContent,
    extension: imageExtension,
    orientation: imageExif?.Orientation?.value,
    size: {
      width: normalizedSize.width,
      height: normalizedSize.height
    }
  }
}
