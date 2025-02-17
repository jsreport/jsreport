const fsAsync = require('fs/promises')
const { pipeline } = require('stream/promises')
const sizeOf = require('image-size')
const axios = require('axios')
const { pxToEMU, cmToEMU, getDimension } = require('./utils')

module.exports.resolveImageSrc = async function resolveImageSrc (reporter, src) {
  let imageContent
  let imageExtension
  let imageSource

  try {
    if (src && src.startsWith('data:')) {
      const imageSrc = src

      imageSource = 'inline'

      imageExtension = imageSrc.split(';')[0].split('/')[1]
      // we remove subtypes "+..." from the type, like in the case of "svg+xml"
      imageExtension = imageExtension.split('+')[0]

      imageContent = {
        type: 'buffer',
        data: Buffer.from(
          imageSrc.split(';')[1].substring('base64,'.length),
          'base64'
        )
      }
    } else {
      imageSource = 'remote'

      const response = await axios({
        url: src,
        responseType: 'stream',
        method: 'GET'
      })

      const contentType = response.headers['content-type'] || response.headers['Content-Type']

      if (!contentType) {
        throw new Error(`Empty content-type for remote image at "${src}"`)
      }

      const extensionsParts = contentType.split(';')[0].split('/').filter((p) => p)

      if (extensionsParts.length === 0 || extensionsParts.length > 2) {
        throw new Error(`Invalid content-type "${contentType}" for remote image at "${src}"`)
      }

      // some servers returns the image content type without the "image/" prefix
      imageExtension = extensionsParts.length === 1 ? extensionsParts[0] : extensionsParts[1]
      // we remove subtypes "+..." from the type, like in the case of "svg+xml"
      imageExtension = imageExtension.split('+')[0]

      const { pathToFile: tmpImagePath, stream: tmpImageStream } = await reporter.writeTempFileStream((uuid) => `docx-rmt-img-${uuid}.${imageExtension}`)

      await pipeline(response.data, tmpImageStream)

      imageContent = {
        type: 'path',
        data: tmpImagePath
      }
    }
  } catch (error) {
    let wrappedError = error

    if (imageSource === 'remote' && wrappedError?.config?.url != null) {
      wrappedError = reporter.createError(`Unable to fetch remote image at ${wrappedError.config.url}`, {
        original: error
      })
    }

    wrappedError.imageSource = imageSource

    throw wrappedError
  }

  return { imageSource, imageContent, imageExtension }
}

module.exports.getImageSizeInEMU = async function getImageSizeInEMU (imageContent, customSize = {}) {
  let imageBuffer

  // NOTE: size-of supports passing a path to a file in order to read the first bytes of it
  // and identify the image type, but it has issues when reading certain JPG files (with CMYK color code),
  // in those cases if we let it read from path it throws "Corrupt JPG, exceeded buffer limits",
  // however it does not throw if we pass whole buffer, and that is what we do now.
  // in the future, likely in v2 of image-size, we should try to check if the issue is solved
  // and we can just pass it a file and read it from there.
  if (imageContent.type === 'path') {
    imageBuffer = await fsAsync.readFile(imageContent.data)
  } else {
    imageBuffer = imageContent.data
  }

  const imageDimension = sizeOf(imageBuffer)
  let imageWidthEMU
  let imageHeightEMU

  if (customSize.width == null && customSize.height == null) {
    imageWidthEMU = pxToEMU(imageDimension.width)
    imageHeightEMU = pxToEMU(imageDimension.height)
  } else {
    const targetWidth = getDimension(customSize.width)
    const targetHeight = getDimension(customSize.height)

    if (targetWidth) {
      imageWidthEMU =
        targetWidth.unit === 'cm'
          ? cmToEMU(targetWidth.value)
          : pxToEMU(targetWidth.value)
    }

    if (targetHeight) {
      imageHeightEMU =
        targetHeight.unit === 'cm'
          ? cmToEMU(targetHeight.value)
          : pxToEMU(targetHeight.value)
    }

    if (imageWidthEMU != null && imageHeightEMU == null) {
      // adjust height based on aspect ratio of image
      imageHeightEMU = Math.round(
        imageWidthEMU *
          (pxToEMU(imageDimension.height) / pxToEMU(imageDimension.width))
      )
    } else if (imageHeightEMU != null && imageWidthEMU == null) {
      // adjust width based on aspect ratio of image
      imageWidthEMU = Math.round(
        imageHeightEMU *
          (pxToEMU(imageDimension.width) / pxToEMU(imageDimension.height))
      )
    }
  }

  return { width: imageWidthEMU, height: imageHeightEMU }
}
