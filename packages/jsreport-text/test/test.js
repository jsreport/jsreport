const JsReport = require('@jsreport/jsreport-core')
require('should')

describe('text', () => {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport().use(require('../')())
    return jsreport.init()
  })

  afterEach(() => jsreport.close())

  it('should render text', async () => {
    const res = await jsreport.render({
      template: {
        content: 'hello',
        recipe: 'text',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('hello')
  })
})
