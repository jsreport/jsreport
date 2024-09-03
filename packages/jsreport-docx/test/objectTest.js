const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { getDocumentsFromDocxBuf } = require('./utils')
const { nodeListToArray } = require('../lib/utils')

const docxDirPath = path.join(__dirname, './docx')
const outputPath = path.join(__dirname, '../out.docx')

describe('docx object', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      store: {
        provider: 'memory'
      }
    })
      .use(require('../')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('object throw error when content is not passed', async () => {
    return should(reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'object.docx'))
          }
        },
        helpers: `
          function getFile () {}
        `
      },
      data: {}
    })).be.rejectedWith(/docxObject helper requires object parameter to be set/i)
  })

  it('object docx from helper', async () => {
    const embedBase64 = fs.readFileSync(path.join(docxDirPath, 'object-embed.docx'), 'base64')
    const embedPreviewBase64 = fs.readFileSync(path.join(docxDirPath, 'object-embed-docx-preview.png'), 'base64')

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'object.docx'))
          }
        },
        helpers: `
          async function getFile () {
            const buf = Buffer.from('${embedBase64}', 'base64')
            const previewBuf = Buffer.from('${embedPreviewBase64}', 'base64')

            return {
              content: {
                buffer: buf,
                fileType: 'docx'
              },
              preview: {
                buffer: previewBuf,
                fileType: 'png'
              }
            }
          }
        `
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(2)

    const firstParagraphTextNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(firstParagraphTextNodes.length).eql(1)

    should(firstParagraphTextNodes[0].textContent).eql('Main content')

    const secondParagraph = paragraphNodes[1]

    const objectEl = nodeListToArray(secondParagraph.getElementsByTagName('w:object'))[0]

    should(objectEl).be.ok()

    const shapeEl = nodeListToArray(objectEl.getElementsByTagName('v:shape'))[0]

    should(shapeEl).be.ok()

    const shapeImageDataEl = nodeListToArray(shapeEl.getElementsByTagName('v:imagedata'))[0]

    should(shapeImageDataEl).be.ok()
    should(shapeImageDataEl.getAttribute('r:id') != null && shapeImageDataEl.getAttribute('r:id') !== '').be.true()

    const oleObjectEl = nodeListToArray(objectEl.getElementsByTagName('o:OLEObject'))[0]

    should(oleObjectEl).be.ok()
    should(oleObjectEl.getAttribute('Type')).eql('Embed')
    should(oleObjectEl.getAttribute('ProgID')).eql('Word.Document.12')
    should(oleObjectEl.getAttribute('ShapeID')).be.eql(shapeEl.getAttribute('id'))
    should(oleObjectEl.getAttribute('DrawAspect')).eql('Icon')
    should(oleObjectEl.getAttribute('ObjectID') != null && oleObjectEl.getAttribute('ObjectID') !== '').be.true()
    should(oleObjectEl.getAttribute('r:id') != null && oleObjectEl.getAttribute('r:id') !== '').be.true()
  })

  it('object with docx from asset', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'template.docx',
      content: fs.readFileSync(path.join(docxDirPath, 'object-embed.docx'))
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'preview.png',
      content: fs.readFileSync(path.join(docxDirPath, 'object-embed-docx-preview.png'))
    })

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'object.docx'))
          }
        },
        helpers: `
          async function getFile () {
            const buf = await require('jsreport-proxy').assets.read('template.docx', 'buffer')
            const previewBuf = await require('jsreport-proxy').assets.read('preview.png', 'buffer')

            return {
              content: {
                buffer: buf,
                fileType: 'docx'
              },
              preview: {
                buffer: previewBuf,
                fileType: 'png'
              }
            }
          }
        `
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(2)

    const firstParagraphTextNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(firstParagraphTextNodes.length).eql(1)

    should(firstParagraphTextNodes[0].textContent).eql('Main content')

    const secondParagraph = paragraphNodes[1]

    const objectEl = nodeListToArray(secondParagraph.getElementsByTagName('w:object'))[0]

    should(objectEl).be.ok()

    const shapeEl = nodeListToArray(objectEl.getElementsByTagName('v:shape'))[0]

    should(shapeEl).be.ok()

    const shapeImageDataEl = nodeListToArray(shapeEl.getElementsByTagName('v:imagedata'))[0]

    should(shapeImageDataEl).be.ok()
    should(shapeImageDataEl.getAttribute('r:id') != null && shapeImageDataEl.getAttribute('r:id') !== '').be.true()

    const oleObjectEl = nodeListToArray(objectEl.getElementsByTagName('o:OLEObject'))[0]

    should(oleObjectEl).be.ok()
    should(oleObjectEl.getAttribute('Type')).eql('Embed')
    should(oleObjectEl.getAttribute('ProgID')).eql('Word.Document.12')
    should(oleObjectEl.getAttribute('ShapeID')).be.eql(shapeEl.getAttribute('id'))
    should(oleObjectEl.getAttribute('DrawAspect')).eql('Icon')
    should(oleObjectEl.getAttribute('ObjectID') != null && oleObjectEl.getAttribute('ObjectID') !== '').be.true()
    should(oleObjectEl.getAttribute('r:id') != null && oleObjectEl.getAttribute('r:id') !== '').be.true()
  })
})
