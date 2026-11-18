const DocumentStore = require('@jsreport/jsreport-core/lib/main/store/documentStore.js')
const SchemaValidator = require('@jsreport/jsreport-core/lib/main/schemaValidator')
const jsreport = require('@jsreport/jsreport-core')
const Request = require('@jsreport/jsreport-core/lib/shared/request')
const Provider = require('../lib/provider')
const path = require('path')
const fs = require('fs')
const sinon = require('sinon')
const fsPromises = require('fs').promises
const del = require('del')
const should = require('should')
const once = require('lodash.once')
const { serialize, parse } = require('../lib/customUtils')

const AssetType = {
  _id: { type: 'Edm.String', key: true },
  name: { type: 'Edm.String' },
  content: { type: 'Edm.Binary', document: { extension: 'html', content: true } },
  folder: { type: 'jsreport.FolderRefType' }
}

function createDefaultStore (label) {
  const validator = new SchemaValidator()

  const getLevelWithLabel = (level) => {
    return `${level}${label != null ? ` (${label})` : ''}`
  }

  const debugLoggerEnabled = process.env.STORE_LOGGER != null

  const store = DocumentStore(
    {
      logger: {
        info: (...args) => { debugLoggerEnabled && console.log(getLevelWithLabel('INFO'), ...args) },
        error: (...args) => { debugLoggerEnabled && console.error(getLevelWithLabel('ERROR'), ...args) },
        warn: (...args) => { debugLoggerEnabled && console.warn(getLevelWithLabel('WARN'), ...args) },
        debug: (...args) => { debugLoggerEnabled && console.log(getLevelWithLabel('DEBUG'), ...args) }
      },
      store: { transactions: {} }
    },
    validator
  )

  return store
}

describe('common core tests', () => {
  let reporter
  const tmpData = path.join(__dirname, 'tmpData')

  beforeEach(async () => {
    await del(tmpData)

    reporter = jsreport({
      store: { provider: 'fs' }
    }).use(require('../')({
      dataDirectory: tmpData
    })).use(() => {
      jsreport.tests.documentStore().init(() => reporter.documentStore)
    })

    await reporter.init()

    await jsreport.tests.documentStore().clean(() => reporter.documentStore)
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }

    await del(tmpData)
  })

  it('render should cause journal sync', () => {
    return new Promise((resolve) => {
      reporter.documentStore.provider.sync = () => resolve()
      reporter.render({
        template: {
          content: 'foo',
          engine: 'none',
          recipe: 'html'
        }
      })
    })
  })

  jsreport.tests.documentStore()(() => reporter.documentStore)
})

