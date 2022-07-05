const DocumentStore = require('@jsreport/jsreport-core/lib/main/store/documentStore.js')
const SchemaValidator = require('@jsreport/jsreport-core/lib/main/schemaValidator')
const jsreport = require('@jsreport/jsreport-core')
const Request = require('@jsreport/jsreport-core/lib/shared/request')
const Provider = require('../lib/provider')
const path = require('path')
const utils = require('util')
const fs = require('fs')
const ncpAsync = utils.promisify(require('ncp').ncp)
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
        persistence: { provider: 'fs' },
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

    it('commit should ~tran and .tran', async () => {
      const req = Request({})
      await store.beginTransaction(req)
      await store.collection('templates').insert({ name: 'a' }, req)
      await store.commitTransaction(req)
      fs.readdirSync(tmpData).filter(d => d.startsWith('~.tran')).should.have.length(0)
      fs.readdirSync(tmpData).filter(d => d.startsWith('.tran')).should.have.length(0)
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

    it('insert duplicated key should throw and not be included in the query', async () => {
      await store.collection('templates').insert({ name: 'test' })
      try {
        await store.collection('templates').insert({ name: 'test' })
        throw new Error('Should have failed')
      } catch (e) {
        if (e.message === 'Should have failed' || !e.message.includes('Duplicate')) {
          throw e
        }
      }

      const res = await store.collection('templates').find({})
      res.should.have.length(1)
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
        persistence: { provider: 'fs' },
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
        persistence: { provider: 'fs' },
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

describe('load cleanup', () => {
  let store
  let startTime
  beforeEach(async () => {
    await del(path.join(__dirname, 'dataToCleanupCopy'))
    await fsPromises.mkdir(path.join(__dirname, 'dataToCleanupCopy'), { recursive: true })
    await ncpAsync(path.join(__dirname, 'dataToCleanup'), path.join(__dirname, 'dataToCleanupCopy'))
    startTime = new Date()
    store = createDefaultStore()

    addCommonTypes(store)

    store.registerProvider(
      Provider({
        dataDirectory: path.join(__dirname, 'dataToCleanupCopy'),
        blobStorageDirectory: path.join(__dirname, 'dataToCleanupCopy', 'storage'),
        logger: store.options.logger,
        persistence: { provider: 'fs' },
        sync: { provider: 'fs' },
        resolveFileExtension: store.resolveFileExtension.bind(store),
        compactionEnabled: true,
        compactionInterval: 5000,
        createError: m => new Error(m)
      })
    )
    await store.init()
  })

  afterEach(async () => {
    await del(path.join(__dirname, 'dataToCleanupCopy'))
    await store.provider.close()
  })

  it('should load commited changes ~c~c', async () => {
    const res = await store.collection('templates').find({})
    res.should.have.length(1)
    res[0].name.should.be.eql('c')
    res[0].content.should.be.eql('changed')
  })

  it('should remove uncommited changes ~~a', () => {
    fs.existsSync(path.join(__dirname, 'dataToCleanupCopy', 'templates', '~~a')).should.be.false()
  })

  it('should remove commited and renamed changes', () => {
    fs.existsSync(path.join(__dirname, 'dataToCleanupCopy', 'templates', '~c~c')).should.be.false()
  })

  it('should compact flat files on load', () => {
    fs.readFileSync(path.join(__dirname, 'dataToCleanupCopy', 'settings'), 'utf8').should.not.containEql('"value":"1"')
  })

  it('should not modify flat files when there are no changes', () => {
    const stat = fs.statSync(path.join(__dirname, 'dataToCleanupCopy', 'reports'))
    stat.mtime.should.be.lessThanOrEqual(startTime)
  })
})

describe('load cleanup consistent transaction', () => {
  let store

  beforeEach(async () => {
    await del(path.join(__dirname, 'tranDataToCleanupCopy'))
    await ncpAsync(path.join(__dirname, 'tranConsistentDataToCleanup'), path.join(__dirname, 'tranDataToCleanupCopy'))

    store = createDefaultStore()

    addCommonTypes(store)

    store.registerProvider(
      Provider({
        dataDirectory: path.join(__dirname, 'tranDataToCleanupCopy'),
        blobStorageDirectory: path.join(__dirname, 'tranDataToCleanupCopy', 'storage'),
        logger: store.options.logger,
        persistence: { provider: 'fs' },
        sync: { provider: 'fs' },
        resolveFileExtension: store.resolveFileExtension.bind(store),
        createError: m => new Error(m)
      })
    )
    await store.init()
  })

  afterEach(async () => {
    await del(path.join(__dirname, 'tranDataToCleanupCopy'))
    return store.provider.close()
  })

  it('should remove ~.tran and .tran and copy ~.tran to root', () => {
    fs.existsSync(path.join(__dirname, 'tranDataToCleanupCopy', '~.tran')).should.be.false()
    fs.existsSync(path.join(__dirname, 'tranDataToCleanupCopy', '.tran')).should.be.false()
    fs.existsSync(path.join(__dirname, 'tranDataToCleanupCopy', 'b')).should.be.true()
  })
})

describe('load cleanup inconsistent transaction', () => {
  let store

  beforeEach(async () => {
    await del(path.join(__dirname, 'tranDataToCleanupCopy'))
    await ncpAsync(path.join(__dirname, 'tranInconsistentDataToCleanup'), path.join(__dirname, 'tranDataToCleanupCopy'))

    store = createDefaultStore()

    addCommonTypes(store)

    store.registerProvider(
      Provider({
        dataDirectory: path.join(__dirname, 'tranDataToCleanupCopy'),
        blobStorageDirectory: path.join(__dirname, 'tranDataToCleanupCopy', 'storage'),
        logger: store.options.logger,
        persistence: { provider: 'fs' },
        sync: { provider: 'fs' },
        resolveFileExtension: store.resolveFileExtension.bind(store),
        createError: m => new Error(m)
      })
    )
    await store.init()
  })

  afterEach(async () => {
    await del(path.join(__dirname, 'tranDataToCleanupCopy'))
    return store.provider.close()
  })

  it('should remove ~.tran and don\'t copy to root', () => {
    fs.existsSync(path.join(__dirname, 'tranDataToCleanupCopy', '~.tran')).should.be.false()
    fs.existsSync(path.join(__dirname, 'tranDataToCleanupCopy', 'b')).should.be.false()
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
        persistence: { provider: 'fs' },
        logger: store1.options.logger,
        createError: m => new Error(m),
        resolveFileExtension: () => null
      })
    )

    store2.registerProvider(
      Provider({
        dataDirectory: tmpData,
        blobStorageDirectory,
        externalModificationsSync: true,
        persistence: { provider: 'fs' },
        logger: store2.options.logger,
        createError: m => new Error(m),
        resolveFileExtension: () => null
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
