const pdfjs = require('@jsreport/pdfjs')
const PDF = require('@jsreport/pdfjs/lib/object')
const zlib = require('zlib')
const { createHash } = require('crypto')

module.exports = (contentBuffer, attachmentBuffer, { name, description, creationDate, modificationDate } = {}) => {
  if (name == null) {
    throw new Error('jsreport.pdfUtils.addAttachment requires name')
  }

  if (attachmentBuffer == null && !Buffer.isBuffer(attachmentBuffer)) {
    throw new Error('jsreport.pdfUtils.addAttachment requires buffer')
  }

  const contentExtDoc = new pdfjs.ExternalDocument(contentBuffer)
  const finalDoc = new pdfjs.Document()

  const fileSpec = new PDF.Object()
  fileSpec.prop('Type', 'Filespec')
  fileSpec.prop('F', new PDF.String(name))
  if (description) {
    fileSpec.prop('Desc', new PDF.String(description))
  }

  const streamObject = new PDF.Object()
  const embeddedFile = new PDF.Stream(streamObject)
  embeddedFile.object.prop('Filter', 'FlateDecode')
  embeddedFile.object.prop('Type', 'EmbeddedFile')
  embeddedFile.content = zlib.deflateSync(attachmentBuffer)
  embeddedFile.object.prop('Length', embeddedFile.content.length)

  const params = new PDF.Dictionary()
  embeddedFile.object.prop('Params', params)
  params.set('Size', attachmentBuffer.byteLength)

  const checksum = createHash('md5')
    .update(attachmentBuffer)
    .digest('hex')
  params.set('CheckSum', new PDF.String(checksum))

  if (creationDate) {
    params.set('CreationDate', new PDF.String(formatDate(creationDate)))
  }
  if (modificationDate) {
    params.set('ModDate', new PDF.String(formatDate(modificationDate)))
  }

  const efDictionary = new PDF.Dictionary()
  efDictionary.set('F', streamObject.toReference())
  fileSpec.prop('EF', efDictionary)

  finalDoc._namesObj.properties.get('EmbeddedFiles').get('Names').push(
    new PDF.String(name),
    fileSpec.toReference()
  )

  finalDoc.addPagesOf(contentExtDoc)

  return finalDoc.asBuffer()
}

function formatDate (date) {
  let str = 'D:' +
    date.getFullYear() +
    ('00' + (date.getMonth() + 1)).slice(-2) +
    ('00' + date.getDate()).slice(-2) +
    ('00' + date.getHours()).slice(-2) +
    ('00' + date.getMinutes()).slice(-2) +
    ('00' + date.getSeconds()).slice(-2)

  let offset = date.getTimezoneOffset()
  const rel = offset === 0 ? 'Z' : (offset > 0 ? '-' : '+')
  offset = Math.abs(offset)
  const hoursOffset = Math.floor(offset / 60)
  const minutesOffset = offset - hoursOffset * 60

  str += rel +
    ('00' + hoursOffset).slice(-2) + '\'' +
    ('00' + minutesOffset).slice(-2) + '\''

  return str
}
