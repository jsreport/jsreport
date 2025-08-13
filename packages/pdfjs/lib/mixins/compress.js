const sharp = require('sharp')
const zlib = require('zlib')
const PDF = require('../object')
const { getObjectsRecursive } = require('../parser/parser')
const drawingCommands = [' Tj', ' TJ', '\nS\n', '\ns\n', '\nf\n', '\nF\n', '\nf*\n', '\nB\n', '\nB*\n', '\nb\n', '\nb*\n', ' Do', ' sh']

module.exports = (doc) => {
  /*
    removeAccessibility: true
    jpegQuality: 60
    useObjectStreams: true
    recompressStreams: true
    convertImagesToJpeg: true
    removeEffects: true
  */
  doc.compress = (options = {}) => {
    doc.finalizers.push(async () => {
      const processedXObjects = new Map()

      for (const page of doc.pages) {
        if (options.removeAccessibility !== false) {
          page.properties.del('StructParents')
        }

        const xobjectNamesToDelete = []
        const xobjects = page.properties.get('Resources').get('XObject')

        if (xobjects) {
          for (const xobjectName in xobjects.dictionary) {
            await processXObject(xobjects.get(xobjectName).object, xobjectName, xobjectNamesToDelete, processedXObjects, options)
          }

          for (const xobjectName of xobjectNamesToDelete) {
            xobjects.del(xobjectName)
          }
        }

        if (!Array.isArray(page.properties.get('Contents'))) {
          await processContentStream(page.properties.get('Contents').object, xobjectNamesToDelete, options)
        }
      }

      if (options.recompressStreams !== false) {
        await recompressStreams(doc)
      }
    })

    if (options.useObjectStreams !== false) {
      doc.afterRegistrations.push(() => moveObjectsToObjectStream(doc))
    }

    if (options.useObjectStreams !== false) {
      doc.afterWrites.push(() => useCrossReferenceStream(doc, options))
    }
  }
}

async function processXObject (xobj, name, xobjectNamesToDelete, processedXObjects, options = {}) {
  if (processedXObjects.has(xobj.content)) {
    return
  }

  processedXObjects.set(xobj.content, true)

  if (options.removeEffects !== false) {
    const group = xobj.properties.get('Group')

    if (group && group.get('S')?.name === 'Transparency' && group.get('I') === true) {
      const str = xobj.content.getDecompressedString()

      if (!drawingCommands.some(cmd => str.includes(cmd))) {
        xobjectNamesToDelete.push(name)
      }
    }

    const xobjects = xobj.properties.get('Resources')?.get('XObject')
    if (xobjects) {
      for (const xobjectName in xobjects.dictionary) {
        await processXObject(xobjects.get(xobjectName).object, xobjectName, xobjectNamesToDelete, processedXObjects, options)
      }
      for (const xobjectName of xobjectNamesToDelete) {
        xobjects.del(xobjectName)
      }
    }

    if (xobj.properties.get('Subtype')?.name === 'Form' && !xobjectNamesToDelete.includes(name)) {
      processContentStream(xobj, xobjectNamesToDelete, options)
    }
  }

  if (options.convertImagesToJpeg !== false) {
    await imageToJpeg(xobj, options)
  }
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

async function processContentStream (streamObject, xobjectNamesToDelete, options) {
  if (options.trimNumbers === false && options.removeAccessibility === false) {
    return
  }

  const contentStr = streamObject.content.getDecompressedString()

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

    if (options.trimNumbers !== false) {
      processedLine = trimNumbersInContentStream(processedLine)
    }

    if (processedLine.includes('Do') && xobjectNamesToDelete.some(name => processedLine.includes(name))) {
      continue
    }

    filteredLines.push(processedLine)
  }

  const newContentBuf = Buffer.from(filteredLines.join('\n'), 'utf8')
  streamObject.content.setAndCompress(newContentBuf)
}

