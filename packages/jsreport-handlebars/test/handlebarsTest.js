require('should')
const JsReport = require('@jsreport/jsreport-core')

describe('handlebars', () => {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport()
    jsreport.use(require('../')())
    return jsreport.init()
  })

  afterEach(() => jsreport.close())

  it('should render html', async () => {
    const res = await jsreport.render({
      template: {
        content: 'Hey',
        engine: 'handlebars',
        recipe: 'html'
      }
    })
    res.content.toString().should.be.eql('Hey')
  })

  it('should be able to use helpers', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{{a}}}',
        engine: 'handlebars',
        recipe: 'html',
        helpers: `function a() { return 'Hey' }`
      }
    })
    res.content.toString().should.be.eql('Hey')
  })

  it('should be able to use data', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{{a}}}',
        engine: 'handlebars',
        recipe: 'html'
      },
      data: {
        a: 'Hey'
      }
    })
    res.content.toString().should.be.eql('Hey')
  })

  it('should throw when syntax error', async () => {
    return jsreport.render({
      template: {
        content: '{{#if}}',
        engine: 'handlebars',
        recipe: 'html'
      }
    }).should.be.rejectedWith(/if/)
  })

  it('should work with jsreport syntax', async () => {
    const res = await jsreport.render({
      template: {
        content: '{#asset {{b}}}',
        engine: 'handlebars',
        recipe: 'html'
      },
      data: {
        b: 'foo'
      }
    })
    res.content.toString().should.be.eql('{#asset foo}')
  })

  it('should work with jsreport syntax in many places', async () => {
    const res = await jsreport.render({
      template: {
        content: `{{name2}} {#child @data.foo={{aHelper}}}<img src='{#image {{name2}}}'/>`,
        engine: 'handlebars',
        recipe: 'html',
        helpers: `function aHelper() { return 'a' }`
      },
      data: {
        name2: 'bar'
      }
    })
    res.content.toString().should.be.eql(`bar {#child @data.foo=a}<img src='{#image bar}'/>`)
  })

  it('should expose handlebars global object', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{foo}}',
        engine: 'handlebars',
        recipe: 'html',
        helpers: "function foo() { return handlebars.escapeExpression('a') }"
      }
    })

    res.content.toString().should.be.eql('a')
  })

  it('should expose Handlebars global object', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{foo}}',
        engine: 'handlebars',
        recipe: 'html',
        helpers: "function foo() { return Handlebars.escapeExpression('a') }"
      }
    })
    res.content.toString().should.be.eql('a')
  })

  it('should be able to call helper from helper', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{helperA}}',
        engine: 'handlebars',
        recipe: 'html',
        helpers: "function helperB() { return 'b' }; function helperA() { return Handlebars.helpers.helperB() }"
      }
    })
    res.content.toString().should.be.eql('b')
  })

  it('should be able to require same instance of handlebars', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{helperA}}',
        engine: 'handlebars',
        recipe: 'html',
        helpers: "function helperB() { return 'b' }; function helperA() { return require('handlebars').helpers.helperB() }"
      }
    })
    res.content.toString().should.be.eql('b')
  })

  it('should have proper context in -this- in helper', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{myHelper}}',
        engine: 'handlebars',
        recipe: 'html',
        helpers: 'function myHelper() { return this.propA }'
      },
      data: {
        propA: 'foo'
      }
    })
    res.content.toString().should.be.eql('foo')
  })

  it('should throw error with lineNumber information when handlebars syntax error', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: `empty line
      {{#if}}`,
      engine: 'handlebars',
      recipe: 'html',
      name: 'templateA'
    })

    try {
      await jsreport.render({
        template: {
          name: 'templateA'
        }
      })
    } catch (e) {
      e.lineNumber.should.be.eql(2)
      e.property.should.be.eql('content')
    }
  })

  it('should throw error with lineNumber information when helper errors', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: `{{a}}`,
      engine: 'handlebars',
      recipe: 'html',
      name: 'templateA',
      helpers: `function a() {
        throw new Error('My error')
      }`
    })

    try {
      await jsreport.render({
        template: {
          name: 'templateA'
        }
      })
    } catch (e) {
      e.lineNumber.should.be.eql(2)
      e.property.should.be.eql('helpers')
    }
  })
})
