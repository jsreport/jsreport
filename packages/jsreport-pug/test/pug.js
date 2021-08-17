
const should = require('should')
const JsReport = require('@jsreport/jsreport-core')
const JsreportPug = require('../')

describe('jsreport-pug', () => {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport()
    jsreport.use(require('../')())
    return jsreport.init()
  })

  afterEach(() => jsreport && jsreport.close())

  it('should export a jsreport configuration function', () => {
    should(typeof JsreportPug === 'function').be.eql(true)
  })

  it('should create a configuration object from configuration function', () => {
    should(JsreportPug()).have.properties(['name', 'main'])
  })

  it('should render html', async () => {
    const result = await jsreport.render({
      template: {
        engine: 'pug',
        recipe: 'html',
        content: 'h1'
      }
    })

    result.content.toString().should.be.eql('<h1></h1>')
  })

  it('should be able to use helpers', async () => {
    const result = await jsreport.render({
      template: {
        engine: 'pug',
        recipe: 'html',
        content: 'h1 #{templateHelpers.sayHello()}',
        helpers: 'function sayHello () { return \'Hello from nodejs\' }'
      }
    })

    result.content.toString().should.be.eql('<h1>Hello from nodejs</h1>')
  })

  it('should be able to use data', async () => {
    const result = await jsreport.render({
      data: {
        a: 'Hey'
      },
      template: {
        engine: 'pug',
        recipe: 'html',
        content: 'h1= a'
      }
    })

    result.content.toString().should.be.eql('<h1>Hey</h1>')
  })

  it('should be able to use data (interpolation)', async () => {
    const result = await jsreport.render({
      data: {
        name: 'Timothy'
      },
      template: {
        engine: 'pug',
        recipe: 'html',
        content: 'p #{name}\'s Pug source code!'
      }
    })

    result.content.toString().should.be.eql('<p>Timothy\'s Pug source code!</p>')
  })

  it('should throw when syntax error', () => {
    const resultPromise = jsreport.render({
      data: {
        name: 'Timothy'
      },
      template: {
        engine: 'pug',
        recipe: 'html',
        content: 'h1?'
      }
    })

    should(resultPromise).be.rejected()
  })
})