const roundableCommands = ['cm', 're', 'm', 'l', ' Tm', 'Td']
function trimNumbersInContentStream (line) {
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

function moveObjectsToObjectStream (doc) {
  const objects = getObjectsRecursive(doc.catalog)

  const suitableObjects = objects.filter(obj => {
    return obj.content?.content == null && obj.properties.get('Type')?.name !== 'ObjStm' &&
      obj.properties.get('Type')?.name !== 'XRef' && obj.properties.get('Type')?.name !== 'Catalog' &&
      obj.properties.get('Type')?.name !== 'Page' && obj.properties.get('Type')?.name !== 'Pages'
  })

  for (const obj of suitableObjects) {
    obj._inStream = true
  }

  const objectStream = new PDF.Stream()
  objectStream.object.prop('Type', 'ObjStm')
  objectStream.object.prop('N', suitableObjects.length)

  let offset = 0
  const offsets = []
  for (const obj of suitableObjects) {
    offsets.push(obj.id.toString() + ' ' + offset)
    offset += obj.toString().split('\n').slice(1, -1).join('\n').length
  }

  const offsetsString = offsets.join(' ') + '\n'

  objectStream.object.prop('First', offsetsString.length)

  const finalContent = offsetsString + suitableObjects.map(obj => obj.toString().split('\n').slice(1, -1).join('\n')).join('')
  const compressedContent = zlib.deflateSync(Buffer.from(finalContent, 'utf8'), { level: zlib.constants.Z_BEST_COMPRESSION })
  objectStream.content = compressedContent
  objectStream.object.prop('Length', objectStream.content.length)
  objectStream.object.prop('Filter', 'FlateDecode')

  doc._registerObject(objectStream.object)

  for (const obj of suitableObjects) {
    obj._inStreamId = objectStream.object.id
    obj._inStreamIndex = suitableObjects.indexOf(obj)
  }

  doc._writeObject(objectStream.object)
  doc._objectStreamObject = objectStream.object
}

async function useCrossReferenceStream (doc, options) {
  const objects = getObjectsRecursive(doc.catalog)
  objects.push(doc._objectStreamObject)

  const xrefStream = new PDF.Stream()
  const bufferForXref = createXrefStream([doc.catalog, ...objects], doc._xref)
  xrefStream.content = zlib.deflateSync(bufferForXref, { level: zlib.constants.Z_BEST_COMPRESSION })
  xrefStream.object.prop('Type', 'XRef')
  xrefStream.object.prop('Length', xrefStream.content.length)
  xrefStream.object.prop('W', new PDF.Array([1, 4, 2]))
  xrefStream.object.prop('Filter', 'FlateDecode')
  xrefStream.object.prop('Size', doc._nextObjectId)
  xrefStream.object.prop('Root', doc.catalog.toReference())

  doc._registerObject(xrefStream.object)

  doc._xref.toString = () => {
    doc._writeObject(xrefStream.object)
    return ''
  }
}

function createXrefStream (objects, xref) {
  const maxObjNum = Math.max(...objects.map(o => o.id))

  const entries = []
  for (let i = 0; i <= maxObjNum; ++i) {
    // 0: free, 1: uncompressed, 2: compressed
    const obj = objects.find(o => o.id === i)

    if (i === 0) {
      // Special entry for obj 0 (free object, always)
      entries.push({ type: 0, field2: 0, field3: 0 })
    } else if (obj && !obj._inStream) {
      // Uncompressed object
      if (!xref.getOffset(obj.id)) {
        throw new Error(`Object with id ${obj.id} not found in xref`)
      }
      entries.push({ type: 1, field2: xref.getOffset(obj.id), field3: 0 })
    } else if (obj && obj._inStream) {
      // Compressed object
      entries.push({ type: 2, field2: obj._inStreamId, field3: obj._inStreamIndex })
    } else {
      // Object missing, treat as free
      entries.push({ type: 0, field2: 0, field3: 0 })
    }
  }

  // 3. Field widths: 1, 4, 2 (type, offset/objstm, gen/index)

  // 4. Build the xref stream (binary)
  const xrefData = Buffer.alloc(entries.length * 7)

  entries.forEach((entry, i) => {
    xrefData.writeUInt8(entry.type, i * 7 + 0)
    xrefData.writeUInt32BE(entry.field2, i * 7 + 1)
    xrefData.writeUInt16BE(entry.field3, i * 7 + 5)
  })

  return xrefData
}
