const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const axios = require('axios')
const { pxToEMU, cmToEMU, getDimension } = require('./utils')

module.exports.resolveImageSrc = async function resolveImageSrc (src, writeTempFileStream) {
  let imageContent
  let imageExtension
  let imageSource

  try {
    if (typeof src === 'string' && src.startsWith('data:')) {
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

      let imageStream
      let imageContentTypeOrExtension

      if (typeof src === 'function') {
        const resolved = await src()
        imageStream = resolved?.stream
        imageContentTypeOrExtension = resolved?.type
      } else {
        const response = await axios({
          url: src,
          responseType: 'stream',
          method: 'GET'
        })

        imageStream = response.data
        imageContentTypeOrExtension = response.headers['content-type'] || response.headers['Content-Type']
      }

      if (!imageContentTypeOrExtension) {
        throw new Error(decorateErrorMessageWithUrl('Empty content-type or extension for remote image', src))
      }

      if (!imageStream) {
        throw new Error(decorateErrorMessageWithUrl('Empty stream for remote image', src))
      }

      if (
        !isNodeReadableStream(imageStream) &&
        !isWebReadableStream(imageStream)
      ) {
        throw new Error(decorateErrorMessageWithUrl('Expected stream but got a different value for remote image', src))
      }

      if (isWebReadableStream(imageStream)) {
        imageStream = Readable.fromWeb(imageStream)
      }

      const extensionsParts = imageContentTypeOrExtension.split(';')[0].split('/').filter((p) => p)

      if (extensionsParts.length === 0 || extensionsParts.length > 2) {
        throw new Error(decorateErrorMessageWithUrl(`Invalid content-type or extension "${imageContentTypeOrExtension}" for remote image`, src))
      }

      // some servers returns the image content type without the "image/" prefix
      imageExtension = extensionsParts.length === 1 ? extensionsParts[0] : extensionsParts[1]
      // we remove subtypes "+..." from the type, like in the case of "svg+xml"
      imageExtension = imageExtension.split('+')[0]

      const { pathToFile: tmpImagePath, stream: tmpImageStream } = await writeTempFileStream((uuid) => `docx-rmt-img-${uuid}.${imageExtension}`)

      await pipeline(imageStream, tmpImageStream)

      imageContent = {
        type: 'path',
        data: tmpImagePath
      }
    }
  } catch (error) {
    let wrappedError = error

    if (imageSource === 'remote' && wrappedError?.config?.url != null) {
      wrappedError = new Error(`Unable to fetch remote image at ${wrappedError.config.url}`, {
        cause: error
      })
    }

    wrappedError.imageSource = imageSource

    throw wrappedError
  }

  return { imageSource, imageContent, imageExtension }
}

module.exports.getImageSizeInEMU = function getImageSizeInEMU (imageSize, customSize = {}) {
  let imageWidthEMU
  let imageHeightEMU

  if (customSize.width == null && customSize.height == null) {
    imageWidthEMU = pxToEMU(imageSize.width)
    imageHeightEMU = pxToEMU(imageSize.height)
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
          (pxToEMU(imageSize.height) / pxToEMU(imageSize.width))
      )
    } else if (imageHeightEMU != null && imageWidthEMU == null) {
      // adjust width based on aspect ratio of image
      imageWidthEMU = Math.round(
        imageHeightEMU *
          (pxToEMU(imageSize.width) / pxToEMU(imageSize.height))
      )
    }
  }

  return { width: imageWidthEMU, height: imageHeightEMU }
}

// from https://github.com/sindresorhus/is-stream/blob/main/index.js
function isNodeReadableStream (stream) {
  return (
    stream !== null &&
    typeof stream === 'object' &&
    typeof stream.pipe === 'function' &&
    typeof stream.read === 'function' &&
    typeof stream.readable === 'boolean' &&
    typeof stream.readableObjectMode === 'boolean' &&
    typeof stream.destroy === 'function' &&
    typeof stream.destroyed === 'boolean'
  )
}

function isWebReadableStream (stream) {
  return (
    stream !== null &&
    typeof stream === 'object' &&
    typeof stream.locked === 'boolean' &&
    typeof stream.cancel === 'function' &&
    typeof stream.getReader === 'function' &&
    typeof stream.pipeTo === 'function' &&
    typeof stream.pipeThrough === 'function'
  )
}

function decorateErrorMessageWithUrl (msg, src) {
  if (typeof src === 'string') {
    return `${msg} at ${src}`
  }

  return msg
}
