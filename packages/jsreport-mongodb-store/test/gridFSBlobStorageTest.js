require('should')
const jsreport = require('@jsreport/jsreport-core')

const RUN_TRANSACTIONS_TESTS = process.env.RUN_TRANSACTIONS_TESTS != null

describe('mongodb blob storage', () => {
  let reporter

  beforeEach(async () => {
    reporter = jsreport({
      store: {
        provider: 'mongodb'
      },
      blobStorage: {
        provider: 'mongodb'
      }
    })

    const localOpts = {
      address: '127.0.0.1',
      port: 27017,
      databaseName: 'test'
    }

    const replicaOpts = {
      address: ['127.0.0.1'],
      port: [27017],
      databaseName: 'test',
      replicaSet: 'rs'
    }

    const extOptions = RUN_TRANSACTIONS_TESTS ? replicaOpts : localOpts

    reporter.use(require('../')(extOptions))

    await reporter.init()
    return reporter.documentStore.drop()
  })

  afterEach(() => reporter && reporter.close())

  jsreport.tests.blobStorage()(() => reporter.blobStorage)
})
