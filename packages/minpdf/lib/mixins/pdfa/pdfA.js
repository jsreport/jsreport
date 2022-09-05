
const PDF = require('../../object')
const fs = require('fs')
const path = require('path')
const metadataXml = fs.readFileSync(path.join(__dirname, 'metadata.xml')).toString()
const colorOutputProfile = fs.readFileSync(path.join(__dirname, 'colorOutputProfile.bin'))
const zlib = require('zlib')

module.exports = (doc) => {
  doc.pdfA = () => doc.finalizers.push(() => pdfA(doc))
}

async function pdfA (doc) {
  const info = doc.catalog.properties.get('Info').object

  let creationDateStr = info.properties.get('CreationDate')?.toString() || ''
  if (creationDateStr) {
  // D:20210302000000+01'00' > 2022-08-26T19:43:26+00:00
    creationDateStr = creationDateStr
      .substring(3)
      .slice(0, -1)
      .replace('\'', '')
      .replace('\'', '')

    creationDateStr = creationDateStr.slice(0, 4) + '-' + creationDateStr.slice(4)
    creationDateStr = creationDateStr.slice(0, 7) + '-' + creationDateStr.slice(7)
    creationDateStr = creationDateStr.slice(0, 10) + 'T' + creationDateStr.slice(10)
    creationDateStr = creationDateStr.slice(0, 13) + ':' + creationDateStr.slice(13)
    creationDateStr = creationDateStr.slice(0, 16) + ':' + creationDateStr.slice(16)
    creationDateStr = creationDateStr.slice(0, 22) + ':' + creationDateStr.slice(22)
  }

  doc.catalog.properties.get('Names').object.properties.del('EmbeddedFiles')
  const metadata = new PDF.Stream()
  const finalXml = metadataXml
    .replace('@title', info.properties.get('Title')?.str || '')
    .replace('@subject', info.properties.get('Subject')?.str || '')
    .replace('@description', info.properties.get('Subject')?.str || '')
    .replace('@createDate', creationDateStr)
    .replace('@createDate', creationDateStr)
    .replace('@creatorTool', info.properties.get('Creator')?.str || '')
    .replace('@creator', info.properties.get('Creator')?.str || '')
    .replace('@producer', info.properties.get('Producer')?.str || '')
    .replace('@modifyDate', creationDateStr)
  metadata.writeLine(finalXml.replace(/\n/g, ''))
  metadata.object.properties.set('Type', new PDF.Name('Metadata'))
  metadata.object.properties.set('Subtype', new PDF.Name('XML'))
  doc.catalog.properties.set('Metadata', metadata.toReference())

  const destOutputProfileObject = new PDF.Object()
  const destOutputProfileStream = new PDF.Stream(destOutputProfileObject)

  destOutputProfileStream.content = zlib.deflateSync(colorOutputProfile)
  destOutputProfileObject.prop('Length', destOutputProfileStream.content.length)
  destOutputProfileObject.prop('Filter', 'FlateDecode')
  destOutputProfileObject.prop('N', 3)

  const outputIntentDictionary = new PDF.Dictionary()
  outputIntentDictionary.set('Type', new PDF.Name('OutputIntent'))
  outputIntentDictionary.set('OutputCondition', new PDF.String(''))
  outputIntentDictionary.set('Info', new PDF.String('sRGB IEC61966-2.1'))
  outputIntentDictionary.set('OutputConditionIdentifier', new PDF.String('Custom'))
  outputIntentDictionary.set('RegistryName', new PDF.String(''))
  outputIntentDictionary.set('S', new PDF.Name('GTS_PDFA1'))
  outputIntentDictionary.set('DestOutputProfile', destOutputProfileObject.toReference())

  const outputIntents = new PDF.Object()
  outputIntents.content = new PDF.Array([outputIntentDictionary])
  doc.catalog.properties.set('OutputIntents', outputIntents.toReference())

  for (const page of doc.pages) {
    processExtGState(page.properties.get('Resources'))
    processFonts(page.properties.get('Resources').get('Font'))

    const xobjects = page.properties.get('Resources').get('XObject')
    if (xobjects) {
      for (const xobjectName in xobjects.dictionary) {
        processXObject(xobjects.get(xobjectName).object)
      }
    }
  }
}

function processExtGState (resourcesDict) {
  const extgstateDictionart = resourcesDict?.get('ExtGState')
  if (extgstateDictionart) {
    for (const extgstateKey in extgstateDictionart.dictionary) {
      const extGState = extgstateDictionart.get(extgstateKey).object

      const ca = extGState.properties.get('ca')
      if (ca != null && ca !== 1) {
        extGState.prop('ca', 1)
      }

      if (extGState.properties.has('SMask')) {
        extGState.properties.del('SMask')
      }
    }
  }
}

