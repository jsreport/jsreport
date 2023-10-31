const sizeOf = require('image-size')
const axios = require('axios')
const { pxToEMU, cmToEMU, getDimension } = require('./utils')

module.exports.resolveImageSrc = async function resolveImageSrc (src) {
  let imageBuffer
  let imageExtension
  let imageSource

  try {
    if (src && src.startsWith('data:')) {
      const imageSrc = src

      imageSource = 'inline'

      imageExtension = imageSrc.split(';')[0].split('/')[1]
      // we remove subtypes "+..." from the type, like in the case of "svg+xml"
      imageExtension = imageExtension.split('+')[0]

      imageBuffer = Buffer.from(
        imageSrc.split(';')[1].substring('base64,'.length),
        'base64'
      )
    } else {
      imageSource = 'remote'

      const response = await axios({
        url: src,
        responseType: 'arraybuffer',
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
      imageBuffer = Buffer.from(response.data)
    }
  } catch (error) {
    error.imageSource = imageSource
    throw error
  }

  return { imageSource, imageBuffer, imageExtension }
}

module.exports.getImageSizeInEMU = function getImageSizeInEMU (imageBuffer, customSize = {}) {
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
