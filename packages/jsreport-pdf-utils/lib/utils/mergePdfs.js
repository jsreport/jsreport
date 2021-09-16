const pdfjs = require('@jsreport/pdfjs')
const PDFDictionary = require('@jsreport/pdfjs/lib/object/dictionary')
const zlib = require('zlib')
const EmbeddedPage = require('./EmbeddedPage')
const Parser = require('@jsreport/pdfjs/lib/parser/parser')

function uint8ToString (u8a) {
  const CHUNK_SZ = 0x8000
  const c = []
  for (let i = 0; i < u8a.length; i += CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)))
  }
  return c.join('')
}

// the back layer produced for example by chrome covers whole page with white rectangle
// it is usually required to remove it to be able to put on behind headers/footers/watermarks
// we search for this pattern:
// 0 0 2000 3000 re
// f
// where 2000 > width and 3000 > height
function includesBackgroundConver (str, width, height) {
  let previousFragment = ''
  for (const fragment of str.split('\n')) {
    if (fragment === 'f') {
      const rectangle = previousFragment.split(' ')
      if (rectangle.length !== 5 || rectangle[0] !== '0' || rectangle[1] !== '0') {
        return false
      }

      const boxWidth = parseInt(rectangle[2])
      const boxHeight = parseInt(rectangle[3])

      return boxWidth > width && boxHeight > height
    }

    previousFragment = fragment
  }
}

function mergePage (finalDoc, contentPage, xobj, mergeToFront, pageHelpInfo) {
  let mergeStream
  if (Array.isArray(xobj.contents)) {
    mergeStream = xobj.contents[0].object.content
    for (let i = 0; i < xobj.contents.length; i++) {
      mergeStream.content += zlib.unzipSync(xobj.contents[i].object.content.content).toString('latin1')
    }
  } else {
    mergeStream = xobj.contents.object.content
    if (mergeStream.content.length === 0) {
      return
    }
    mergeStream.content = zlib.unzipSync(mergeStream.content).toString('latin1')
  }

  if (includesBackgroundConver(mergeStream.content, xobj.width, xobj.height)) {
    mergeStream.content = mergeStream.content.replace(/[0-9 ]+re\nf/, '')
  }
  mergeStream.content = zlib.deflateSync(Buffer.from(mergeStream.content, 'latin1'))
  mergeStream.object.prop('Length', mergeStream.content.length)
  mergeStream.object.prop('Filter', 'FlateDecode')
  finalDoc._doc._useXObject(xobj)

  // add the xobject to the resources of the current page
  const xobjKey = Object.keys(finalDoc._doc._xobjects).find((k) => finalDoc._doc._xobjects[k].x === xobj)
  const resourcesOrRef = contentPage.object.properties.get('Resources')
  const resources = resourcesOrRef.object ? resourcesOrRef.object.properties : resourcesOrRef
  // in case of multiple merged pdfs into the same page, we need to keep track of the xobject id in external pagesHelpInfo structure
  const xnum = `X${pageHelpInfo.xObjIndex}.0`
  if (resources.has('XObject')) {
    resources.get('XObject').add(xnum, finalDoc._doc._xobjects[xobjKey].o[0].reference)
  } else {
    resources.set('XObject', new PDFDictionary({
      [xnum]: finalDoc._doc._xobjects[xobjKey].o[0].reference
    }))
  }

  // prepare the content instructions stream from the current page
  const pageStream = contentPage.object.properties.get('Contents').object.content
  if (pageStream.object.properties.get('Filter')) {
    pageStream.content = zlib.unzipSync(pageStream.content).toString('latin1')
  } else {
    pageStream.content = uint8ToString(pageStream.content)
  }

  if (pageHelpInfo.removeContentBackLayer) {
    if (includesBackgroundConver(pageStream.content, xobj.width, xobj.height)) {
      pageStream.content = pageStream.content.replace(/[0-9 ]+re\nf/, '')
    }
  }
  // the content stream typicaly modifies matrix and cursor during painting
  // we use "q" instruction to store the original state and "Q" to pop it back
  pageStream.content = '\nq\n' + pageStream.content + '\nQ\n'

  // change matrix position to the (0,0) and paint the xobject represented through EmbeddedPdf
  const embeddingCode = `q\n1 0 0 1 0 0 cm\n/${xnum} Do\nQ\n`
  if (mergeToFront) {
    pageStream.content += embeddingCode
  } else {
    pageStream.content = embeddingCode + pageStream.content
  }

  pageStream.content = zlib.deflateSync(pageStream.content)

  pageStream.object.prop('Length', pageStream.content.length)
  pageStream.object.prop('Filter', 'FlateDecode')
}

module.exports.mergePages = (contentBuffer, pageBuffers, mergeToFront, pagesHelpInfo) => {
  const extContent = new pdfjs.ExternalDocument(contentBuffer)
  const doc = new pdfjs.Document()

  for (const i in pageBuffers) {
    const page = extContent.pages.get('Kids')[i]

    // register the merged pdf as xobject into the new document represented in doc
    const parser = new Parser(pageBuffers[i])
    parser.parse()
    const catalog = parser.trailer.get('Root').object.properties
    const pages = catalog.get('Pages').object.properties
    let first = pages.get('Kids')[0].object.properties
    if (first.get('Type').name !== 'Page') {
      first = pages.get('Kids')[0].object.properties.get('Kids')[0].object.properties
    }
    const xobj = new EmbeddedPage(first)

    mergePage(doc, page, xobj, mergeToFront, pagesHelpInfo[i])
  }

  doc.addPagesOf(extContent)
  return doc.asBuffer()
}

module.exports.mergeDocument = (contentBuffer, mergeBuffer, mergeToFront, pagesHelpInfo) => {
  const contentExtDoc = new pdfjs.ExternalDocument(contentBuffer)
  const mergeExtDoc = new pdfjs.ExternalDocument(mergeBuffer)

  const finalDoc = new pdfjs.Document()

  for (let i = 0; i < contentExtDoc.pages.get('Kids').length; i++) {
    const contentPage = contentExtDoc.pages.get('Kids')[i]
    const mergingPage = mergeExtDoc.pages.get('Kids')[i]

    if (!mergingPage) {
      continue
    }

    const xobj = new EmbeddedPage(mergingPage.object.properties)
    mergePage(finalDoc, contentPage, xobj, mergeToFront, pagesHelpInfo[i])
  }

  finalDoc.addPagesOf(contentExtDoc)
  return finalDoc.asBuffer()
}
