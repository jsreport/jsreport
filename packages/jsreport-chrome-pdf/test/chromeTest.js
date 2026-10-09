process.env.debug = 'jsreport'
const path = require('path')
const { pathToFileURL } = require('url')
const fs = require('fs')
const JsReport = require('@jsreport/jsreport-core')
const should = require('should')
const parsePdf = require('parse-pdf')
const http = require('http')
const puppeteer = require('puppeteer')

describe('chrome pdf', () => {
  describe('dedicated-process strategy', () => {
    common('dedicated-process')
    commonLocalFilesAllowed('dedicated-process', false)

    describe('chrome pdf with small timeout', () => {
      commonTimeout('dedicated-process')
    })
  })

  describe('chrome-pool strategy', () => {
    common('chrome-pool')
    commonLocalFilesAllowed('chrome-pool', false)

    describe('chrome pdf with small timeout', () => {
      commonTimeout('chrome-pool')
    })
  })

  describe('connect strategy', () => {
    let browser
    beforeEach(async () => {
      browser = await puppeteer.launch({
        args: ['--no-sandbox']
      })
    })

    afterEach(async () => {
      if (browser) {
        await browser.close()
      }
    })

    common('connect', false, () => ({ browserWSEndpoint: browser.wsEndpoint() }))
    commonLocalFilesAllowed('connect', false, () => ({ browserWSEndpoint: browser.wsEndpoint() }))
  })
})

describe('chrome image', () => {
  describe('dedicated-process strategy', () => {
    common('dedicated-process', true)
    commonLocalFilesAllowed('dedicated-process', true)

    describe('chrome pdf with small timeout', () => {
      commonTimeout('dedicated-process', true)
    })
  })

  describe('chrome-pool strategy', () => {
    common('chrome-pool', true)
    commonLocalFilesAllowed('chrome-pool', true)

    describe('chrome pdf with small timeout', () => {
      commonTimeout('chrome-pool', true)
    })
  })
  describe('connect strategy', () => {
    let browser
    beforeEach(async () => {
      browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    })

    afterEach(async () => {
      if (browser) await browser.close()
    })

    common('connect', true, () => ({ browserWSEndpoint: browser.wsEndpoint() }))
    commonLocalFilesAllowed('connect', true, () => ({ browserWSEndpoint: browser.wsEndpoint() }))
  })
})

