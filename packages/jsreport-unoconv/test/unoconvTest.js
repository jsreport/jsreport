require('should')
const jsreport = require('@jsreport/jsreport-core')
const path = require('path')

describe('unoconv', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
      .use(require('../')({
        command: `python ${path.join(__dirname, 'unoconv.py')}`
      }))
      .use(require('@jsreport/jsreport-html-to-xlsx')())
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should be able to convert xlsx to pdf', async () => {
    const result = await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html-to-xlsx',
        content: '<table><tr><td>Hello</td></tr></table>',
        unoconv: {
          format: 'pdf'
        }
      },
      data: {
        name: 'John'
      }
    })
    result.meta.fileExtension.should.be.eql('pdf')
    result.meta.contentType.should.be.eql('application/pdf')
    result.content.toString().should.startWith('%PDF')
  })
})