describe('provider', () => {
  let store
  const tmpData = path.join(__dirname, 'tmpData')
  const blobStorageDirectory = path.join(tmpData, 'blobs')
  let resolveFileExtension

  beforeEach(async () => {
    resolveFileExtension = () => null
    await del(tmpData)

    store = createDefaultStore()

    addCommonTypes(store)

    store.registerProvider(
      Provider({
        dataDirectory: tmpData,
        blobStorageDirectory,
        externalModificationsSync: true,
        persistence: { provider: 'fs', lock: { wait: 60000, stale: 5000, retries: 3, retryWait: 100 } },
        logger: store.options.logger,
        resolveFileExtension: store.resolveFileExtension.bind(store),
        createError: m => new Error(m)
      })
    )

    store.addFileExtensionResolver(() => resolveFileExtension())

    await store.init()

    fs.mkdirSync(blobStorageDirectory)
  })

  afterEach(async () => {
    await store.provider.close()
    await del(tmpData)
  })

  describe('basic', () => {
    it('remove should delete doc folder', async () => {
      await store.collection('templates').insert({ name: 'test' })
      fs.existsSync(path.join(tmpData, 'test')).should.be.true()
      await store.collection('templates').remove({ name: 'test' })
      fs.existsSync(path.join(tmpData, 'test')).should.be.false()
    })

    it('insert, update to a different name', async () => {
      await store.collection('templates').insert({ name: 'test' })
      await store.collection('templates').update({ name: 'test' }, { $set: { name: 'test2' } })
      const res = await store.collection('templates').find({ name: 'test2' })
      res.length.should.be.eql(1)
    })

    it('insert should use the _id from input', async () => {
      await store.collection('templates').insert({ name: 'test', _id: 'foo' })
      const res = await store.collection('templates').findOne({ name: 'test' })
      res._id.should.be.eql('foo')
    })

    it('find should exclude $entitySet from result', async () => {
      await store.collection('templates').insert({ name: 'test', _id: 'foo' })
      const res = await store.collection('templates').findOne({ name: 'test' })
      should(res.$entitySet).not.be.ok()
    })

    it('updating arrays', async () => {
      await store.collection('templates').insert({ name: 'test', _id: 'foo', scripts: [{ name: 'foo' }] })
      await store.collection('templates').update({ name: 'test' }, { $set: { scripts: [] } })
      const template = JSON.parse(fs.readFileSync(path.join(tmpData, 'test', 'config.json')))
      template.scripts.should.have.length(0)
    })
  })

  describe('folders', () => {
    it('insert folder should create new directory on top', async () => {
      await store.collection('folders').insert({ name: 'test' })
      fs.existsSync(path.join(tmpData, 'test')).should.be.true()
    })

    it('insert folder and nested entity should create nested new directory', async () => {
      await store.collection('folders').insert({ name: 'test', shortid: 'test' })
      await store.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html', folder: { shortid: 'test' } })
      fs.existsSync(path.join(tmpData, 'test')).should.be.true()
      fs.existsSync(path.join(tmpData, 'test', 'foo')).should.be.true()
    })

    it('update folder name', async () => {
      await store.collection('folders').insert({ name: 'test', shortid: 'test' })
      await store.collection('folders').update({ name: 'test' }, { $set: { name: 'foo' } })
      fs.existsSync(path.join(tmpData, 'foo')).should.be.true()
      fs.existsSync(path.join(tmpData, 'test')).should.be.false()
    })

    it('deep nested folders and entities', async () => {
      await store.collection('folders').insert({ name: 'a', shortid: 'a' })
      await store.collection('folders').insert({ name: 'b', shortid: 'b', folder: { shortid: 'a' } })
      await store.collection('folders').insert({ name: 'c', shortid: 'c', folder: { shortid: 'b' } })
      await store.collection('templates').insert({ name: 'foo', shortid: 'foo', folder: { shortid: 'c' } })
      fs.existsSync(path.join(tmpData, 'a', 'b', 'c', 'foo')).should.be.true()
    })

    it('rename folder with entities', async () => {
      await store.collection('folders').insert({ name: 'a', shortid: 'a' })
      await store.collection('templates').insert({ name: 'c', shortid: 'c', folder: { shortid: 'a' } })
      await store.collection('folders').update({ name: 'a' }, { $set: { name: 'renamed' } })
      const template = JSON.parse(fs.readFileSync(path.join(tmpData, 'renamed', 'c', 'config.json')))
      template.name.should.be.eql('c')
    })

    it('should create config.json when creating new folders', async () => {
      await store.collection('folders').insert({ name: 'a', shortid: 'a' })
      fs.existsSync(path.join(tmpData, 'a', 'config.json')).should.be.true()
    })

    it('update folder name should not remove the nested entities', async () => {
      await store.collection('folders').insert({ name: 'test', shortid: 'test' })
      await store.collection('templates').insert({ name: 'tmpl', engine: 'none', recipe: 'html', folder: { shortid: 'test' } })
      await store.collection('folders').update({ name: 'test' }, { $set: { name: 'foo' } })
      fs.existsSync(path.join(tmpData, 'foo', 'tmpl')).should.be.true()
    })

    it('remove whole nested folder with entities', async () => {
      await store.collection('folders').insert({ name: 'a', shortid: 'a' })
      await store.collection('folders').insert({ name: 'b', shortid: 'b', folder: { shortid: 'a' } })
      await store.collection('folders').insert({ name: 'c', shortid: 'c', folder: { shortid: 'b' } })
      await store.collection('templates').insert({ name: 'foo', shortid: 'foo', folder: { shortid: 'c' } })
      await store.collection('templates').remove({ name: 'foo' })
      fs.existsSync(path.join(tmpData, 'a', 'b', 'c', 'foo')).should.be.false()
    })
  })

  describe('transactions', () => {
    it('should throw when data modified in the meantime', async () => {
      await store.collection('templates').insert({ name: 'a' })
      const req1 = Request({})
      const req2 = Request({})
      await store.beginTransaction(req1)
      await store.beginTransaction(req2)
      await store.collection('templates').update({ name: 'a' }, { $set: { content: 'foo' } }, req1)
      await store.collection('templates').update({ name: 'a' }, { $set: { content: 'foo2' } }, req2)
      await store.commitTransaction(req1)
      return store.commitTransaction(req2).should.be.rejected()
    })

    it('rollback should recover fs', async () => {
      const req = Request({})
      const originalInsert = store.provider.persistence.insert
      store.provider.persistence.insert = (doc, documents) => {
        if (doc.name === 'tc') {
          throw new Error('test')
        }
        return originalInsert(doc, documents)
      }
      await store.collection('templates').insert({ name: 'ta' }, req)
      await store.collection('templates').insert({ name: 'tr' }, req)
      await store.beginTransaction(req)
      try {
        // insert should be reverted with remove
        await store.collection('templates').insert({ name: 'tb' }, req)
        // update should go to original state
        await store.collection('templates').update({ name: 'tb' }, { $set: { name: 'td' } }, req)
        // remove should revert to insert
        await store.collection('templates').remove({ name: 'tr' }, req)
        // this just fails and causes rollback
        await store.collection('templates').insert({ name: 'tc' }, req)
        await store.commitTransaction(req)
      } catch (e) {
        await store.rollbackTransaction(req)
      }

      const dirs = fs.readdirSync(tmpData)
      dirs.filter(d => d === 'ta').should.have.length(1)
      dirs.filter(d => d === 'tb').should.have.length(0)
      dirs.filter(d => d === 'tr').should.have.length(1)
      dirs.filter(d => d === 'tc').should.have.length(0)
    })

    it('should recover a nested entity after a committed transaction creates its parent folder', async () => {
      const req = Request({})
      await store.beginTransaction(req)
      await store.collection('folders').insert({ name: 'parent', shortid: 'parent' }, req)
      await store.commitTransaction(req)

      // Fail immediately if recovery retries instead of letting the test hang.
      sinon.stub(store.options.logger, 'error').callsFake((message, error) => { throw error })

      fs.appendFileSync(path.join(tmpData, 'tran.journal'), serialize({
        operation: 'remove',
        doc: { name: 'recovered', $entitySet: 'templates', folder: { shortid: 'parent' } }
      }, false) + '\n')

      await store.collection('templates').insert({ name: 'trigger recovery' })

      fs.existsSync(path.join(tmpData, 'parent', 'recovered', 'config.json')).should.be.true()
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
    })

    describe('folder recovery', () => {
      function failOnRecoveryError () {
        sinon.stub(store.options.logger, 'error').callsFake((message, error) => {
          if (message.startsWith('Rollback crashed')) throw error
        })
      }

      function failInsert () {
        const originalInsert = store.provider.persistence.insert
        sinon.stub(store.provider.persistence, 'insert').callsFake((doc, documents) => {
          if (doc.name === 'failure') throw new Error('insert interrupted')
          return originalInsert(doc, documents)
        })
      }

      async function restartStore () {
        await store.provider.close()
        store = createDefaultStore()
        addCommonTypes(store)
        failOnRecoveryError()
        store.registerProvider(Provider({
          dataDirectory: tmpData,
          blobStorageDirectory,
          persistence: { provider: 'fs', lock: { wait: 60000, stale: 5000, retries: 3, retryWait: 100 } },
          logger: store.options.logger,
          resolveFileExtension: store.resolveFileExtension.bind(store),
          createError: m => new Error(m)
        }))
        store.addFileExtensionResolver(() => resolveFileExtension())
        await store.init()
      }

      async function insertSubtree () {
        await store.collection('folders').insert({ name: 'fa', shortid: 'fa' })
        await store.collection('folders').insert({ name: 'fb', shortid: 'fb', folder: { shortid: 'fa' } })
        await store.collection('templates').insert({ name: 't', content: 'original', folder: { shortid: 'fb' } })
      }

      beforeEach(() => {
        resolveFileExtension = () => 'html'
        failOnRecoveryError()
      })

      it('should use the commit working copy to roll back newly created folders', async () => {
        failInsert()
        const req = Request({})
        await store.beginTransaction(req)
        await store.collection('folders').insert({ name: 'fa', shortid: 'fa' }, req)
        await store.collection('folders').insert({ name: 'fb', shortid: 'fb', folder: { shortid: 'fa' } }, req)
        await store.collection('templates').insert({ name: 't', content: 'new', folder: { shortid: 'fb' } }, req)
        await store.collection('templates').insert({ name: 'failure' }, req)
        await store.commitTransaction(req).should.be.rejectedWith(/insert interrupted/)
        await store.rollbackTransaction(req)

        fs.existsSync(path.join(tmpData, 'fa')).should.be.false()
        fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
      })

      it('should update folder paths while undoing a failed transaction rename', async () => {
        await insertSubtree()
        failInsert()
        const req = Request({})
        await store.beginTransaction(req)
        await store.collection('folders').update({ shortid: 'fa' }, { $set: { name: 'renamed' } }, req)
        await store.collection('templates').update({ name: 't' }, { $set: { content: 'changed' } }, req)
        await store.collection('templates').insert({ name: 'failure' }, req)
        await store.commitTransaction(req).should.be.rejectedWith(/insert interrupted/)
        await store.rollbackTransaction(req)

        fs.readFileSync(path.join(tmpData, 'fa', 'fb', 't', 'content.html')).toString().should.be.eql('original')
        fs.existsSync(path.join(tmpData, 'renamed')).should.be.false()
        fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
      })

      it('should roll back a move into a newly created folder', async () => {
        await insertSubtree()
        failInsert()
        const req = Request({})
        await store.beginTransaction(req)
        await store.collection('folders').insert({ name: 'target', shortid: 'target' }, req)
        await store.collection('folders').update({ shortid: 'fb' }, { $set: { folder: { shortid: 'target' } } }, req)
        await store.collection('templates').update({ name: 't' }, { $set: { content: 'changed' } }, req)
        await store.collection('templates').insert({ name: 'failure' }, req)
        await store.commitTransaction(req).should.be.rejectedWith(/insert interrupted/)
        await store.rollbackTransaction(req)

        fs.readFileSync(path.join(tmpData, 'fa', 'fb', 't', 'content.html')).toString().should.be.eql('original')
        fs.existsSync(path.join(tmpData, 'target')).should.be.false()
        fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
      })

      it('should recover a move into a newly created folder after restart', async () => {
        await insertSubtree()
        failInsert()
        const req = Request({})
        await store.beginTransaction(req)
        await store.collection('folders').insert({ name: 'target', shortid: 'target' }, req)
        await store.collection('folders').update({ shortid: 'fb' }, { $set: { folder: { shortid: 'target' } } }, req)
        await store.collection('templates').update({ name: 't' }, { $set: { content: 'changed' } }, req)
        await store.collection('templates').insert({ name: 'failure' }, req)
        await store.commitTransaction(req).should.be.rejectedWith(/insert interrupted/)
        await restartStore()

        const template = await store.collection('templates').findOne({ name: 't' })
        template.content.should.be.eql('original')
        template.folder.shortid.should.be.eql('fb')
        fs.existsSync(path.join(tmpData, 'target')).should.be.false()
        fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
      })

      it('should roll back newly created nested folders after restart', async () => {
        failInsert()
        const req = Request({})
        await store.beginTransaction(req)
        await store.collection('folders').insert({ name: 'fa', shortid: 'fa' }, req)
        await store.collection('folders').insert({ name: 'fb', shortid: 'fb', folder: { shortid: 'fa' } }, req)
        await store.collection('templates').insert({ name: 't', content: 'new', folder: { shortid: 'fb' } }, req)
        await store.collection('templates').insert({ name: 'failure' }, req)
        await store.commitTransaction(req).should.be.rejectedWith(/insert interrupted/)
        await restartStore()

        const folders = await store.collection('folders').find({})
        folders.should.have.length(0)
        fs.existsSync(path.join(tmpData, 'fa')).should.be.false()
        fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
      })

      it('should restore deleted folders beneath a surviving parent after restart', async () => {
        await insertSubtree()
        failInsert()
        const req = Request({})
        await store.beginTransaction(req)
        await store.collection('folders').remove({ shortid: 'fb' }, req)
        await store.collection('templates').insert({ name: 'failure' }, req)
        await store.commitTransaction(req).should.be.rejectedWith(/insert interrupted/)
        await restartStore()

        const template = await store.collection('templates').findOne({ name: 't' })
        template.content.should.be.eql('original')
        template.folder.shortid.should.be.eql('fb')
        fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
      })

      it('should recover a partially written template before loading data after restart', async () => {
        await insertSubtree()
        const originalUpdate = store.provider.persistence.update
        sinon.stub(store.provider.persistence, 'update').callsFake(async (...args) => {
          await originalUpdate(...args)
          fs.writeFileSync(path.join(tmpData, 'fa', 'fb', 't', 'config.json'), '{')
          throw new Error('update interrupted')
        })
        const req = Request({})
        await store.beginTransaction(req)
        await store.collection('templates').update({ name: 't' }, { $set: { content: 'changed' } }, req)
        await store.commitTransaction(req).should.be.rejectedWith(/update interrupted/)
        await restartStore()

        const template = await store.collection('templates').findOne({ name: 't' })
        template.content.should.be.eql('original')
        fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
      })

      it('should reconstruct a renamed folder with partially written metadata after restart', async () => {
        await insertSubtree()
        const originalUpdate = store.provider.persistence.update
        sinon.stub(store.provider.persistence, 'update').callsFake(async (doc, originalDoc, documents) => {
          await originalUpdate(doc, originalDoc, documents)
          if (doc.$entitySet === 'folders' && doc.name === originalDoc.name) {
            fs.writeFileSync(path.join(tmpData, 'renamed', 'config.json'), '{')
            throw new Error('update interrupted')
          }
        })
        const req = Request({})
        await store.beginTransaction(req)
        await store.collection('folders').update({ shortid: 'fa' }, { $set: { name: 'renamed' } }, req)
        await store.collection('templates').update({ name: 't' }, { $set: { content: 'changed' } }, req)
        await store.collection('folders').update({ shortid: 'fa' }, { $set: { creationDate: new Date(0) } }, req)
        await store.commitTransaction(req).should.be.rejectedWith(/update interrupted/)
        await restartStore()

        const template = await store.collection('templates').findOne({ name: 't' })
        template.content.should.be.eql('original')
        fs.existsSync(path.join(tmpData, 'fa', 'fb', 't', 'config.json')).should.be.true()
        fs.existsSync(path.join(tmpData, 'renamed')).should.be.false()
        fs.existsSync(path.join(tmpData, 'fb')).should.be.false()
        fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
      })
    })

    it('commit should properly handle folder updates', async () => {
      await store.collection('folders').insert({ name: 'fa', shortid: 'fa' })
      await store.collection('templates').insert({ name: 't', folder: { shortid: 'fa' } })
      const req = Request({})
      await store.beginTransaction(req)
      await store.collection('folders').update({ name: 'fa' }, { $set: { modificationDate: new Date() } }, req)
      await store.commitTransaction(req)
      fs.existsSync(tmpData + '/fa/t').should.be.true()
    })

    it('commit should properly handle folder rename', async () => {
      await store.collection('folders').insert({ name: 'fa', shortid: 'fa' })
      await store.collection('templates').insert({ name: 't', folder: { shortid: 'fa' } })
      const req = Request({})
      await store.beginTransaction(req)
      await store.collection('folders').update({ name: 'fa' }, { $set: { name: 'fa2' } }, req)
      await store.commitTransaction(req)
      fs.existsSync(tmpData + '/fa/t').should.be.false()
      fs.existsSync(tmpData + '/fa2/t').should.be.true()
    })

    it('commit should properly handle moving entity to another folder', async () => {
      await store.collection('folders').insert({ name: 'fa', shortid: 'fa' })
      await store.collection('folders').insert({ name: 'fa2', shortid: 'fa2' })
      await store.collection('templates').insert({ name: 't', folder: { shortid: 'fa' } })
      const req = Request({})
      await store.beginTransaction(req)
      await store.collection('templates').update({ name: 't' }, { $set: { folder: { shortid: 'fa2' } } }, req)
      await store.commitTransaction(req)
      fs.existsSync(tmpData + '/fa').should.be.true()
      fs.existsSync(tmpData + '/fa/t').should.be.false()
      fs.existsSync(tmpData + '/fa2/t').should.be.true()
    })

    it('load should rollback unifinished transaction', async () => {
      const req = Request({})
      const originalInsert = store.provider.persistence.insert
      store.provider.persistence.insert = (doc, documents) => {
        if (doc.name === 'tb') {
          throw new Error('test')
        }
        return originalInsert(doc, documents)
      }
      await store.beginTransaction(req)
      try {
        await store.collection('templates').insert({ name: 'ta' }, req)
        await store.collection('templates').insert({ name: 'tb' }, req)
        await store.commitTransaction(req)
      } catch (e) {
        // not rollbacking
      }
      await store.provider.transaction.init()

      const dirs = fs.readdirSync(tmpData)
      dirs.filter(d => d === 'ta').should.have.length(0)
    })

    it('recovering insert fail in the middle', async () => {
      const originalInsert = store.provider.persistence.insert
      store.provider.persistence.insert = async (doc, documents) => {
        await originalInsert(doc, documents)
        fs.unlinkSync(path.join(tmpData, 'ta/config.json'))
        throw new Error('test')
      }

      try {
        await store.collection('templates').insert({ name: 'ta' })
        throw Error('should have failed')
      } catch (e) {
        if (e.message === 'should have failed') {
          throw e
        }
        const dirs = fs.readdirSync(tmpData)
        dirs.filter(d => d === 'ta').should.have.length(0)
      }
    })

    it('recovering remove fail in the middle', async () => {
      const originalRemove = store.provider.persistence.remove
      store.provider.persistence.remove = async (doc, documents) => {
        await originalRemove(doc, documents)
        fs.mkdirSync(path.join(tmpData, 'ta'))
        throw new Error('test exception')
      }

      await store.collection('templates').insert({ name: 'ta' })

      try {
        await store.collection('templates').remove({ name: 'ta' })
        throw Error('should have failed')
      } catch (e) {
        e.message.should.containEql('test exception')
        const dirs = fs.readdirSync(path.join(tmpData, 'ta'))
        dirs.filter(d => d === 'config.json').should.have.length(1)
      }
    })

    it('recovering update fail in the middle', async () => {
      const originalUpdate = store.provider.persistence.update
      let recoveringUpdate = false
      store.provider.persistence.update = async (query, update, opts, documents) => {
        if (recoveringUpdate) {
          return originalUpdate(query, update, opts, documents)
        }
        recoveringUpdate = true
        await originalUpdate(query, update, opts, documents)
        fs.mkdirSync(path.join(tmpData, 'ta'))
        throw new Error('test exception')
      }

      await store.collection('templates').insert({ name: 'ta' })

      try {
        await store.collection('templates').update({ name: 'ta' }, { $set: { name: 'tb' } })
        throw Error('should have failed')
      } catch (e) {
        e.message.should.containEql('test exception')
        fs.readdirSync(path.join(tmpData, 'ta')).filter(d => d === 'config.json').should.have.length(1)
        fs.readdirSync(path.join(tmpData)).filter(d => d === 'tb').should.have.length(0)
      }
    })

    it('recovering entity move between folders', async () => {
      // fa -> fb -> t
      await store.collection('folders').insert({ name: 'fa', shortid: 'fa' })
      await store.collection('folders').insert({ name: 'fb', shortid: 'fb', folder: { shortid: 'fa' } })
      await store.collection('templates').insert({ name: 't', folder: { shortid: 'fb' } })

      const originalUpdate = store.provider.persistence.update
      let recoveringUpdate = false
      store.provider.persistence.update = async (query, update, opts, documents) => {
        if (recoveringUpdate) {
          originalUpdate(query, update, opts, documents)
        }
        recoveringUpdate = true
        await originalUpdate(query, update, opts, documents)
        // we let the fb to move to the root, but act like it didn't finish completely and throw
        fs.mkdirSync(path.join(tmpData, 'fa', 'fb', 't'), { recursive: true })
        throw new Error('test')
      }

      try {
        await store.collection('folders').update({ name: 'fb' }, { $set: { folder: null } })
        throw Error('should have failed')
      } catch (e) {
        if (e.message === 'should have failed') {
          throw e
        }
        fs.readdirSync(path.join(tmpData, 'fa')).find(d => d === 'fb').should.be.ok()
        fs.readdirSync(path.join(tmpData, 'fa', 'fb', 't')).find(d => d === 'config.json').should.be.ok()
        should(fs.readdirSync(path.join(tmpData)).find(d => d === 'fb')).not.be.ok()
      }
    })

    it('recovering folder rename', async () => {
      // fa -> fb -> t
      await store.collection('folders').insert({ name: 'fa', shortid: 'fa' })
      await store.collection('folders').insert({ name: 'fb', shortid: 'fb', folder: { shortid: 'fa' } })
      await store.collection('templates').insert({ name: 't', folder: { shortid: 'fb' } })

      const originalUpdate = store.provider.persistence.update
      let recoveringUpdate = false
      store.provider.persistence.update = async (query, update, opts, documents) => {
        if (recoveringUpdate) {
          return originalUpdate(query, update, opts, documents)
        }
        recoveringUpdate = true
        await originalUpdate(query, update, opts, documents)
        fs.mkdirSync(path.join(tmpData, 'fa', 'fb', 't'), { recursive: true })
        fs.rmSync(path.join(tmpData, 'fa', 'fx'), { recursive: true })
        throw new Error('test')
      }

      try {
        await store.collection('folders').update({ name: 'fb' }, { $set: { name: 'fx' } })
        throw Error('should have failed')
      } catch (e) {
        if (e.message === 'should have failed') {
          throw e
        }
        should(fs.readdirSync(path.join(tmpData, 'fa')).find(d => d === 'fx')).not.be.ok()
        fs.readdirSync(path.join(tmpData, 'fa', 'fb', 't')).find(d => d === 'config.json').should.be.ok()
      }
    })

    it('should preserve descendants when recovering a failed folder metadata update', async () => {
      resolveFileExtension = () => 'html'
      await store.collection('folders').insert({ name: 'fa', shortid: 'fa' })
      await store.collection('folders').insert({ name: 'fb', shortid: 'fb', folder: { shortid: 'fa' } })
      await store.collection('templates').insert({ name: 't', content: 'original', folder: { shortid: 'fb' } })
      const originalFolder = await store.collection('folders').findOne({ shortid: 'fa' })

      // Stop a broken recovery immediately instead of retrying indefinitely.
      sinon.stub(store.options.logger, 'error').callsFake((message, error) => { throw error })
      const originalUpdate = store.provider.persistence.update
      sinon.stub(store.provider.persistence, 'update').callsFake(originalUpdate)
        .onFirstCall().callsFake(async (...args) => {
          await originalUpdate(...args)
          throw new Error('folder update interrupted')
        })

      await store.collection('folders').update({ shortid: 'fa' }, { $set: { creationDate: new Date(0) } })
        .should.be.rejectedWith(/folder update interrupted/)

      const restoredFolder = parse(fs.readFileSync(path.join(tmpData, 'fa', 'config.json')).toString())
      restoredFolder.creationDate.should.be.eql(originalFolder.creationDate)
      fs.existsSync(path.join(tmpData, 'fa', 'fb', 'config.json')).should.be.true()
      fs.readFileSync(path.join(tmpData, 'fa', 'fb', 't', 'content.html')).toString().should.be.eql('original')
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
    })

    it('recovering folder remove and fail in the middle', async () => {
      await store.collection('folders').insert({ name: 'fa', shortid: 'fa' })
      await store.collection('folders').insert({ name: 'fb', shortid: 'fb', folder: { shortid: 'fa' } })
      await store.collection('templates').insert({ name: 't', folder: { shortid: 'fb' } })

      const originalRemove = store.provider.persistence.remove
      let recoveringRemove = false
      store.provider.persistence.remove = async (doc, documents) => {
        if (recoveringRemove) {
          return originalRemove(doc, documents)
        }
        recoveringRemove = true
        await originalRemove(doc, documents)
        fs.mkdirSync(path.join(tmpData, 'fa', 'fb'), { recursive: true })
        throw new Error('test')
      }

      try {
        await store.collection('folders').remove({ name: 'fb' })
        throw Error('should have failed')
      } catch (e) {
        if (e.message === 'should have failed') {
          throw e
        }
        fs.readdirSync(path.join(tmpData, 'fa', 'fb', 't')).find(d => d === 'config.json').should.be.ok()
      }
    })

    it('corruption in the tran.journal should be skipped', async () => {
      const req = Request({})
      const originalInsert = store.provider.persistence.insert
      store.provider.persistence.insert = (doc, documents) => {
        if (doc.name === 'tb') {
          throw new Error('test')
        }
        return originalInsert(doc, documents)
      }
      await store.beginTransaction(req)
      try {
        await store.collection('templates').insert({ name: 'ta' }, req)
        await store.collection('templates').insert({ name: 'tb' }, req)
        await store.commitTransaction(req)
      } catch (e) {
        fs.appendFileSync(path.join(tmpData, 'tran.journal'), '\ncorrupted')
        await store.rollbackTransaction(req)
      }

      const dirs = fs.readdirSync(tmpData)
      dirs.filter(d => d === 'ta').should.have.length(0)
    })

    it('should check the tran.journal before performing writes and recover after remove', async () => {
      const req = Request({})

      fs.appendFileSync(path.join(tmpData, 'tran.journal'), JSON.stringify({ operation: 'remove', doc: { name: 'ta', $entitySet: 'templates' } }) + '\n')

      await store.collection('templates').insert({ name: 'just to trigger recover' }, req)

      const dirs = fs.readdirSync(tmpData)
      dirs.filter(d => d === 'ta').should.have.length(1)
    })

    it('should check the tran.journal before performing writes and recover after insert', async () => {
      const req = Request({})

      await store.collection('templates').insert({ name: 'ab' }, req)
      fs.appendFileSync(path.join(tmpData, 'tran.journal'), JSON.stringify({ operation: 'insert', doc: { name: 'ta', $entitySet: 'templates' } }) + '\n')

      await store.collection('templates').insert({ name: 'just to trigger recover' }, req)

      const dirs = fs.readdirSync(tmpData)
      dirs.filter(d => d === 'ta').should.have.length(0)
    })

    it('should check the tran.journal before performing writes and recover after update', async () => {
      const req = Request({})

      await store.collection('templates').insert({ name: 'ta', engine: 'foo' }, req)
      fs.appendFileSync(path.join(tmpData, 'tran.journal'), JSON.stringify({
        operation: 'update',
        doc: { name: 'ta', $entitySet: 'templates', engine: 'html' },
        originalDoc: { name: 'ta', $entitySet: 'templates', engine: 'none' }
      }) + '\n')

      await store.collection('templates').insert({ name: 'just to trigger recover' }, req)

      const taConfig = JSON.parse(fs.readFileSync(path.join(tmpData, 'ta', 'config.json')))
      taConfig.engine.should.be.eql('none')
    })

    it('week errors shouldnt cause rollback', async () => {
      try {
        await store.collection('templates').insert({ name: 'a', folder: { shortid: 'missing' } })
      } catch (e) {
        e.week.should.be.true()
      }
    })
  })

  describe('document properties', () => {
    it('should be persisted into dedicated files', async () => {
      await store.collection('templates').insert({ name: 'test', content: 'foo' })
      const content = (await fsPromises.readFile(path.join(tmpData, 'test', 'content.html'))).toString()
      content.should.be.eql('foo')
    })

    it('should be persisted with file extension gathered from resolveFileExtension', async () => {
      resolveFileExtension = () => 'txt'
      await store.collection('templates').insert({ name: 'test', content: 'foo' })
      const content = (await fsPromises.readFile(path.join(tmpData, 'test', 'content.txt'))).toString()
      content.should.be.eql('foo')
    })

    it('should throw when invalid file extension is returned from resolveFileExtension', async () => {
      resolveFileExtension = () => '../../foo.js'
      return should(store.collection('templates').insert({ name: 'test', content: 'foo' })).be.rejectedWith(/Got invalid file extension/)
    })

    it('should not be duplicated in the config file', async () => {
      await store.collection('templates').insert({ name: 'test', content: 'foo' })
      const config = JSON.parse((await fsPromises.readFile(path.join(tmpData, 'test', 'config.json'))).toString())
      should(config.content).not.be.ok()
    })

    it('should not write dedicated files is prop not defined', async () => {
      await store.collection('templates').insert({ name: 'test', content: 'foo' })
      fs.existsSync(path.join(tmpData, 'templates', 'test', 'header.html')).should.be.false()
    })

    it('should delete dedicated files for null set', async () => {
      await store.collection('templates').insert({ name: 'test', content: 'foo', phantom: { header: 'a' } })
      fs.existsSync(path.join(tmpData, 'test', 'header.html')).should.be.true()
      await store.collection('templates').update({ name: 'test' }, { $set: { phantom: null } })
      fs.existsSync(path.join(tmpData, 'test', 'header.html')).should.be.false()
    })
  })

  describe('validations', () => {
    it('insert doc with / in name should throw', async () => {
      try {
        await store.collection('templates').insert({ name: 'test/aaa' })
        throw new Error('Should have failed')
      } catch (e) {
        if (e.message === 'Should have failed') {
          throw e
        }
      }
    })

    it('update doc with / in name should throw', async () => {
      await store.collection('templates').insert({ name: 'test' })
      try {
        await store.collection('templates').update({ name: 'test' }, { $set: { name: 'test/test' } })
        throw new Error('Should have failed')
      } catch (e) {
        if (e.message === 'Should have failed') {
          throw e
        }
      }
    })
  })

  describe('files monitoring', () => {
    it('should fire reload event on file changes', async () => {
      await store.collection('templates').insert({ name: 'test', recipe: 'foo' })
      return new Promise(resolve => {
        store.provider.on('external-modification', () => resolve())
        fs.writeFileSync(path.join(tmpData, 'foo.ff'), 'changing')
      })
    })

    it('should not fire reload for common cud operations', async () => {
      let notified = null
      store.provider.on('external-modification', () => {
        notified = true
      })

      await store.collection('templates').insert({ name: 'test', recipe: 'foo' })
      await store.collection('templates').update({ name: 'test' }, { $set: { content: 'changed' } })
      await store.collection('templates').remove({ name: 'test' })

      await new Promise(resolve => setTimeout(resolve, 1000))
      should(notified).be.null()
    })

    it('should not fire reload for update', async () => {
      let notified = null
      store.provider.on('external-modification', () => {
        notified = true
      })

      await store.collection('templates').insert({ name: 'test', recipe: 'foo', content: 'a' })
      await store.collection('templates').update({ name: 'test' }, { $set: { content: 'changed' } })

      await new Promise(resolve => setTimeout(resolve, 1000))
      should(notified).be.null()
    })

    it('should debounce reload events', async () => {
      await store.collection('templates').insert({ name: 'test', recipe: 'foo' })
      let reloadCount = 0
      store.provider.on('external-modification', () => {
        reloadCount++
      })

      fs.writeFileSync(path.join(tmpData, 'a.ff'), 'changing')
      fs.writeFileSync(path.join(tmpData, 'b.ff'), 'changing')
      fs.writeFileSync(path.join(tmpData, 'c.ff'), 'changing')
      await new Promise(resolve => setTimeout(resolve, 1500))
      reloadCount.should.be.eql(1)
    })

    it('should not fire reload for changes in pressure', async () => {
      let notified = null
      store.provider.on('external-modification', () => {
        notified = true
      })

      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push((async () => {
          await store.collection('templates').insert({ name: 'test' + i, recipe: 'foo' })
          return store.collection('templates').update({ name: 'test' + i, recipe: 'foo' }, { $set: { recipe: 'foo2' } })
        })())
      }
      await Promise.all(promises)

      await new Promise(resolve => setTimeout(resolve, 1000))
      should(notified).be.null()
    })

    it('should not fire reload for settings changes', async () => {
      let notified = null
      store.provider.on('external-modification', () => {
        notified = true
      })

      await store.collection('settings').insert({ key: 'a', value: 'b' })
      await store.collection('settings').update({ key: 'a' }, { $set: { value: 'c' } })

      await new Promise(resolve => setTimeout(resolve, 1000))
      should(notified).be.null()
    })

    it('should fire reload when a custom folder added', async () => {
      return new Promise(resolve => {
        store.provider.on('external-modification', () => resolve())
        setTimeout(() => fs.mkdirSync(path.join(tmpData, 'myCustomFolder')), 500)
      })
    })

    it('should not fire reload for changes in the blob storage', async () => {
      let notified = null
      store.provider.on('external-modification', () => {
        notified = true
      })

      fs.writeFileSync(path.join(blobStorageDirectory, 'file.txt'), 'aaa')
      await new Promise(resolve => setTimeout(resolve, 1000))
      should(notified).be.null()
    })

    it('should not fire reload for flat files compaction', async () => {
      let notified = null
      store.provider.on('external-modification', () => {
        notified = true
      })

      await store.collection('settings').insert({ key: 'a', value: 'b' })
      await store.collection('settings').update({ key: 'a' }, { $set: { value: 'c' } })
      await store.provider.persistence.compact(store.provider.transaction.getCurrentStore().documents)

      await new Promise(resolve => setTimeout(resolve, 1000))
      should(notified).be.null()
    })

    it('should not fire reload for ignored specific files', (done) => {
      const ignoredFiles = ['fs.lock', '.tran', '.DS_Store']
      fs.mkdirSync(path.join(tmpData, 'test'))

      const doneOnce = once(done)

      store.provider.on('external-modification', (e) => {
        if (e.filePath === path.join(tmpData, 'test')) {
          return
        }

        doneOnce(new Error('shouldnt be called'))
      })

      ignoredFiles.forEach((f) => fs.writeFileSync(path.join(tmpData, 'test', f), 'foo'))
      setTimeout(() => doneOnce(), 1000)
    })
  })

  describe('queueing', () => {
    // otherwise we get queuing called from the sync reload action
    beforeEach(() => store.provider.close())

    it('insert should go to queue', async () => {
      store.provider.transaction = { operation: sinon.mock(), close: () => {} }
      await store.collection('templates').insert({ name: 'test' })
      sinon.assert.called(store.provider.transaction.operation)
    })

    it('remove should go to queue', async () => {
      await store.collection('templates').insert({ name: 'test' })
      store.provider.transaction = { operation: sinon.mock(), close: () => {} }
      await store.collection('templates').remove({ name: 'test' })
      sinon.assert.called(store.provider.transaction.operation)
    })

    it('update should go to queue', async () => {
      await store.collection('templates').insert({ name: 'test' })
      store.provider.transaction = { operation: sinon.mock(), close: () => {} }
      await store.collection('templates').update({ name: 'test' }, { $set: { recipe: 'foo' } })
      sinon.assert.called(store.provider.transaction.operation)
    })
  })

  describe('flat files', () => {
    it('insert should create flat file store', async () => {
      const doc = await store.collection('settings').insert({ key: 'a', value: '1' })
      fs.existsSync(path.join(tmpData, 'settings')).should.be.true()
      const readDoc = JSON.parse(fs.readFileSync(path.join(tmpData, 'settings')).toString())
      readDoc._id.should.be.eql(doc._id)
      readDoc.key.should.be.eql(doc.key)
      readDoc.value.should.be.eql(doc.value)
    })

    it('update should append to file new entry', async () => {
      await store.collection('settings').insert({ key: 'a', value: '1' })
      await store.collection('settings').update({ key: 'a' }, { $set: { value: '2' } })
      const docs = fs
        .readFileSync(path.join(tmpData, 'settings'))
        .toString()
        .split('\n')
        .filter(c => c)
        .map(JSON.parse)
      docs.should.have.length(2)
      docs[0].value.should.be.eql('1')
      docs[1].value.should.be.eql('2')
    })

    it('remove should append $$delete', async () => {
      await store.collection('settings').insert({ key: 'a', value: '1' })
      await store.collection('settings').remove({ key: 'a' })
      const docs = fs
        .readFileSync(path.join(tmpData, 'settings'))
        .toString()
        .split('\n')
        .filter(c => c)
        .map(JSON.parse)
      docs.should.have.length(2)
      docs[1].$$deleted.should.be.true()
    })

    it('compact should use state in files not in memory', async () => {
      await store.collection('settings').insert({ key: 'a', value: '1' })
      fs.appendFileSync(path.join(tmpData, 'settings'), JSON.stringify({ key: 'b', value: '2' }))
      await store.provider.persistence.compact(store.provider.transaction.getCurrentStore().documents)
      const settings = await store.collection('settings').find({})
      settings.should.have.length(2)
    })
  })
})