function common (strategy, imageExecution, connectOptions = () => ({})) {
  let reporter
  let resourceServer
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(() => {
    reporter = JsReport()

    reporter.use(require('@jsreport/jsreport-handlebars')())

    reporter.use(require('../')({
      strategy,
      numberOfWorkers: 1,
      launchOptions: {
        args: ['--no-sandbox']
      },
      connectOptions: connectOptions()
    }))

    resourceServer = http.createServer((req, res) => setTimeout(() => {
      res.end('ok')
    }, 100)).listen(8080)

    return reporter.init()
  })

  afterEach(async () => {
    if (resourceServer) {
      resourceServer.close()
    }

    if (reporter) {
      await reporter.close()
    }
  })

  it('should reject non-HTTP URLs when trustUserCode is disabled', async () => {
    for (const url of [pathToFileURL(__filename).href, 'data:text/html,x', 'javascript:alert(1)', 'chrome://crash']) {
      await reporter.render({
        template: {
          content: 'x',
          recipe,
          engine: 'none',
          [imageExecution ? 'chromeImage' : 'chrome']: { url }
        }
      }).should.be.rejectedWith(/Only HTTP and HTTPS/)
    }
  })

  it('should render using a local HTTP URL when trustUserCode is disabled', async () => {
    const res = await reporter.render({
      template: {
        content: 'x',
        recipe,
        engine: 'none',
        [imageExecution ? 'chromeImage' : 'chrome']: { url: 'http://127.0.0.1:8080' }
      }
    })
    res.content.length.should.be.above(0)
    if (!imageExecution) {
      const pdf = await parsePdf(res.content)
      pdf.pages[0].text.should.containEql('ok')
    }
  })

  it('should block file requests', async () => {
    const request = {
      template: {
        content: `
          <script>
            document.write(window.location='file:///${__filename.replace(/\\/g, '/')}')
          </script>
          `,
        recipe,
        engine: 'none'
      }
    }

    const res = await reporter.render(request)
    const str = JSON.stringify(res.meta.logs)
    const ok = str.includes('ERR_ACCESS_DENIED') || str.includes('Not allowed to load local resource')
    if (ok === false) {
      console.log(str)
      throw new Error(str)
    }
  })

  it('should block file requests with file protocol', async () => {
    const request = {
      template: {
        content: `
          <script>
            document.write(window.location='file:///${__filename.replace(/\\/g, '/')}')
          </script>
          `,
        recipe,
        engine: 'none'
      }
    }

    const res = await reporter.render(request)
    const str = JSON.stringify(res.meta.logs);
    (str.includes('ERR_ACCESS_DENIED') || str.includes('Not allowed to load local resource')).should.be.true()
  })

  it('should not fail when rendering', async () => {
    const request = {
      template: { content: 'Foo', recipe, engine: 'none' }
    }

    const res = await reporter.render(request)

    if (!imageExecution) {
      res.content.toString().should.containEql('%PDF')
    } else {
      res.meta.contentType.startsWith('image').should.be.True()
    }
  })

  it('not fail when rendering multiple times', async () => {
    const request = {
      template: { content: 'Foo', recipe, engine: 'none' }
    }

    const op = []

    op.push(reporter.render(request))
    op.push(reporter.render(request))
    op.push(reporter.render(request))
    op.push(reporter.render(request))
    op.push(reporter.render(request))

    await Promise.all(op)
  })

  if (!imageExecution) {
    it('should not fail when rendering header', async () => {
      const request = {
        template: { content: 'Heyx', recipe, engine: 'none', chrome: { header: 'Foo' } }
      }

      const res = await reporter.render(request)
      res.content.toString().should.containEql('%PDF')
    })

    it('should render headerTemplate', async () => {
      const request = {
        template: { content: 'content', recipe, engine: 'none', chrome: { headerTemplate: 'foo' } },
        options: { debug: { logsToResponseHeader: true } }
      }

      const res = await reporter.render(request)
      JSON.stringify(res.meta.logs).should.match(/Executing recipe html/)
    })

    it('should render footerTemplate', async () => {
      const request = {
        template: { content: 'content', recipe, engine: 'none', chrome: { footerTemplate: 'foo' } },
        options: { debug: { logsToResponseHeader: true } }
      }

      const res = await reporter.render(request)
      JSON.stringify(res.meta.logs).should.match(/Executing recipe html/)
    })

    it('should render header/footer with helpers', async () => {
      const request = {
        template: {
          content: 'content',
          recipe,
          engine: 'handlebars',
          chrome: { displayHeaderFooter: true, marginTop: '80px', marginBottom: '80px', headerTemplate: '{{printNumber 1}}<br/>', footerTemplate: '{{printNumber 2}}<br/>' },
          helpers: 'function printNumber (num) { return num  }'
        }
      }

      const res = await reporter.render(request)
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.containEql('1')
      parsed.pages[0].text.should.containEql('2')
    })

    it('should work with scale option', async () => {
      const request = {
        template: {
          content: 'content',
          recipe,
          engine: 'handlebars',
          chrome: {
            scale: '2.0'
          }
        }
      }

      const res = await reporter.render(request)
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.containEql('content')
    })
  }

  it('should provide logs', async () => {
    const request = {
      template: { content: 'Heyx <script>console.log("hello world")</script>', recipe, engine: 'none' },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.match(/hello world/)
  })

  it('should provide logs when script error', async () => {
    const request = {
      template: { content: 'Heyx <script>throw new Error("intentional script error")</script>', recipe, engine: 'none' },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.match(/intentional script error/)
  })

  it('should provide logs about http resources', async () => {
    const request = {
      template: { content: 'Hey <img src="https://jsreport.net/img/js-logo.png" />', recipe, engine: 'none' },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)

    JSON.stringify(res.meta.logs).should.match(/Page request: GET \(image\)/)
    JSON.stringify(res.meta.logs).should.match(/Page request finished: GET \(image\) 200/)
  })

  it('should provide logs for js objects', async () => {
    const objStr = JSON.stringify({ foo: 'bar', x: { a: true } })

    const request = {
      template: { content: `Hey <script>console.log(${objStr})</script>`, recipe, engine: 'none' },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)

    res.meta.logs.should.matchAny((log) => {
      log.message.should.be.containEql(objStr)
    })
  })

  it('should trim logs for longs base64 encoded images', async () => {
    let img = 'start'

    for (let i = 0; i < 40000; i++) {
      img += 'fooooooooo'
    }

    const request = {
      template: {
        content: `<img src="data:image/png;base64,${img}" />`,
        recipe,
        engine: 'none'
      },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)

    const log = res.meta.logs.find((item) => item.message.startsWith('Page request: GET (image) data:image/png;base64,start'))

    should(log).be.not.undefined()
    log.message.endsWith('...').should.be.eql(true)
  })

  it('should merge chrome options from page\'s javascript', async () => {
    const request = {
      template: {
        content: `
          content
          <script>
            ${imageExecution
              ? `
                  window.JSREPORT_CHROME_IMAGE_OPTIONS = {
                    type: 'jpeg'
                  }
                `
              : `
                  window.JSREPORT_CHROME_PDF_OPTIONS = {
                    displayHeaderFooter: true,
                    marginTop: '80px',
                    headerTemplate: '{{foo}}'
                  }
                `
            }
          </script>
        `,
        recipe,
        engine: 'handlebars'
      },
      data: {
        foo: '1'
      }
    }

    const res = await reporter.render(request)

    if (imageExecution) {
      res.meta.contentType.should.be.eql('image/jpeg')
    } else {
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.containEql('content')
      parsed.pages[0].text.should.containEql('1')
    }
  })

  it('should avoid merging sensitive options from page\'s javascript', async () => {
    const distPath = path.join(__dirname, '../testReport.pdf')

    const request = {
      template: {
        content: `
          content
          <script>
            ${imageExecution
              ? `
                  window.JSREPORT_CHROME_IMAGE_OPTIONS = {
                    path: '${distPath}'
                  }
                `
              : `
                  window.JSREPORT_CHROME_PDF_OPTIONS = {
                    path: '${distPath}',
                    displayHeaderFooter: true,
                    marginTop: '80px',
                    headerTemplate: '{{foo}}'
                  }
                `
            }
          </script>
        `,
        recipe,
        engine: 'handlebars'
      },
      data: {
        foo: '1'
      }
    }

    const res = await reporter.render(request)

    const exists = fs.existsSync(distPath)

    exists.should.be.False()

    if (!imageExecution) {
      const parsed = await parsePdf(res.content)
      parsed.pages[0].text.should.containEql('content')
      parsed.pages[0].text.should.containEql('1')
    } else {
      res.meta.contentType.startsWith('image').should.be.True()
    }
  })

  if (!imageExecution) {
    it('should default into media type print', async () => {
      const request = {
        template: {
          content: '<style>@media only print{ span { display: none } }</style>text<span>screen</span>',
          recipe,
          engine: 'none'
        }
      }

      const res = await reporter.render(request)
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.not.containEql('screen')
    })

    it('should propagate media type screen', async () => {
      const request = {
        template: {
          content: '<style>@media only screen{ span { display: none } }</style>text<span>print</span>',
          recipe,
          engine: 'none',
          chrome: {
            mediaType: 'screen'
          }
        }
      }

      const res = await reporter.render(request)
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.not.containEql('print')
    })

    it('should propagate media type print', async () => {
      const request = {
        template: {
          content: '<style>@media only print{ span { display: none } }</style>text<span>screen</span>',
          recipe,
          engine: 'none',
          chrome: {
            mediaType: 'print'
          }
        }
      }

      const res = await reporter.render(request)
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.not.containEql('screen')
    })
  }

  it('should render using url', async () => {
    const request = {
      template: {
        content: ' ',
        engine: 'none',
        recipe,
        [imageExecution ? 'chromeImage' : 'chrome']: {
          url: 'https://jsreport.net'
        }
      }
    }

    const res = await reporter.render(request)

    if (!imageExecution) {
      res.content.toString().should.containEql('%PDF')
    } else {
      res.meta.contentType.startsWith('image').should.be.True()
    }
  })

  it('should handle page.on(error) and reject in trusted mode', async () => {
    const trustedReporter = JsReport({ trustUserCode: true }).use(require('../')({
      strategy,
      launchOptions: { args: ['--no-sandbox'] },
      connectOptions: connectOptions()
    }))
    try {
      await trustedReporter.init()
      await trustedReporter.render({
        template: {
          content: 'content',
          recipe,
          [imageExecution ? 'chromeImage' : 'chrome']: { url: 'chrome://crash' },
          engine: 'none'
        }
      }).should.be.rejected()
    } finally {
      await trustedReporter.close()
    }
  })

  it('should inject jsreport api into browser page context', async () => {
    const request = {
      template: {
        content: `
          <h1 id='title'>jsreport api exists:</h1>
          <script>
            const titleEl = document.getElementById('title')
            titleEl.textContent += ' ' + (typeof window.jsreport !== 'undefined').toString()
          </script>
        `,
        recipe,
        engine: 'none'
      }
    }

    const res = await reporter.render(request)

    if (imageExecution) {
      res.meta.contentType.should.be.eql('image/png')
    } else {
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.containEql('jsreport api exists: true')
    }
  })

  it('should be able to log browser\'s jsreport api request object', async () => {
    const request = {
      template: {
        content: `
          Hello
          <script>
            async function main () {
              const req = await window.jsreport.getRequest()
              console.log(req)
            }

            main()
          </script>
        `,
        recipe,
        engine: 'none'
      }
    }

    const res = await reporter.render(request)

    res.meta.logs.should.matchAny((log) => {
      log.message.should.containEql('{"context":{"id":')
    })
  })

  it('should read request information using jsreport api from browser page context', async () => {
    const request = {
      template: {
        content: `
          <h1 id='context'>context:</h1>
          <h1 id='template'>template:</h1>
          <h1 id='data'>data:</h1>
          <h1 id='options'>options:</h1>
          <script>
            async function main () {
              const req = await window.jsreport.getRequest()

              const contextEl = document.getElementById('context')
              contextEl.textContent += ' ' + JSON.stringify({ id: req.context.id })

              const templateEl = document.getElementById('template')
              templateEl.textContent += ' ' + JSON.stringify({ recipe: req.template.recipe, engine: req.template.engine })

              const dataEl = document.getElementById('data')
              dataEl.textContent += ' ' + JSON.stringify({ foo: req.data.foo })

              const optionsEl = document.getElementById('options')
              optionsEl.textContent += ' ' + JSON.stringify(req.options)

              window.JSREPORT_READY_TO_START = true
            }

            main()
          </script>
        `,
        chrome: {
          waitForJS: true
        },
        recipe,
        engine: 'none'
      },
      data: {
        foo: 'bar'
      },
      options: {
        reportName: 'testing'
      }
    }

    const res = await reporter.render(request)

    if (imageExecution) {
      res.meta.contentType.should.be.eql('image/png')
    } else {
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.containEql('context: {"id":"')
      parsed.pages[0].text.should.containEql(`template: ${JSON.stringify({ recipe: request.template.recipe, engine: request.template.engine })}`)
      parsed.pages[0].text.should.containEql(`data: ${JSON.stringify({ foo: request.data.foo })}`)
      parsed.pages[0].text.should.containEql(`options: ${JSON.stringify(request.options)}`)
    }
  })

  it('should allow read partial request information using jsreport api from browser page context', async () => {
    const request = {
      context: {
        rootId: 'id'
      },
      template: {
        content: `
          <h1 id='debug'></h1>
          <script>
            async function main () {
              const id = await window.jsreport.getRequest('context.id')
              const recipe = await window.jsreport.getRequest('template.recipe')
              const foo = await window.jsreport.getRequest('data.foo')
              const reportName = await window.jsreport.getRequest('options.reportName')

              const debugEl = document.getElementById('debug')
              debugEl.textContent = JSON.stringify({ id, recipe, foo, reportName })

              window.JSREPORT_READY_TO_START = true
            }

            main()
          </script>
        `,
        chrome: {
          waitForJS: true
        },
        recipe,
        engine: 'none'
      },
      data: {
        foo: 'bar'
      },
      options: {
        reportName: 'testing'
      }
    }

    const res = await reporter.render(request)

    if (imageExecution) {
      res.meta.contentType.should.be.eql('image/png')
    } else {
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.containEql(`${JSON.stringify({
        id: request.context.rootId,
        recipe: request.template.recipe,
        foo: request.data.foo,
        reportName: request.options.reportName
      })}`)
    }
  })

  it('should timeout when timeout lower', async () => {
    const res = await reporter.render({
      template: {
        content: `
         <img src="{{chromeResourceWithTimeout 'http://localhost:${resourceServer.address().port}' 10}}" />
        `,
        recipe: 'chrome-pdf',
        engine: 'handlebars'
      }
    })
    res.meta.logs.find((log) => log.message.startsWith('Page request with timeout: GET (image) http://localhost:8080')).should.be.ok()
    res.meta.logs.find((log) => log.message.includes('the server responded with a status of 504')).should.be.ok()
  })

  it('should not timeout when timeout higher', async () => {
    const res = await reporter.render({
      template: {
        content: `
         <img src="{{chromeResourceWithTimeout 'http://localhost:${resourceServer.address().port}' 150}}" />
        `,
        recipe: 'chrome-pdf',
        engine: 'handlebars'
      }
    })

    res.meta.logs.find((log) => log.message.startsWith('Page request with timeout: GET (image) http://localhost:8080')).should.be.ok()
    res.meta.logs.find((log) => log.message.startsWith('Page request finished')).should.be.ok()
  })
}

function commonTimeout (strategy, imageExecution) {
  let reporter
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(() => {
    reporter = JsReport({
      reportTimeout: 2000,
      reportTimeoutMargin: '4s'
    })
    reporter.use(require('../')({
      strategy,
      launchOptions: {
        args: ['--no-sandbox']
      }
    }))

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should reject', async () => {
    const request = {
      template: {
        content: 'content',
        recipe,
        engine: 'none',
        chromeImage: {
          waitForJS: true
        },
        chrome: {
          waitForJS: true
        }
      }
    }

    try {
      await reporter.render(request)
      throw new Error('should have failed')
    } catch (e) {
      e.message.should.match(/chrome.*timed out/)
      e.weak.should.be.true()
      e.statusCode.should.be.eql(400)
    }
  })
}

function commonLocalFilesAllowed (strategy, imageExecution, connectOptions = () => ({})) {
  let reporter
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(async () => {
    reporter = JsReport({
      trustUserCode: true
    })
    reporter.use(require('../')({
      strategy,
      connectOptions: connectOptions(),
      launchOptions: {
        args: ['--no-sandbox']
      }
    }))

    return reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('should render using file and data URLs when trustUserCode is enabled', async () => {
    for (const url of [pathToFileURL(__filename).href, 'data:text/html,<h1>trusted</h1>']) {
      const res = await reporter.render({
        template: {
          content: 'x',
          recipe,
          engine: 'none',
          [imageExecution ? 'chromeImage' : 'chrome']: { url }
        }
      })
      res.content.length.should.be.above(0)
      if (!imageExecution) {
        const pdf = await parsePdf(res.content)
        pdf.pages.map(page => page.text).join(' ').should.containEql(url.startsWith('file:') ? 'process.env.debug' : 'trusted')
      }
    }
  })

  it('should allow access to local files when trustUserCode is enabled', async () => {
    const request = {
      template: {
        content: `
          <script>
            document.write(window.location='${__filename.replace(/\\/g, '/')}')
          </script>
          `,
        recipe,
        engine: 'none'
      }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.not.containEql('ERR_ACCESS_DENIED')
  })

  it('should allow access to local files with file protocol when trustUserCode is enabled', async () => {
    const request = {
      template: {
        content: `
          <script>
            document.write(window.location='file:///${__filename.replace(/\\/g, '/')}')
          </script>
          `,
        recipe,
        engine: 'none'
      }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.not.containEql('ERR_ACCESS_DENIED')
  })
}
