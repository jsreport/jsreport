require('should')
const core = require('../../index')

describe('moduleHelper test', () => {
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

  it('should embed the module dist', async () => {
    const res = await reporter.render({
      template: {
        engine: 'helpers',
        content: 'foo',
        recipe: 'html',
        helpers: `function a(helpers) { 
            return helpers.module('lodash.omit')
        }`
      }
    })
    res.content.toString().should.containEql('lodash')
  })
})