describe('load', () => {
  let store

  beforeEach(async () => {
    store = createDefaultStore()

    addCommonTypes(store)

    store.registerProvider(
      Provider({
        dataDirectory: path.join(__dirname, 'data'),
        blobStorageDirectory: path.join(__dirname, 'data', 'storage'),
        logger: store.options.logger,
        persistence: { provider: 'fs', lock: { wait: 60000, stale: 5000, retries: 3, retryWait: 100 } },
        sync: { provider: 'fs' },
        resolveFileExtension: store.resolveFileExtension.bind(store),
        createError: m => new Error(m)
      })
    )

    await store.init()
  })

  afterEach(() => {
    return store.provider.close()
  })

  it('should load templates splitted into folder', async () => {
    const res = await store.collection('templates').find({})
    res.should.have.length(1)
    res[0].name.should.be.eql('Invoice')
    res[0].recipe.should.be.eql('phantom-pdf')
    res[0].content.should.be.eql('content')
    res[0].phantom.margin.should.be.eql('margin')
    res[0].phantom.header.should.be.eql('header')
    res[0].modificationDate.should.be.an.instanceOf(Date)
  })

  it('should load settings from flat file', async () => {
    const res = await store
      .collection('settings')
      .find({})
      .sort({ key: 1 })
    res.should.have.length(2)
    res[0].key.should.be.eql('a')
    res[1].key.should.be.eql('b')
    res[0].value.should.be.eql('1')
  })

  it('should load assets binary content', async () => {
    const res = await store.collection('assets').find({ name: 'image.png' })
    res.should.have.length(1)
    res[0].content.should.be.instanceof(Buffer)
  })

  it('should load folders as entities', async () => {
    const res = await store.collection('folders').find({})
    res.should.have.length(3)
    const assets = res.find(r => r.name === 'assets')
    assets.should.be.ok()
    assets.shortid.should.be.eql('1jpybw')

    const invoice = await store.collection('templates').findOne({})
    invoice.folder.shortid.should.be.eql('Q4EEHA')
  })

  it('should not load folder config.json as asset', async () => {
    const res = await store.collection('assets').findOne({ name: 'config.json' })
    should(res).be.null()
  })
})

