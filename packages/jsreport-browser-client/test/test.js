const JsReport = require('@jsreport/jsreport-core')
const puppeteer = require('puppeteer')
require('should')

describe('browser client', () => {
  let jsreport
  let browser
  let page
  beforeEach(async () => {
    jsreport = await JsReport()
      .use(require('@jsreport/jsreport-express')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('../')())
      .init()

    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(async () => {
    if (jsreport) {
      await jsreport.close()
    }

    await browser.close()
  })

  it('should expose html-with-browser-client recipe', async () => {
    const report = await jsreport.render({
      template: {
        content: '<html><body></body></html>',
        engine: 'none',
        recipe: 'html-with-browser-client'
      },
      context: {
        http: {
          baseUrl: 'http://localhost:5488'
        }
      }
    })

    await page.setContent(report.content.toString())
    const r = await page.evaluate(async () => {
      const res = await jsreport.render({ template: { content: '<h1>hello</h1>', engine: 'none', recipe: 'html' } })
      return res.toString()
    })
    r.should.be.eql('<h1>hello</h1>')
  })

  it('html-with-browser-client should throw 400 status when baseURL not provided', async () => {
    try {
      await jsreport.render({
        template: {
          content: '<html><body></body></html>',
          engine: 'none',
          recipe: 'html-with-browser-client'
        }
      })
      throw new Error('should throw')
    } catch (e) {
      e.statusCode.should.be.eql(400)
      e.message.should.containEql('html-with-browser-client requires context.http.baseUrl to be set')
    }
  })

  it('should expose {{browserClientLink}}', async () => {
    const report = await jsreport.render({
      template: {
        content: '<html><body><script src={{browserClientLink}}></script></body></html>',
        engine: 'handlebars',
        recipe: 'html'
      },
      context: {
        http: {
          baseUrl: 'http://localhost:5488'
        }
      }
    })

    await page.setContent(report.content.toString())
    const r = await page.evaluate(async () => {
      const res = await jsreport.render({ template: { content: '<h1>hello</h1>', engine: 'none', recipe: 'html' } })
      return res.toString()
    })
    r.should.be.eql('<h1>hello</h1>')
  })

  it('{{browserClientLink}} should throw 400 status when baseURL not provided', async () => {
    try {
      await jsreport.render({
        template: {
          content: '<html><body><script src={{browserClientLink}}></script></body></html>',
          engine: 'handlebars',
          recipe: 'html'
        }
      })
      throw new Error('should throw')
    } catch (e) {
      e.statusCode.should.be.eql(400)
      e.message.should.containEql('browserClientLink requires context.http.baseUrl to be set')
    }
  })
})
