const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')

describe('static-pdf', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')())
      .use(require('@jsreport/jsreport-chrome-pdf')())
      .use(require('@jsreport/jsreport-assets')())

    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should produce pdf (inline buffer)', async () => {
    const result = await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'static-pdf',
        staticPdf: {
          pdfAsset: {
            content: fs.readFileSync(path.join(__dirname, 'static.pdf'))
          }
        }
      }
    })

    should(result.content.toString().includes('PDF')).be.true()
  })

  it('should produce pdf (inline base64)', async () => {
    const result = await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'static-pdf',
        staticPdf: {
          pdfAsset: {
            content: fs.readFileSync(path.join(__dirname, 'static.pdf')).toString('base64'),
            encoding: 'base64'
          }
        }
      }
    })

    result.content.toString().includes('PDF').should.be.true()
  })

  it('should produce pdf (asset reference)', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'static.pdf',
      shortid: 'static',
      content: fs.readFileSync(path.join(__dirname, 'static.pdf'))
    })

    const result = await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'static-pdf',
        staticPdf: {
          pdfAssetShortid: 'static'
        }
      }
    })

    should(result.content.toString().includes('PDF')).be.true()
  })

  it('should throw error when inline asset does not specify encoding', async () => {
    return should(reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'static-pdf',
        staticPdf: {
          pdfAsset: {
            content: fs.readFileSync(path.join(__dirname, 'static.pdf')).toString('base64')
          }
        }
      }
    })).be.rejectedWith(/encoding is required/)
  })

  it('should throw error when asset reference is not PDF', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'img.png',
      shortid: 'static',
      content: fs.readFileSync(path.join(__dirname, 'img.png'))
    })

    return should(reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'static-pdf',
        staticPdf: {
          pdfAssetShortid: 'static'
        }
      }
    })).be.rejectedWith(/should contain PDF/)
  })
})
