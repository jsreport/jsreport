const should = require('should')
const jsreport = require('@jsreport/jsreport-core')

const RUN_TRANSACTIONS_TESTS = process.env.RUN_TRANSACTIONS_TESTS != null

describe('mongodb store', () => {
  common()
})

describe('mongodb store prefix', () => {
  common(true)
})

function common (prefix) {
  let reporter

  beforeEach(async () => {
    reporter = jsreport({ store: { provider: 'mongodb' } })

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

    if (prefix) {
      extOptions.prefix = 'jsreport_'
    }

    reporter.use(require('../')(extOptions))

    reporter.use(() => {
      reporter.documentStore.registerEntityType('TestType', {
        _id: { type: 'Edm.String', key: true },
        name: { type: 'Edm.String', key: true },
        content: { type: 'Edm.Binary', document: { extension: 'html', content: true } }
      })

      reporter.documentStore.registerEntitySet('testing', { entityType: 'jsreport.TestType' })

      jsreport.tests.documentStore().init(() => reporter.documentStore)
    })

    await reporter.init()

    await jsreport.tests.documentStore().clean(() => reporter.documentStore)
  })

  afterEach(() => reporter && reporter.close())

  if (prefix) {
    it('collections should have prefix', async () => {
      await reporter.documentStore.collection('testing').insert({
        name: 'foo'
      })

      const collections = await reporter.documentStore.provider.db.collections()
      const found = collections.find((c) => c.collectionName.startsWith('jsreport_testing'))

      should(found != null).be.eql(true)
    })
  } else {
    it('should return true node buffers', async () => {
      await reporter.documentStore.collection('testing').insert({
        name: 'foo',
        content: Buffer.from('foo')
      })

      const doc = await reporter.documentStore.collection('testing').findOne({ name: 'foo' })
      Buffer.isBuffer(doc.content).should.be.true()
    })

    it('should return string instead of ObjectId from insert', async () => {
      const doc = await reporter.documentStore.collection('testing').insert({
        name: 'foo',
        content: Buffer.from('foo')
      })

      doc._id.should.have.type('string')
    })

    it('should remove entity by _id', async () => {
      const doc = await reporter.documentStore.collection('testing').insert({
        name: 'foo'
      })

      await reporter.documentStore.collection('testing').remove({ _id: doc._id })
      const loadedDoc = await reporter.documentStore.collection('testing').findOne({ name: 'foo' })
      should(loadedDoc).not.be.ok()
    })

    jsreport.tests.documentStore()(() => reporter.documentStore, RUN_TRANSACTIONS_TESTS)
  }
}
