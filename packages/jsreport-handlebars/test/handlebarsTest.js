require('should')
const JsReport = require('@jsreport/jsreport-core')

describe('handlebars', () => {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport({
      reportTimeout: 99999999
    })
    jsreport.use(require('../')())
    return jsreport.init()
  })

  afterEach(() => jsreport.close())

  describe('sync', () => test({ asyncHandlebars: false }))
  describe('async', () => test({ asyncHandlebars: true }))

  function test (context) {
    it('should render html', async () => {
      const res = await jsreport.render({
        template: {
          content: 'Hey',
          engine: 'handlebars',
          recipe: 'html'
        },
        context
      })
      res.content.toString().should.be.eql('Hey')
    })

    it('should be able to use helpers', async () => {
      const res = await jsreport.render({
        template: {
          content: '{{{a}}}',
          engine: 'handlebars',
          recipe: 'html',
          helpers: 'function a() { return "Hey" }'
        },
        context
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
        },
        context
      })
      res.content.toString().should.be.eql('Hey')
    })

    it('should throw when syntax error', async () => {
      return jsreport.render({
        template: {
          content: '{{#if}}',
          engine: 'handlebars',
          recipe: 'html'
        },
        context
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
        },
        context
      })
      res.content.toString().should.be.eql('{#asset foo}')
    })

    it('should work with jsreport syntax in many places', async () => {
      const res = await jsreport.render({
        template: {
          content: '{{name2}} {#child @data.foo={{aHelper}}}<img src="{#image {{name2}}}"/>',
          engine: 'handlebars',
          recipe: 'html',
          helpers: 'function aHelper() { return "a" }'
        },
        data: {
          name2: 'bar'
        },
        context
      })
      res.content.toString().should.be.eql('bar {#child @data.foo=a}<img src="{#image bar}"/>')
    })

    it('should expose handlebars global object', async () => {
      const res = await jsreport.render({
        template: {
          content: '{{foo}}',
          engine: 'handlebars',
          recipe: 'html',
          helpers: "function foo() { return handlebars.escapeExpression('a') }"
        },
        context
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
        },
        context
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
        },
        context
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
        },
        context
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
        },
        context
      })
      res.content.toString().should.be.eql('foo')
    })

    it('should access data in parent scope using ../ ', async () => {
      const res = await jsreport.render({
        template: {
          content: '{{#with propA}}{{../rootProp}}{{/with}}',
          engine: 'handlebars',
          recipe: 'html'
        },
        data: {
          rootProp: 'xxx',
          propA: {}
        },
        context
      })
      res.content.toString().should.be.eql('xxx')
    })

    it('should support async hack back compatible options.fn', async () => {
      const res = await jsreport.render({
        template: {
          content: '{{#helperA items}}{{#helperB this}}{{helperC this}}{{/helperB}}{{/helperA}}',
          engine: 'handlebars',
          recipe: 'html',
          helpers: `
          function helperA(items, options) {
            const r = items.map(item => options.fn(item)).join('')
            console.log(r)
            return r
          }
          function helperB(item, options) {
            return Promise.resolve(options.fn(item))
          }
          async function helperC(item, options) {
            return item
          }
          `
        },
        data: {
          items: [1, 2, 3]
        },
        context
      })
      res.content.toString().should.be.eql('123')
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
          },
          context
        })
      } catch (e) {
        e.lineNumber.should.be.eql(2)
        e.property.should.be.eql('content')
      }
    })

    it('should throw error with lineNumber information when helper errors', async () => {
      await jsreport.documentStore.collection('templates').insert({
        content: '{{a}}',
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
          },
          context
        })
      } catch (e) {
        e.lineNumber.should.be.eql(2)
        e.property.should.be.eql('helpers')
      }
    })
  }

  it('should support req.context.asyncHandlebars to work trully async', async () => {
    const r = await jsreport.render({
      template: {
        engine: 'handlebars',
        recipe: 'html',
        content: `
          {{helperA}}
          {{helperA}}
          {{helperA}}
          {{result}}
        `,
        helpers: `
        let counter = 0
        function helperA() {
          return new Promise((resolve) => setTimeout(() => {
            counter++
            resolve('')
          }, 100))
        }
        function result() {
          return counter
        }
        `
      },
      context: { asyncHandlebars: true }
    })
    r.content.toString().trim().should.be.eql('3')
  })

  it('async support should still be backcompatible when options.fn isnt awaited', async () => {
    const r = await jsreport.render({
      template: {
        engine: 'handlebars',
        recipe: 'html',
        content: `
          {{#helperA}}hello {{/helperA}}       
        `,
        helpers: `
        function helperA(options) {
          return options.fn('hello') + "world"
        }
        `
      },
      context: { asyncHandlebars: true }
    })
    r.content.toString().trim().should.be.eql('hello world')
  })

  it('async each should await all entries', async () => {
    const r = await jsreport.render({
      template: {
        engine: 'handlebars',
        recipe: 'html',
        content: `
        {{#each items}}
          {{#helperA}}{{this}}{{/helperA}}
        {{/each}}   
        {{result}}    
        `,
        helpers: `
        let counter = 0
        function helperA() {
          return new Promise((resolve) => setTimeout(() => {
            counter++
            resolve('')
          }, 100))
        }
        function result() {
          return counter
        }
        `
      },
      data: {
        items: [1, 2, 3]
      },
      context: { asyncHandlebars: true }
    })
    r.content.toString().trim().should.be.eql('3')
  })
})