describe('load and ignore', () => {
  let store

  beforeEach(async () => {
    store = createDefaultStore()

    addCommonTypes(store)

    store.registerProvider(
      Provider({
        dataDirectory: path.join(__dirname, 'dataWithIgnoredFiles'),
        blobStorageDirectory: path.join(__dirname, 'dataWithIgnoredFiles', 'storage'),
        ignore: ['.ci', '.gitignore'],
        logger: store.options.logger,
        persistence: { provider: 'fs', lock: { wait: 60000, stale: 5000, retries: 3, retryWait: 100 } },
        sync: { provider: 'fs' },
        resolveFileExtension: store.resolveFileExtension.bind(store),
        createError: m => new Error(m)
      })
    )

    await store.init()
  })

  afterEach(() => {
    return store.provider.close()
  })

  it('should load only the valid entities and ignore the files/directories specified', async () => {
    const folders = await store.collection('folders').find({})
    folders.should.have.length(1)
    folders[0].name.should.be.eql('random')
  })
})

describe('cluster', () => {
  let store1, store2
  const tmpData = path.join(__dirname, 'tmpData')
  const blobStorageDirectory = path.join(tmpData, 'blobs')

  beforeEach(async () => {
    await del(tmpData)

    store1 = createDefaultStore('store1')
    store2 = createDefaultStore('store2')

    addCommonTypes(store1)
    addCommonTypes(store2)

    store1.registerProvider(
      Provider({
        dataDirectory: tmpData,
        blobStorageDirectory,
        externalModificationsSync: true,
        persistence: { provider: 'fs', lock: { wait: 60000, stale: 5000, retries: 3, retryWait: 100 } },
        logger: store1.options.logger,
        createError: m => new Error(m),
        resolveFileExtension: store1.resolveFileExtension.bind(store1)
      })
    )

    store2.registerProvider(
      Provider({
        dataDirectory: tmpData,
        blobStorageDirectory,
        externalModificationsSync: true,
        persistence: { provider: 'fs', lock: { wait: 60000, stale: 5000, retries: 3, retryWait: 100 } },
        logger: store2.options.logger,
        createError: m => new Error(m),
        resolveFileExtension: store2.resolveFileExtension.bind(store2)
      })
    )

    await store1.init()
    await store2.init()
  })

  afterEach(async () => {
    await store1.provider.close()
    await store2.provider.close()
    await del(tmpData)
  })

  it('second server should see insert writes from the first', async () => {
    await store1.collection('templates').insert({
      name: 'a'
    })
    await store2.provider.sync()
    const doc = await store2.collection('templates').findOne({})
    should.exists(doc)
    doc.name.should.be.eql('a')
  })

  it('second server should see update writes from the first', async () => {
    await store1.collection('templates').insert({
      name: 'a'
    })
    await store2.provider.reload()
    await store1.collection('templates').update({
      name: 'a'
    }, {
      $set: { content: 'hello' }
    })
    await store2.provider.sync()

    const doc = await store2.collection('templates').findOne({})
    doc.content.should.be.eql('hello')
  })

  it('second server should see remove writes from the first', async () => {
    await store1.collection('templates').insert({
      name: 'a'
    })
    await store2.provider.reload()
    await store1.collection('templates').remove({
      name: 'a'
    })
    await store2.provider.sync()

    const doc = await store2.collection('templates').findOne({})
    should(doc).be.null()
  })

  it('the first server should skip its own change', async () => {
    await store1.collection('templates').insert({
      name: 'a'
    })
    store1.provider.journal.lastVersion.should.be.eql(1)
    await store1.provider.sync()
    store1.provider.journal.lastVersion.should.be.eql(1)
    const docs = await store1.collection('templates').find({})
    docs.should.have.length(1)
  })

  it('the first server should skip its own changes', async () => {
    await store1.collection('templates').insert({
      name: 'a'
    })
    await store1.collection('templates').insert({
      name: 'b'
    })
    store1.provider.journal.lastVersion.should.be.eql(2)
    await store1.provider.sync()
    store1.provider.journal.lastVersion.should.be.eql(2)
    const docs = await store1.collection('templates').find({})
    docs.should.have.length(2)
  })

  it('transaction commit should cause reload on the second server', async () => {
    const req1 = Request({})
    await store1.beginTransaction(req1)
    await store1.collection('templates').insert({
      name: 'a'
    }, req1)
    await store1.commitTransaction(req1)
    await store2.provider.sync()
    const doc = await store2.collection('templates').findOne({
      name: 'a'
    })
    doc.name.should.be.eql('a')
  })

  describe('recovery synchronization', () => {
    beforeEach(async () => {
      // Verify synchronization itself, without the external-editor watcher recovering first.
      await store1.provider.externalModificationsSync.close()
      await store2.provider.externalModificationsSync.close()
      sinon.stub(store2.options.logger, 'error').callsFake((message, error) => {
        if (message.startsWith('Rollback crashed')) throw error
      })
    })

    async function createSubtree () {
      const req = Request({})
      await store1.beginTransaction(req)
      await store1.collection('folders').insert({ name: 'fa', shortid: 'fa' }, req)
      await store1.collection('folders').insert({ name: 'fb', shortid: 'fb', folder: { shortid: 'fa' } }, req)
      await store1.collection('templates').insert({ name: 't', content: 'original', folder: { shortid: 'fb' } }, req)
      await store1.commitTransaction(req)
    }

    async function interruptDeletion () {
      const originalInsert = store1.provider.persistence.insert
      sinon.stub(store1.provider.persistence, 'insert').callsFake((doc, documents) => {
        if (doc.name === 'failure') throw new Error('insert interrupted')
        return originalInsert(doc, documents)
      })
      const req = Request({})
      await store1.beginTransaction(req)
      await store1.collection('folders').remove({ shortid: 'fb' }, req)
      await store1.collection('templates').insert({ name: 'failure' }, req)
      await store1.commitTransaction(req).should.be.rejectedWith(/insert interrupted/)
      return req
    }

    it('should recover before synchronization loads partially modified files', async () => {
      await createSubtree()
      await interruptDeletion()
      const originalLoad = store2.provider.persistence.load
      sinon.stub(store2.provider.persistence, 'load').callsFake(() => {
        fs.existsSync(path.join(tmpData, 'fa', 'fb', 't', 'config.json')).should.be.true()
        return originalLoad()
      })

      await store2.provider.sync()

      const template = await store2.collection('templates').findOne({ name: 't' })
      template.content.should.be.eql('original')
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
    })

    it('should refresh recovered memory before executing a subsequent write', async () => {
      await createSubtree()
      await interruptDeletion()

      await store2.collection('templates').insert({ name: 'subsequent write' })

      const template = await store2.collection('templates').findOne({ name: 't' })
      should.exists(template)
      template.content.should.be.eql('original')
      await store2.provider.sync()
      const subsequent = await store2.collection('templates').findOne({ name: 'subsequent write' })
      should.exists(subsequent)
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
    })

    it('should notify another server after rollback restores the files', async () => {
      await createSubtree()
      await store2.provider.sync()
      const req = await interruptDeletion()
      // Simulate a server that already loaded the interrupted filesystem state.
      await store2.provider.reload()
      const missing = await store2.collection('templates').findOne({ name: 't' })
      should(missing).be.null()

      await store1.rollbackTransaction(req)
      await store2.provider.sync()

      const restored = await store2.collection('templates').findOne({ name: 't' })
      should.exists(restored)
      restored.content.should.be.eql('original')
    })

    it('should use current folder paths when delayed rollback encounters another server journal', async () => {
      await createSubtree()
      sinon.stub(store1.options.logger, 'error').callsFake((message, error) => {
        if (message.startsWith('Rollback crashed')) throw error
      })
      const insert1 = store1.provider.persistence.insert
      sinon.stub(store1.provider.persistence, 'insert').callsFake((doc, documents) => {
        if (doc.name === 'failure') throw new Error('insert interrupted')
        return insert1(doc, documents)
      })
      const firstReq = Request({})
      await store1.beginTransaction(firstReq)
      await store1.collection('templates').insert({ name: 'failure' }, firstReq)
      await store1.commitTransaction(firstReq).should.be.rejectedWith(/insert interrupted/)

      await store2.provider.sync()
      await store2.collection('folders').update({ shortid: 'fa' }, { $set: { name: 'renamed' } })
      const insert2 = store2.provider.persistence.insert
      sinon.stub(store2.provider.persistence, 'insert').callsFake((doc, documents) => {
        if (doc.name === 'failure') throw new Error('insert interrupted')
        return insert2(doc, documents)
      })
      const secondReq = Request({})
      await store2.beginTransaction(secondReq)
      await store2.collection('templates').remove({ name: 't' }, secondReq)
      await store2.collection('templates').insert({ name: 'failure' }, secondReq)
      await store2.commitTransaction(secondReq).should.be.rejectedWith(/insert interrupted/)

      // The first caller resumes with an older working copy, but the journal now belongs to store2.
      await store1.rollbackTransaction(firstReq)

      fs.existsSync(path.join(tmpData, 'renamed', 'fb', 't', 'config.json')).should.be.true()
      fs.existsSync(path.join(tmpData, 'fa')).should.be.false()
      await store2.provider.sync()
      const restored = await store2.collection('templates').findOne({ name: 't' })
      restored.content.should.be.eql('original')
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
    })

    it('should retain the recovery journal if reloading recovered memory fails', async () => {
      await createSubtree()
      await interruptDeletion()
      const load = sinon.stub(store2.provider.persistence, 'load').rejects(new Error('reload interrupted'))

      await store2.provider.sync().should.be.rejectedWith(/reload interrupted/)
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.true()

      load.restore()
      await store2.provider.sync()
      const restored = await store2.collection('templates').findOne({ name: 't' })
      restored.content.should.be.eql('original')
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
    })

    it('should retain the recovery journal if publishing the reload notification fails', async () => {
      await createSubtree()
      await interruptDeletion()
      const publish = sinon.stub(store2.provider.journal, 'commit').rejects(new Error('publication interrupted'))

      await store2.provider.sync().should.be.rejectedWith(/publication interrupted/)
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.true()

      publish.restore()
      await store2.provider.sync()
      const restored = await store2.collection('templates').findOne({ name: 't' })
      restored.content.should.be.eql('original')
      fs.existsSync(path.join(tmpData, 'tran.journal')).should.be.false()
    })
  })

  it('journal should be cleaned from old entries', async () => {
    const old = serialize({
      operation: 'insert',
      timestamp: new Date(new Date().getTime() - 120000)
    }, false)
    const recent = serialize({
      operation: 'update',
      timestamp: new Date(new Date().getTime() - 20000)
    }, false)
    fs.writeFileSync(path.join(tmpData, 'fs.journal'), [old, recent].join('\n'))
    await store1.provider.journal.clean()
    const journalItems = fs.readFileSync(path.join(tmpData, 'fs.journal')).toString().split('\n').filter(l => l).map(parse)
    journalItems.should.have.length(1)
    journalItems[0].operation.should.be.eql('update')
  })

  it('journal sync should cause reload if it could contain cleaned entries', async () => {
    await store1.collection('templates').insert({
      name: 'a'
    })
    store1.provider.transaction.getCurrentStore().documents.templates = []
    store1.provider.journal.lastSync = new Date(new Date().getTime() - 120000)
    await store1.provider.sync()
    const doc = await store1.collection('templates').findOne({})
    should.exists(doc)
  })

  it('journal sync from interval should cause reload and able to complete normally', async () => {
    // this tests that nested locks don't occur
    await store1.collection('templates').insert({
      name: 'a'
    })
    // we want to trigger a reload here, so we set the last sync so long time ago
    store1.provider.journal.lastSync = new Date(new Date().getTime() - 120000)
    // wait and sync is the sync api that is execute in the interval (that uses the queue and lock)
    await store1.provider.journal.waitAndSync()
    const doc = await store1.collection('templates').findOne({})
    should.exists(doc)
  })

  it('sync with corrupted journal should cause reload and fs.journal cleanup', async () => {
    await store1.collection('templates').insert({
      name: 'a'
    })
    fs.writeFileSync(path.join(tmpData, 'fs.journal'), 'corrupted')
    await store2.provider.sync()
    const doc = await store2.collection('templates').findOne({
      name: 'a'
    })
    doc.name.should.be.eql('a')
    const journalContent = fs.readFileSync(path.join(tmpData, 'fs.journal')).toString()
    journalContent.should.containEql('reload')
    journalContent.should.not.containEql('corrupted')
  })

  it('clean with corrupted journal should cause reload and fs.journal cleanup', async () => {
    fs.writeFileSync(path.join(tmpData, 'fs.journal'), 'corrupted')
    await store1.provider.journal.clean()
    const journalContent = fs.readFileSync(path.join(tmpData, 'fs.journal')).toString()
    journalContent.should.containEql('reload')
    journalContent.should.not.containEql('corrupted')
  })
})

