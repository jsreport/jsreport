const JsReport = require('@jsreport/jsreport-core')
require('should')

describe('single executable', () => {
  function createReporter () {
    return JsReport()
      .use(require('../'))
      .use(require('@jsreport/jsreport-chrome-pdf')({
        launchOptions: {
          args: ['--no-sandbox']
        }
      }))
  }

  it('should add zip file', async function () {
    this.timeout(60000)

    let reporter = createReporter()

    let pathToZip

    reporter.compilation = {
      resource () {},
      resourceInTemp (name, path) {
        pathToZip = path
      }
    }

    await reporter.init()

    reporter = createReporter()

    reporter.execution = {
      resourceTempPath () {
        return pathToZip
      }
    }

    await reporter.init()

    const request = {
      template: { content: 'Foo', recipe: 'chrome-pdf', engine: 'none' }
    }

    const res = await reporter.render(request)
    res.content.toString().should.containEql('%PDF')
  })
})
