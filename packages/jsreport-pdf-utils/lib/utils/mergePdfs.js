const pdfjs = require('@jsreport/pdfjs')
const PDFDictionary = require('@jsreport/pdfjs/lib/object/dictionary')
const zlib = require('zlib')
const EmbeddedPage = require('./EmbeddedPage')
const Parser = require('@jsreport/pdfjs/lib/parser/parser')
const PDF = require('@jsreport/pdfjs/lib/object')

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

  mergeStream.content = removeChromeWhiteBackgroundDefaultLayer(mergeStream.content)

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
    pageStream.content = removeChromeWhiteBackgroundDefaultLayer(pageStream.content)
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
  const annots = []

  for (let i = 0; i < contentExtDoc.pages.get('Kids').length; i++) {
    const contentPage = contentExtDoc.pages.get('Kids')[i]
    const mergingPage = mergeExtDoc.pages.get('Kids')[i]

    if (!mergingPage) {
      continue
    }

    const xobj = new EmbeddedPage(mergingPage.object.properties)
    mergePage(finalDoc, contentPage, xobj, mergeToFront, pagesHelpInfo[i])

    if (Array.isArray(mergingPage.object.properties.get('Annots'))) {
      const pageFieldAnnots = []
      for (const annot of mergingPage.object.properties.get('Annots')) {
        if ((annot.object.properties.get('Subtype') == null || annot.object.properties.get('Subtype').toString() !== '/Widget') ||
        (annot.object.properties.get('F') == null || annot.object.properties.get('F').toString() !== '4')) {
          continue
        }
        const annotObject = annot.object
        annotObject.properties.set('P', contentPage)

        finalDoc._registerObject(annotObject)

        annots.push(annotObject.toReference())
        pageFieldAnnots.push(annotObject.toReference())
      }

      /*
        I tried to copy all annotations from the merging page to the content page, but the annotations can have also
        the nested objects, which can be xobjects and this breaks the merging, so for now we copy just acroform fields
        const annotsNestedObjects = []
        Parser.addObjectsRecursive(annotsNestedObjects, annotObject)
        for (const annotNestedObject of annotsNestedObjects) {
          finalDoc._registerObject(annotNestedObject)
          contentExtDoc.objects[i].push(annotNestedObject)
          contentExtDoc.objects[i].push(annotObject)
        } */

      const contentPageAnnots = contentPage.object.properties.get('Annots') || []
      contentPage.object.properties.set('Annots', new PDF.Array([...contentPageAnnots, ...pageFieldAnnots]))
    }
  }

  if (annots.length && mergeExtDoc.acroFormObj) {
    const fieldsInMegedDoc = mergeExtDoc.acroFormObj.properties.get('Fields').filter(f => annots.find(a => a.object === f.object))
    const fields = [...finalDoc._acroFormObj.properties.get('Fields'), ...fieldsInMegedDoc]
    finalDoc._acroFormObj.prop('Fields', new PDF.Array([...fields]))

    // merge the DR -> these are font refs, without DR the fields doesn't display text when lost focus
    if (mergeExtDoc.acroFormObj.properties.has('DR')) {
      let docDR = finalDoc._acroFormObj.properties.get('DR')
      if (docDR == null) {
        docDR = new PDF.Dictionary({
          Font: new PDF.Dictionary()
        })
        finalDoc._acroFormObj.properties.set('DR', docDR)
      }
      const extFontDict = mergeExtDoc.acroFormObj.properties.get('DR').get('Font')
      const docFontDict = docDR.get('Font')

      for (let fontName in extFontDict.dictionary) {
        fontName = fontName.substring(1)
        if (!docFontDict.has(fontName)) {
          const font = extFontDict.get(fontName)
          const fontObjects = []
          Parser.addObjectsRecursive(fontObjects, font)
          for (const o of fontObjects) {
            finalDoc._registerObject(o, true)
          }

          docFontDict.set(fontName, font)
        }
      }
    }
    if (mergeExtDoc.acroFormObj.properties.has('NeedAppearances')) {
      finalDoc._acroFormObj.properties.set('NeedAppearances', mergeExtDoc.acroFormObj.properties.get('NeedAppearances'))
    }
    if (mergeExtDoc.acroFormObj.properties.has('SigFlags')) {
      finalDoc._acroFormObj.properties.set('SigFlags', mergeExtDoc.acroFormObj.properties.get('SigFlags'))
    }
  }

  finalDoc.addPagesOf(contentExtDoc)
  return finalDoc.asBuffer()
}
