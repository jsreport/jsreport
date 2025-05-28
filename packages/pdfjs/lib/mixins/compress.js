const sharp = require('sharp')
const zlib = require('zlib')
const PDF = require('../object')

module.exports = (doc) => {
  doc.compress = (options) => {
    doc.finalizers.push(() => compress(doc, options))
  }
}

async function compress (doc) {
  await Promise.all(doc.pages.map(async page => {
    const xobjects = page.properties.get('Resources').get('XObject')
    if (xobjects) {
      for (const xobjectName in xobjects.dictionary) {
        await processXObject(xobjects.get(xobjectName).object)
      }
    }
  }))
}

async function processXObject (xobj, options = {}) {
  const xobjects = xobj.properties.get('Resources')?.get('XObject')
  if (xobjects) {
    for (const xobjectName in xobjects.dictionary) {
      await processXObject(xobjects.get(xobjectName).object)
    }
  }

  if (xobj.properties.get('Subtype')?.name !== 'Image' || xobj.properties.get('Filter')?.name !== 'FlateDecode') {
    return
  }

  if (xobj.properties.get('BitsPerComponent') !== 8 ||
      xobj.properties.get('DecodeParams') != null ||
      xobj.properties.get('Predictor') != null) {
    return
  }

  const colorSpace = xobj.properties.get('ColorSpace')
  if (Array.isArray(colorSpace) && colorSpace[0]?.name === 'ICCBased') {
    if (colorSpace[1] && colorSpace[1].object.properties.get('N') !== 3) {
      return
    }
  } else {
    if (colorSpace?.name !== 'DeviceRGB') {
      return
    }
  }

  const contentBuf = zlib.unzipSync(xobj.content.content)

  const content = await sharp(contentBuf, { raw: { width: xobj.properties.get('Width'), height: xobj.properties.get('Height'), channels: 3 } })
    .jpeg({ mozjpeg: true, quality: options.jpegQuality || 60 })
    .toBuffer()

  xobj.content.content = zlib.deflateSync(content)
  xobj.prop('Filter', new PDF.Array(['/FlateDecode', '/DCTDecode']))
  xobj.prop('Length', xobj.content.content.length)
}
