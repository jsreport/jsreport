require('should')
const JsReport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const jsreportClientDist = fs.readFileSync(path.join(__dirname, '../dist/jsreport.umd.js')).toString()
const puppeteer = require('puppeteer')
require('should')

describe('browser client', () => {
  let jsreport
  let browser
  let page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
    page.setContent(`<script>${jsreportClientDist}</script>`)
    await page.evaluate(async () => {
      jsreport.serverUrl = 'http://localhost:5488'
    })

    jsreport = JsReport().use(require('@jsreport/jsreport-express')()).use(require('@jsreport/jsreport-chrome-pdf')())
    await jsreport.init()
  })

  afterEach(async () => {
    await jsreport.close()
    await browser.close()
  })

  it('should render and expose async toString', async () => {
    const r = await page.evaluate(async () => {
      const res = await jsreport.render({
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'html'
        }
      })

      return res.toString()
    })
    r.should.be.eql('<h1>Hello world</h1>')
  })

  it('should render and expose async toBlob', async () => {
    const r = await page.evaluate(async () => {
      const res = await jsreport.render({
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'html'
        }
      })

      const blob = await res.toBlob()
      return blob.size
    })
    r.should.be.eql(Buffer.from('<h1>Hello world</h1>').length)
  })

  it('should render and expose download', async () => {
    await page.evaluate(async () => {
      const res = await jsreport.render({
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'html'
        }
      })

      await res.download()
    })
  })

  it('should render and expose toDataURI', async () => {
    const datauri = await page.evaluate(async () => {
      const res = await jsreport.render({
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'html'
        }
      })

      return res.toDataURI()
    })

    datauri.should.be.eql('data:text/html;base64,' + Buffer.from('<h1>Hello world</h1>').toString('base64'))
  })

  it('should expose openInWindow in render', async () => {
    await page.evaluate(async () => {
      const res = await jsreport.render({
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'chrome-pdf'
        }
      })

      await res.openInWindow()
    })
    const pages = await browser.pages()
    pages.length.should.be.eql(2)
  })

  it('should expose createClient', async () => {
    const r = await page.evaluate(async () => {
      return jsreport.createClient() != null
    })
    r.should.be.true()
  })

  it('should expose original response', async () => {
    const contentType = await page.evaluate(async () => {
      const res = await jsreport.render({
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'chrome-pdf'
        }
      })

      return res.response.headers.get('content-type')
    })
    contentType.should.be.eql('application/pdf')
  })

  it('should fail with proper error for bad request', async () => {
    const e = await page.evaluate(async () => {
      try {
        await jsreport.render({
          template: {
            content: '<h1>Hello world</h1>',
            engine: 'missing',
            recipe: 'html'
          }
        })
        throw new Error('should not reach this point')
      } catch (e) {
        return { ...e, message: e.message }
      }
    })

    e.status.should.be.eql(400)
    e.message.should.containEql('missing')
  })

  it('should return proper error when jsreport down', async () => {
    await jsreport.close()

    const e = await page.evaluate(async () => {
      try {
        await jsreport.render({
          template: {
            content: '<h1>Hello world</h1>',
            engine: 'none',
            recipe: 'chrome-pdf'
          }
        })
      } catch (e) {
        return { ...e, message: e.message }
      }
    })

    e.message.should.containEql('jsreport server')
  })

  it('should expose getTemplateByName', async () => {
    await jsreport.close()

    const e = await page.evaluate(async () => {
      try {
        await jsreport.render({
          template: {
            content: '<h1>Hello world</h1>',
            engine: 'none',
            recipe: 'chrome-pdf'
          }
        })
      } catch (e) {
        return { ...e, message: e.message }
      }
    })

    e.message.should.containEql('jsreport server')
  })

  it('should expose openInWindow', async () => {
    await page.evaluate(async () => {
      jsreport.openInWindow({ filename: 'test.pdf', title: 'mytitle' }, {
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'chrome-pdf'
        }
      })
    })
    const pages = await browser.pages()
    pages.length.should.be.eql(2)
  })

  it('should expose download', async () => {
    await page.evaluate(async () => {
      jsreport.download('test.pdf', {
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'chrome-pdf'
        }
      })
    })
    const pages = await browser.pages()
    pages.length.should.be.eql(2)
  })
})

describe('browser client with auth', () => {
  let jsreport
  let browser
  let page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
    page.setContent(`<script>${jsreportClientDist}</script>`)
    await page.evaluate(async () => {
      jsreport.serverUrl = 'http://localhost:5488'
    })

    jsreport = JsReport().use(require('@jsreport/jsreport-authentication')({
      admin: {
        username: 'admin',
        password: 'password'
      },
      cookieSession: {
        secret: 'xxxx'
      }
    })).use(require('@jsreport/jsreport-express')())
    await jsreport.init()
  })

  afterEach(async () => {
    await jsreport.close()
    await browser.close()
  })

  it('should render and expose async toString', async () => {
    const r = await page.evaluate(async () => {
      jsreport.headers.Authorization = 'Basic ' + btoa('admin:password')
      const res = await jsreport.render({
        template: {
          content: '<h1>Hello world</h1>',
          engine: 'none',
          recipe: 'html'
        }
      })

      return res.toString()
    })

    r.should.be.eql('<h1>Hello world</h1>')
  })

  it('should fail without proper auth headers', async () => {
    const e = await page.evaluate(async () => {
      try {
        await jsreport.render({
          template: {
            content: '<h1>Hello world</h1>',
            engine: 'missing',
            recipe: 'html'
          }
        })
        throw new Error('should not reach this point')
      } catch (e) {
        return { ...e, message: e.message }
      }
    })

    e.statusText.should.containEql('Unauthorized')
    e.status.should.be.eql(401)
    e.message.should.containEql('Unauthorized')
  })
})
