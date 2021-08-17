const should = require('should')
const JsReport = require('@jsreport/jsreport-core')

describe('ejs', function () {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport()
    jsreport.use(require('../')())
    return jsreport.init()
  })

  afterEach(() => jsreport && jsreport.close())

  it('should render html', async () => {
    const result = await jsreport.render({
      template: {
        engine: 'ejs',
        recipe: 'html',
        content: 'Hey'
      }
    })

    result.content.toString().should.be.eql('Hey')
  })

  it('should be able to use helpers', async () => {
    const result = await jsreport.render({
      template: {
        engine: 'ejs',
        helpers: 'function a () { return \'Hey\' }',
        recipe: 'html',
        content: '<%= a() %>'
      }
    })

    result.content.toString().should.be.eql('Hey')
  })

  it('should be able to use data', async () => {
    const result = await jsreport.render({
      data: {
        a: 'Hey'
      },
      template: {
        engine: 'ejs',
        recipe: 'html',
        content: '<%= a %>'
      }
    })

    result.content.toString().should.be.eql('Hey')
  })

  it('should throw when missing helper', () => {
    const resultPromise = jsreport.render({
      template: {
        engine: 'ejs',
        recipe: 'html',
        content: '<%= foo() %>'
      }
    })

    return should(resultPromise).be.rejected()
  })

  it('should throw when syntax error', function () {
    const resultPromise = jsreport.render({
      template: {
        engine: 'ejs',
        recipe: 'html',
        content: '<% for {%>'
      }
    })

    return should(resultPromise).be.rejected()
  })
})
