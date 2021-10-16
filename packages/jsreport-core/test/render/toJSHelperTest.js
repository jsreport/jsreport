require('should')
const core = require('../../index')

describe('toJS helper', () => {
  let reporter

  beforeEach(async () => {
    reporter = core()
    reporter.use({
      name: 'engine-testing',
      directory: __dirname,
      main: 'engineExtMain.js',
      worker: 'engineExtWorker.js'
    })
    await reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('should expose toJS helper', async () => {
    const res = await reporter.render({
      template: {
        engine: 'helpers',
        content: 'foo',
        recipe: 'html',
        helpers: `function a(helpers) { 
            return helpers.toJS({
                "a": "foo"
            })
        }`
      }
    })
    /* eslint-disable no-eval */
    eval(res.content.toString()).a.should.be.eql('foo')
  })
})
