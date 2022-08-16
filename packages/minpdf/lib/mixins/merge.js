const zlib = require('zlib')
const PDF = require('../object')

module.exports = (doc) => {
  doc.merge = (ext) => doc.finalizers.push(() => merge(ext, doc))
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

function merge (ext, doc, pageNum) {
  const docPages = doc.catalog.properties.get('Pages').object.properties.get('Kids').map(kid => kid.object)
  const pages = ext.catalog.properties.get('Pages').object.properties.get('Kids').map(kid => kid.object)
  for (let i = 0; i < docPages.length; i++) {
    const docPage = docPages[i]
    const page = pages[i]

    const xobj = new PDF.Object('XObject')
    const xobjStream = new PDF.Stream(xobj)

    const mergeStream = page.properties.get('Contents').object
    const contentStr = zlib.unzipSync(mergeStream.content.content).toString('latin1')
    const content = removeChromeWhiteBackgroundDefaultLayer(contentStr)
    xobjStream.content = zlib.deflateSync(Buffer.from(content, 'latin1'))
    xobj.prop('Length', xobjStream.content.length)
    xobj.prop('Filter', 'FlateDecode')

    xobj.prop('Subtype', 'Form')
    xobj.prop('FormType', 1)
    xobj.prop('BBox', new PDF.Array([0, 0, page.properties.get('MediaBox')[2], page.properties.get('MediaBox')[3]]))
    xobj.prop('Resources', page.properties.get('Resources'))

    const xobjectsDictionary = docPage.properties.get('Resources').get('XObject') || new PDF.Dictionary()

    let index = 1
    let xobjectAlias = 'X1.0'
    while (xobjectsDictionary.has(xobjectAlias)) {
      xobjectAlias = `X${++index}.0`
    }

    xobjectsDictionary.set(xobjectAlias, xobj.toReference())
    docPage.properties.get('Resources').set('XObject', xobjectsDictionary)

    const pageStream = docPage.properties.get('Contents').object.content
    pageStream.content = zlib.unzipSync(pageStream.content).toString('latin1')

    // the content stream typicaly modifies matrix and cursor during painting
    // we use "q" instruction to store the original state and "Q" to pop it back
    pageStream.content = '\nq\n' + pageStream.content + '\nQ\n'

    // change matrix position to the (0,0) and paint the xobject represented through EmbeddedPdf
    const embeddingCode = `q\n1 0 0 1 0 0 cm\n/${xobjectAlias} Do\nQ\n`
    pageStream.content += embeddingCode
    pageStream.content = zlib.deflateSync(pageStream.content)

    pageStream.object.prop('Length', pageStream.content.length)
    pageStream.object.prop('Filter', 'FlateDecode')
  }
}
