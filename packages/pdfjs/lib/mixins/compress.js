const sharp = require('sharp')
const zlib = require('zlib')
const PDF = require('../object')
const { getObjectsRecursive } = require('../parser/parser')

// todo list
// object streams and cross reference streams
// resize images to the only needed size

module.exports = (doc) => {
  doc.compress = (options = {}) => {
    doc.finalizers.push(() => compress(doc, options))
  }
}

async function compress (doc, options) {
  await Promise.all(doc.pages.map(async page => {
    if (options.removeAccessibility !== false) {
      page.properties.del('StructParents')
    }
    processContentStream(page.properties.get('Contents').object, options)

    const xobjects = page.properties.get('Resources').get('XObject')

    if (xobjects) {
      const xobjectNamesToDelete = []
      for (const xobjectName in xobjects.dictionary) {
        await processXObject(xobjects.get(xobjectName).object, xobjectName, xobjectNamesToDelete, options)
      }

      for (const xobjectName of xobjectNamesToDelete) {
        xobjects.del(xobjectName)
      }
    }
  }))

  await recompressStreams(doc)
}

async function processXObject (xobj, name, xobjectNamesToDelete, options = {}) {
  const group = xobj.properties.get('Group')

  if (group && group.get('S')?.name === 'Transparency' && group.get('I') === true) {
    xobjectNamesToDelete.push(name)
  }

  if (xobj.properties.get('Subtype')?.name === 'Form') {
    processContentStream(xobj, options)
  }

  const xobjects = xobj.properties.get('Resources')?.get('XObject')
  if (xobjects) {
    const xobjectNamesToDelete = []
    for (const xobjectName in xobjects.dictionary) {
      await processXObject(xobjects.get(xobjectName).object, xobjectName, xobjectNamesToDelete, options)
    }
    for (const xobjectName of xobjectNamesToDelete) {
      xobjects.del(xobjectName)
    }
  }

  await imageToJpeg(xobj, options)
}

async function imageToJpeg (xobj, options) {
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

  const newContent = zlib.deflateSync(content, { level: zlib.constants.Z_BEST_COMPRESSION })

  if (newContent.length <= xobj.content.content.length) {
    xobj.content.content = newContent
    xobj.prop('Filter', new PDF.Array(['/FlateDecode', '/DCTDecode']))
    xobj.prop('Length', xobj.content.content.length)
  }
}

async function recompressStreams (doc) {
  const objects = await getObjectsRecursive(doc.catalog)
  await Promise.all(objects.map(async obj => {
    if (obj.content?.content && obj.properties.get('Filter')?.name === 'FlateDecode') {
      const contentBuf = zlib.unzipSync(obj.content.content)
      const compressedContent = zlib.deflateSync(contentBuf, { level: zlib.constants.Z_BEST_COMPRESSION })
      obj.content.content = compressedContent
      obj.prop('Length', compressedContent.length)
    }
  }))
}

async function processContentStream (streamObject, options) {
  const contentStr = zlib.unzipSync(streamObject.content.content).toString('utf8')
  const lines = contentStr.split('\n')
  const filteredLines = []

  for (const line of lines) {
    let processedLine = line
    if (options.removeAccessibility !== false) {
      processedLine = removeAccessibility(processedLine)
      if (processedLine == null) {
        continue
      }
    }

    processedLine = roundNumbersInContentStream(processedLine)

    filteredLines.push(processedLine)
  }

  const newContentBuf = Buffer.from(filteredLines.join('\n'), 'utf8')
  const compressedContent = zlib.deflateSync(newContentBuf, { level: zlib.constants.Z_BEST_COMPRESSION })

  streamObject.content.content = compressedContent
  streamObject.prop('Length', compressedContent.length)
}

const roundableCommands = ['cm', 're', 'm', 'l', ' Tm', 'Td']
function roundNumbersInContentStream (line) {
  if (roundableCommands.find(cmd => line.endsWith(cmd))) {
    return line.replace(/-?\d*\.\d+/g, match => {
      return parseFloat(match).toFixed(3).replace(/\.?0+$/, '')
    })
  }
  return line
}

function removeAccessibility (line) {
  if (line.startsWith('EMC') || line.startsWith('/NonStruct') || line.includes('BDC')) {
    return null
  }

  return line
}
