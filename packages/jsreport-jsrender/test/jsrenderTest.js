require('should')
const JsReport = require('@jsreport/jsreport-core')

describe('jsrender', () => {
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
        engine: 'jsrender',
        recipe: 'html'
      }
    })
    res.content.toString().should.be.eql('Hey')
  })

  it('should be able to use helpers', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{>~a()}}',
        engine: 'jsrender',
        recipe: 'html',
        helpers: 'function a() { return "Hey" }'
      }
    })
    res.content.toString().should.be.eql('Hey')
  })

  it('should be able to use data', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{:a}}',
        engine: 'jsrender',
        recipe: 'html'
      },
      data: {
        a: 'Hey'
      }
    })
    res.content.toString().should.be.eql('Hey')
  })

  it('should throw when missing helper', async () => {
    return jsreport.render({
      template: {
        content: '{{:~missing()}}',
        engine: 'jsrender',
        recipe: 'html'
      }
    }).should.be.rejected()
  })

  it('should throw when syntax error', async () => {
    return jsreport.render({
      template: {
        content: '{{if}}',
        engine: 'jsrender',
        recipe: 'html'
      }
    }).should.be.rejectedWith(/if/)
  })

  it('should throw when use constr expression', async () => {
    return jsreport.render({
      template: {
        content: '{{:#tmpl.constructor("var foo=3;")()}}',
        engine: 'jsrender',
        recipe: 'html'
      }
    }).should.be.rejected()
  })

  it('should be able to parse and use sub templates', async () => {
    const childTemplate = '<script id="inner" type="text/x-jsrender">{{:#data}}</script>'
    const template = '{{for items tmpl="inner"}}{{/for}}'
    const res = await jsreport.render({
      template: {
        content: childTemplate + template,
        engine: 'jsrender',
        recipe: 'html'
      },
      data: {
        items: [1, 2, 3]
      }
    })
    res.content.toString().should.be.eql('123')
  })

  it('should be able to parse and use multiple sub templates', async () => {
    const childTemplate = '<script id="inner" type="text/x-jsrender">{{:#data}}</script>\n<script id="inner2" type="text/x-jsrender">a{{:#data}}</script>'
    const template = '{{for items tmpl="inner"}}{{/for}}{{for items tmpl="inner2"}}{{/for}}'
    const res = await jsreport.render({
      template: {
        content: childTemplate + template,
        engine: 'jsrender',
        recipe: 'html'
      },
      data: {
        items: [1, 2, 3]
      }
    })
    res.content.toString().should.be.eql('\n123a1a2a3')
  })

  it('should be able to use custom tag', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{customTag}}{{:a}}{{/customTag}}',
        engine: 'jsrender',
        recipe: 'html',
        helpers: `
          function customTag() {
            return this.tagCtx.render(this.tagCtx.view.data)
          }
        `
      },
      data: {
        a: 'Hey'
      }
    })
    res.content.toString().should.be.eql('Hey')
  })

  it('should be able to use custom tag inside for loop', async () => {
    const res = await jsreport.render({
      template: {
        content: '{{for people}}{{customTag}}{{:name}}{{/customTag}}{{/for}}',
        engine: 'jsrender',
        recipe: 'html',
        helpers: `
          function customTag() {
            return this.tagCtx.render(this.tagCtx.view.data)
          }
        `
      },
      data: { people: [{ name: 'Jan' }] }
    })
    res.content.toString().should.be.eql('Jan')
  })
})