function processXObject (xobj) {
  processSMask(xobj)
  processExtGState(xobj.properties.get('Resources'))
  processFonts(xobj.properties.get('Resources')?.get('Font'))
  xobj.properties.del('Group')

  const xobjects = xobj.properties.get('Resources')?.get('XObject')
  if (xobjects) {
    for (const xobjectName in xobjects.dictionary) {
      processXObject(xobjects.get(xobjectName).object)
    }
  }
}

function processSMask (xobj) {
  if (!xobj.properties.has('SMask')) {
    return
  }

  // the smask has 1 byte for every pixel representing the alpha
  // pdf/a forbids the smask therefore
  // we update original image pixel colors with alpha applied
  // and add Mask which hides transparent pixels

  const smaskObject = xobj.properties.get('SMask').object
  xobj.properties.del('SMask')

  smaskObject.prop('ImageMask', true)
  smaskObject.prop('BitsPerComponent', 1)
  smaskObject.properties.del('ColorSpace')

  const smaskBuf = zlib.unzipSync(smaskObject.content.content)
  const contentBuf = zlib.unzipSync(xobj.content.content)

  const maskBytes = []
  let maskInex = 0
  for (let y = 0; y < xobj.properties.get('Height'); y++) {
    for (let x = 0; x < xobj.properties.get('Width'); x++) {
      if (x % 8 === 0 && x !== 0) {
        maskInex++
      }
      const gray = smaskBuf[x + y * xobj.properties.get('Width')] || 0
      const alpha = (1 / 255) * gray

      // apply alpha to the image pixels
      const indexInImageBytes = x * 3 + y * xobj.properties.get('Width') * 3
      contentBuf[indexInImageBytes] = Math.round(((1 - alpha) * 255) + (alpha * contentBuf[indexInImageBytes]))
      contentBuf[indexInImageBytes + 1] = Math.round(((1 - alpha) * 255) + (alpha * contentBuf[indexInImageBytes + 1]))
      contentBuf[indexInImageBytes + 2] = Math.round(((1 - alpha) * 255) + (alpha * contentBuf[indexInImageBytes + 2]))

      // Mask has 1 bit for every pixel (1 = hide, 0 = visible)
      // when the line of pixels end, the rest of the bits to byte are 1
      // 127 = 1 1 1 1 1 1 1 0
      // this means make visible just 8th pixel and put to mask 127
      maskBytes[maskInex] = maskBytes[maskInex] || 255
      // we hide ty pixel based on the smask value, so a gues would be that we hide pixel when its fully transparent
      // but that makes for example logo in stock showcase a bit blury in edges, so I pick for now the magic value 86
      // determining if the pixel is transparent or not
      maskBytes[maskInex] -= ((gray < 86) ? 0 : 1) * Math.pow(2, 7 - (x % 8))
    }
    maskInex++
  }

  xobj.content.content = zlib.deflateSync(contentBuf)
  xobj.prop('Length', xobj.content.content.length)

  smaskObject.content.content = zlib.deflateSync(Buffer.from(maskBytes))
  smaskObject.prop('Length', smaskObject.content.content.length)
  xobj.prop('Mask', smaskObject.toReference())
}

function processFonts (fontDictionary) {
  if (fontDictionary == null) {
    return
  }

  for (const e in fontDictionary.dictionary) {
    const font = fontDictionary.get(e).object

    const fontName = font.properties.get('BaseFont')?.toString()
    if (fontName && fontName.search(/\/[A-Z]{6}\+/) === 0) {
      font.properties.set('BaseFont', fontName.substring(8))
    }

    const descendantFonts = font.properties.get('DescendantFonts') || []
    for (const df of descendantFonts) {
      const dfBaseFontName = df.object.properties.get('BaseFont')?.toString()
      if (dfBaseFontName && dfBaseFontName.search(/\/[A-Z]{6}\+/) === 0) {
        df.object.properties.set('BaseFont', dfBaseFontName.substring(8))
      }

      const fontDescriptor = df.object.properties.get('FontDescriptor')?.object
      if (fontDescriptor == null) {
        continue
      }

      const fontName = fontDescriptor.properties.get('FontName')?.toString()
      if (fontName && fontName.search(/\/[A-Z]{6}\+/) === 0) {
        fontDescriptor.properties.set('FontName', fontName.substring(8))
      }
    }
  }
}
