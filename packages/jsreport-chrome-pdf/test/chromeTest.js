process.env.debug = 'jsreport'
const path = require('path')
const fs = require('fs')
const JsReport = require('@jsreport/jsreport-core')
const should = require('should')
const parsePdf = require('parse-pdf')
const psList = require('ps-list')

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
})

function common (strategy, imageExecution) {
  let reporter
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(() => {
    reporter = JsReport()

    reporter.use(require('@jsreport/jsreport-handlebars')())

    reporter.use(require('../')({
      strategy,
      numberOfWorkers: 2,
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

  it('should block file requests', async () => {
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
    JSON.stringify(res.meta.logs).should.containEql('ERR_ACCESS_DENIED')
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
    JSON.stringify(res.meta.logs).should.containEql('ERR_ACCESS_DENIED')
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
        chrome: {
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

  it('should handle page.on(error) and reject', (done) => {
    process.on('unhandledRejection', () => done(new Error('Rejection should be handled!')))

    reporter.render({
      template: {
        content: 'content',
        recipe,
        [imageExecution ? 'chromeImage' : 'chrome']: { url: 'chrome://crash' },
        engine: 'none'
      }
    }).catch(() => done())
  })
}

function commonTimeout (strategy, imageExecution) {
  let reporter
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(() => {
    reporter = JsReport({
      reportTimeout: 2000
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
    const processesBefore = await psList()
    const chromeCountBefore = processesBefore.filter(p => p.name.includes('chrome')).length
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

    await reporter.render(request).should.be.rejectedWith(/chrome.*generation/)

    if (strategy !== 'chrome-pool') {
      const processesAfter = await psList()
      const chromeCountAfter = processesAfter.filter(p => p.name.includes('chrome')).length

      chromeCountBefore.should.be.eql(chromeCountAfter)
    }
  })
}

function commonLocalFilesAllowed (strategy, imageExecution) {
  let reporter
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(async () => {
    reporter = JsReport({
      allowLocalFilesAccess: true
    })
    reporter.use(require('../')({
      strategy,
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

  it('should allow access to local files when allowLocalFilesAccess', async () => {
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

  it('should allow access to local files with file protocol when allowLocalFilesAccess', async () => {
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
