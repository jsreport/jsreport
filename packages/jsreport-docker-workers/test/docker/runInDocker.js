const jsreport = require('@jsreport/jsreport-core')
const should = require('should')

describe.skip('run in docker', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({ trustUserCode: true })
      .use(require('../..')({
        numberOfWorkers: 1,
        container: {
          image: 'jsreport/worker:local'
        }
      }))
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-express')())

    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should render', async () => {
    const res = await reporter.render({
      template: {
        recipe: 'html',
        engine: 'handlebars',
        content: 'hello world {{paths}} {{relativeRequireWorks}}',
        helpers: `
          function paths () {
            return [__rootDirectory, __appDirectory, __parentModuleDirectory].join(',')
          }

          function relativeRequireWorks () {
            let works = false
            try {
              const pkg = require('./lib/workerRequest.js')
              works = typeof pkg === 'function'
            } catch (err) {}

            return works
          }
        `
      }
    })

    const output = res.content.toString()

    should(output).be.eql('hello world /app,/app,/app true')
  })
})
