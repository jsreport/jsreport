const zlib = require('zlib')
const PDF = require('../object')
const unionGlobalObjects = require('./utils/unionGlobalObjects')
const unionPageObjects = require('./utils/unionPageObjects')

module.exports = (doc) => {
  doc.merge = (ext, options = {}) => doc.finalizers.push(() => merge(ext, doc, options))
}

function uint8ToString (u8a) {
  const CHUNK_SZ = 0x8000
  const c = []
  for (let i = 0; i < u8a.length; i += CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)))
  }
  return c.join('')
}

// chrome typically adds a white rectangle to cover the whole page background
// this needs to be removed in order the merged content to be visible
// this is how it looks typically, we just remove re and f
/*
3.125 0 0 3.125 0 0 cm
1 1 1 RG
1 1 1 rg
/G3 gs
0 0 816 1056 re
*/
const steps = [/1 1 1 RG 1 1 1 rg/, /\/G3 gs/, /[0-9 ]+re/, /f/]
function removeChromeWhiteBackgroundDefaultLayer (content) {
  let stepPhase = 0
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const fragment = lines[i]

    if (fragment.match(steps[stepPhase])) {
      if (stepPhase === steps.length - 1) {
        lines.splice(i - 1, 2)
        return lines.join('\n')
      }
      stepPhase++
    } else {
      if (stepPhase > 0 || fragment === 'f') {
        return content
      }
    }
  }
  return content
}

function mergePage (docPage, page, mergeToFront, doc, ext) {
  const xobj = new PDF.Object('XObject')
  const xobjStream = new PDF.Stream(xobj)

  let content = ''
  if (Array.isArray(page.properties.get('Contents'))) {
    for (const contentRef of page.properties.get('Contents')) {
      content += zlib.unzipSync(contentRef.object.content.content).toString('latin1')
    }
  } else {
    if (page.properties.get('Contents').object.properties.get('Length') !== 0) {
      content = zlib.unzipSync(page.properties.get('Contents').object.content.content).toString('latin1')
    }
  }

  content = removeChromeWhiteBackgroundDefaultLayer(content)

  xobjStream.content = zlib.deflateSync(Buffer.from(content, 'latin1'))
  xobj.prop('Length', xobjStream.content.length)
  xobj.prop('Filter', 'FlateDecode')

  xobj.prop('Subtype', 'Form')
  xobj.prop('FormType', 1)
  xobj.prop('BBox', new PDF.Array([0, 0, page.properties.get('MediaBox')[2], page.properties.get('MediaBox')[3]]))
  xobj.prop('Resources', page.properties.get('Resources'))

  // phantomjs uses object instead of the dictionary here, so we need to handle it
  const docPageResourcesDictionary = docPage.properties.get('Resources') instanceof PDF.PDFReference ? docPage.properties.get('Resources').object.properties : docPage.properties.get('Resources')
  const xobjectsDictionary = docPageResourcesDictionary.get('XObject') || new PDF.Dictionary()

  let index = 1
  let xobjectAlias = 'X1.0'
  while (xobjectsDictionary.has(xobjectAlias)) {
    xobjectAlias = `X${++index}.0`
  }

  xobjectsDictionary.set(xobjectAlias, xobj.toReference())
  docPageResourcesDictionary.set('XObject', xobjectsDictionary)

  let pageStream
  if (Array.isArray(docPage.properties.get('Contents'))) {
    // if there are multiple page streams, we concat them into one
    let content = ''
    for (const c of docPage.properties.get('Contents')) {
      if (c.object.content.object.properties.get('Filter')) {
        content += zlib.unzipSync(c.object.content.content).toString('latin1') + '\n'
      } else {
        content += uint8ToString(c.object.content.content) + '\n'
      }
    }
    pageStream = docPage.properties.get('Contents')[0].object.content
    pageStream.content = zlib.deflateSync(Buffer.from(content, 'latin1'))

    pageStream.object.prop('Length', content.length)
    pageStream.object.prop('Filter', 'FlateDecode')
    docPage.properties.set('Contents', docPage.properties.get('Contents')[0])
  } else {
    pageStream = docPage.properties.get('Contents').object.content
  }

  if (pageStream.object.properties.get('Filter')) {
    pageStream.content = zlib.unzipSync(pageStream.content).toString('latin1')
  } else {
    pageStream.content = uint8ToString(pageStream.content)
  }

  if (!docPage.properties.get('ChromeBackgroundLayerRemovedJsReport')) {
    pageStream.content = removeChromeWhiteBackgroundDefaultLayer(pageStream.content)
    docPage.prop('ChromeBackgroundLayerRemovedJsReport', true)
  }

  // the content stream typicaly modifies matrix and cursor during painting
  // we use "q" instruction to store the original state and "Q" to pop it back
  pageStream.content = '\nq\n' + pageStream.content + '\nQ\n'

  // change matrix position to the (0,0) and paint the xobject represented through EmbeddedPdf
  const embeddingCode = `q\n1 0 0 1 0 0 cm\n/${xobjectAlias} Do\nQ\n`
  if (mergeToFront) {
    pageStream.content += embeddingCode
  } else {
    pageStream.content = embeddingCode + pageStream.content
  }

  pageStream.content = zlib.deflateSync(Buffer.from(pageStream.content, 'latin1'))

  pageStream.object.prop('Length', pageStream.content.length)
  pageStream.object.prop('Filter', 'FlateDecode')
  return xobj
}

function merge (ext, doc, options) {
  unionGlobalObjects(doc, ext, options)

  const docPages = doc.pages
  const pages = ext.pages

  if (options.pageNum != null) {
    const xobj = mergePage(docPages[options.pageNum], pages[0], options.mergeToFront, doc, ext)
    unionPageObjects(ext, doc, {
      newPage: pages[0],
      originalPage: docPages[options.pageNum],
      xobj,
      copyAccessibilityTags: options.copyAccessibilityTags
    })
  } else {
    for (let i = 0; i < docPages.length; i++) {
      const docPage = docPages[i]
      const page = pages[i]

      if (page) {
        const xobj = mergePage(docPage, page, options.mergeToFront, doc, ext)
        unionPageObjects(ext, doc, {
          newPage: page,
          originalPage: docPage,
          xobj,
          copyAccessibilityTags: options.copyAccessibilityTags
        })
      }
    }
  }
}
