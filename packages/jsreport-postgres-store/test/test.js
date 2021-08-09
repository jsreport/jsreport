require('should')
process.env.DEBUG = 'jsreport'
const jsreport = require('@jsreport/jsreport-core')

describe('common store tests', () => {
  let reporter

  async function createReporter () {
    const instance = jsreport({
      store: { provider: 'postgres' }
    }).use(require('../')({
      host: 'localhost',
      port: 5432,
      database: 'jsreport',
      user: 'jsreport',
      password: 'foo'
    })).use(() => {
      instance.documentStore.registerEntityType('InstanceCustomType', {
        name: { type: 'Edm.String' },
        score: { type: 'Edm.Decimal' }
      })

      instance.documentStore.registerEntitySet('testingInstances', {
        entityType: 'jsreport.InstanceCustomType',
        splitIntoDirectories: true
      })

      jsreport.tests.documentStore().init(() => instance.documentStore)
    })

    await instance.init()

    return instance
  }

  beforeEach(async () => {
    reporter = await createReporter()
    await reporter.documentStore.drop()
    await reporter.blobStorage.drop()
    await reporter.close()

    reporter = await createReporter()
    await jsreport.tests.documentStore().clean(() => reporter.documentStore)
  })

  afterEach(() => reporter && reporter.close())

  jsreport.tests.documentStore()(() => reporter.documentStore)
  jsreport.tests.blobStorage()(() => reporter.blobStorage)

  it('should correctly parse decimal type from db', async () => {
    await reporter.documentStore.collection('testingInstances').insert({
      name: 'test',
      score: 1.5
    })

    const entity = await reporter.documentStore.collection('testingInstances').findOne({
      name: 'test'
    })

    entity.score.should.be.eql(1.5)
  })

  it('should persist blobs', async () => {
    await reporter.blobStorage.write('myblob.txt', Buffer.from('hello'))
    const blob = await reporter.blobStorage.read('myblob.txt')
    blob.toString().should.be.eql('hello')

    const res = await reporter.documentStore.provider.db.query('SELECT blobName, content from jsreport_Blob')
    res.should.have.length(1)
  })
})
