const jsreport = require('jsreport-core')
require('should')

describe('azure storage', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      blobStorage: {
        provider: 'azure-storage'
      }
    })
    return reporter.use(require('../')({
      connectionString: 'UseDevelopmentStorage=true'
    })).init()
  })

  afterEach(() => reporter.close())

  jsreport.tests.blobStorage()(() => reporter.blobStorage)
})
