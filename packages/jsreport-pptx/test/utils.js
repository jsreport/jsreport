const util = require('util')
const path = require('path')
const fs = require('fs')
const { DOMParser } = require('@xmldom/xmldom')
const textract = util.promisify(require('textract').fromBufferWithName)
const { decompress } = require('@jsreport/office')

module.exports.getDocumentsFromPptx = async function getDocumentsFromPptx (responseOrPptxBuf, documentPaths, options = {}) {
  let pptxBuf

  if (Buffer.isBuffer(responseOrPptxBuf)) {
    pptxBuf = responseOrPptxBuf
  } else {
    pptxBuf = await responseOrPptxBuf.output.getBuffer()
  }

  const files = await decompress()(pptxBuf)
  const targetFiles = []

  for (const documentPath of documentPaths) {
    const fileRef = files.find((f) => f.path === documentPath)
    targetFiles.push(fileRef)
  }

  const result = targetFiles.map((file) => (
    file != null ? new DOMParser().parseFromString(file.data.toString()) : null
  ))

  if (options.returnFiles) {
    return {
      files,
      documents: result
    }
  }

  return result
}

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

async function extractTextResponse (res) {
  const rawContent = await res.output.getBuffer()
  const text = await textract('test.pptx', rawContent)
  return text
}

async function decompressResponse (resOrBuffer) {
  let rawContent

  if (Buffer.isBuffer(resOrBuffer)) {
    rawContent = resOrBuffer
  } else {
    rawContent = await resOrBuffer.output.getBuffer()
  }

  const result = await decompress()(rawContent)
  return result
}

module.exports.extractTextResponse = extractTextResponse
module.exports.decompressResponse = decompressResponse
module.exports.getImageMimeType = getImageMimeType
module.exports.getImageDataUri = getImageDataUri
module.exports.readImage = readImage
