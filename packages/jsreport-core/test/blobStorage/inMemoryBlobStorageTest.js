const common = require('./common.js')
const core = require('../../index')

describe('inMemoryBlobStorage', () => {
  let reporter

  beforeEach(async () => {
    reporter = core({ discover: false, blobStorage: { provider: 'memory' } })
    await reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  common(() => reporter.blobStorage)
})
