require('should')
const jsreport = require('@jsreport/jsreport-core')

describe('libreoffice', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
      .use(require('../')())
      .use(require('@jsreport/jsreport-html-to-xlsx')())
      .use(require('@jsreport/jsreport-scripts')())
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should be able to convert xlsx to pdf', async () => {
    const result = await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html-to-xlsx',
        content: '<table><tr><td>Hello</td></tr></table>',
        libreOffice: {
          format: 'pdf'
        }
      }
    })
    result.meta.fileExtension.should.be.eql('pdf')
    result.meta.contentType.should.be.eql('application/pdf')
    result.content.toString().should.startWith('%PDF')
  })

  it('should export jsreport.libreOffice.convert to the scripts', async () => {
    const result = await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html-to-xlsx',
        content: '<table><tr><td>Hello</td></tr></table>',
        scripts: [{
          content: `
          const jsreport = require('jsreport-proxy')
          async function afterRender(req, res) {
            const pdf = await jsreport.libreOffice.convert(res.content, 'pdf', {
              pdfExportSelectPdfVersion: 15
            })
            res.content = pdf.content
          }
          `
        }]

      }
    })
    result.content.toString().should.startWith('%PDF')
    result.content.toString().should.containEql('1.5')
  })

  it('should export jsreport.libreOffice.print to the scripts', async () => {
    await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html',
        content: 'hello',
        scripts: [{
          content: `
          const jsreport = require('jsreport-proxy')
          async function afterRender(req, res) {
            await jsreport.libreOffice.print(res.content, 'default')            
          }
          `
        }]

      }
    })
  })
})