function addCommonTypes (store) {
  store.registerEntityType('FolderType', {
    _id: { type: 'Edm.String', key: true },
    name: { type: 'Edm.String' },
    shortid: { type: 'Edm.String' },
    creationDate: { type: 'Edm.DateTimeOffset' },
    modificationDate: { type: 'Edm.DateTimeOffset' }
  })

  store.registerComplexType('ScriptType', {
    name: { type: 'Edm.String' }
  })

  store.registerComplexType('FolderRefType', {
    shortid: { type: 'Edm.String' }
  })

  store.registerComplexType('PhantomType', {
    margin: { type: 'Edm.String' },
    header: { type: 'Edm.String', document: { extension: 'html', engine: true } }
  })

  store.registerEntityType('TemplateType', {
    _id: { type: 'Edm.String', key: true },
    name: { type: 'Edm.String' },
    content: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    recipe: { type: 'Edm.String' },
    modificationDate: { type: 'Edm.DateTimeOffset' },
    phantom: { type: 'jsreport.PhantomType', schema: { type: 'null' } },
    folder: { type: 'jsreport.FolderRefType' },
    scripts: { type: 'Collection(jsreport.ScriptType)' }
  })
  store.registerEntitySet('templates', { entityType: 'jsreport.TemplateType', splitIntoDirectories: true })

  store.registerEntityType('AssetType', AssetType)
  store.registerEntitySet('assets', { entityType: 'jsreport.AssetType', splitIntoDirectories: true })

  store.registerEntityType('SettingsType', {
    _id: { type: 'Edm.String', key: true },
    key: { type: 'Edm.String' },
    value: { type: 'Edm.String' }
  })

  store.registerEntitySet('settings', { entityType: 'jsreport.SettingsType' })

  store.registerEntityType('ReportsType', {
    _id: { type: 'Edm.String', key: true },
    blobName: { type: 'Edm.String' }
  })

  store.registerEntitySet('reports', { entityType: 'jsreport.ReportsType' })

  store.registerEntitySet('folders', { entityType: 'jsreport.FolderType', splitIntoDirectories: true })
}
