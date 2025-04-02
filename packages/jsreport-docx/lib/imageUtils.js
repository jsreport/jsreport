const fsAsync = require('fs/promises')
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const sizeOf = require('image-size')
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
