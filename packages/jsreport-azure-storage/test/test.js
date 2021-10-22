const jsreport = require('@jsreport/jsreport-core')
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

  afterEach(() => reporter && reporter.close())

  jsreport.tests.blobStorage()(() => reporter.blobStorage)
})
