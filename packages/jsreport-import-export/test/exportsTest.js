process.env.DEBUG = 'jsreport'
const should = require('should')
const request = require('supertest')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const conflictsTest = require('./conflictsTest')
const saveExportStream = require('./saveExportStream')
const { unzipEntities } = require('../lib/helpers')

const encryption = { secretKey: 'demo123456789012', enabled: true }

const inMemory = { encryption: { ...encryption } }

const mongo = { encryption: { ...encryption }, store: { provider: 'mongodb' }, extensions: { 'mongodb-store': { databaseName: 'test', address: '127.0.0.1' } } }

const fsStore = { encryption: { ...encryption }, store: { provider: 'fs' } }

const postgres = {
  encryption: {
    ...encryption
  },
  store: {
    provider: 'postgres'
  },
  extensions: {
    'postgres-store': {
      host: 'localhost',
      port: 5432,
      database: 'jsreport',
      user: 'jsreport',
      password: 'foo'
    }
  }
}

describe('rest api', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      workers: { numberOfWorkers: 1 }
    })
      .use(require('../')())
      .use(require('@jsreport/jsreport-express')())

    return reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('/api/export and /api/import should get store to the original state', async () => {
    const importPath = path.join(reporter.options.tempDirectory, 'myImport.jsrexport')

    // insert a fake template
    await reporter.documentStore.collection('templates').insert({ content: 'foo', name: 'foo', engine: 'none', recipe: 'html' })

    // export store to myImport.jsrexport
    await new Promise((resolve) => {
      const exportStream = request(reporter.express.app).post('/api/export')
      exportStream.pipe(fs.createWriteStream(importPath)).on('finish', resolve)
    })

    // clean up all templates in store
    await reporter.documentStore.collection('templates').remove({})

    // import myImport.jsrexport back
    await request(reporter.express.app)
      .post('/api/import')
      .attach('import.jsrexport', importPath)
      .expect(200)

    // check if the template is back
    const res = await reporter.documentStore.collection('templates').find({})
    res.should.have.length(1)
  })

  it('should return meaningfully message when passing invalid file', () => {
    return request(reporter.express.app)
      .post('/api/import')
      .attach('wrong.jsrexport', path.join(__dirname, 'exportsTest.js'))
      .expect(400, /Unable to read export file/)
  })

  it('should return meaningfully message when there is no multipart part', () => {
    return request(reporter.express.app)
      .post('/api/import')
      .expect(400, /Unable to read export file/)
  })
})

describe('import-export', () => {
  let reporter

  describe('in memory store', () => {
    common(inMemory)
  })

  describe('fs store', () => {
    common(fsStore, (reporter) => reporter.use(require('@jsreport/jsreport-fs-store')()))
  })

  describe('mongodb store', () => {
    common(mongo, (reporter) => reporter.use(require('@jsreport/jsreport-mongodb-store')()))
  })

  describe('postgres store', function () {
    common(postgres, (reporter) => reporter.use(require('@jsreport/jsreport-postgres-store')()))
  })

  function common (options = {}, cfg = () => {}) {
    beforeEach(async () => {
      const createReporter = () => {
        const res = jsreport({
          workers: { numberOfWorkers: 1 },
          ...options
        })
          .use(require('@jsreport/jsreport-data')())
          .use(require('@jsreport/jsreport-assets')())
          .use((reporter) => {
            reporter.documentStore.registerComplexType('SecureTestingType', {
              valueRaw: { type: 'Edm.String' },
              valueSecure: { type: 'Edm.String', encrypted: true, visible: false }
            })

            reporter.documentStore.model.entityTypes.TemplateType.secureTesting = {
              type: 'jsreport.SecureTestingType'
            }

            reporter.initializeListeners.add('secure-testing', () => {
              reporter.documentStore.collection('templates').beforeInsertListeners.add('secure-testing', async (doc, req) => {
                if (!doc.secureTesting || !doc.secureTesting.valueRaw) {
                  return
                }

                doc.secureTesting.valueSecure = await reporter.encryption.encrypt(doc.secureTesting.valueRaw)
                doc.secureTesting.valueRaw = null
              })

              reporter.documentStore.collection('templates').beforeUpdateListeners.add('secure-testing', async (q, u, req) => {
                if (!u.$set.secureTesting || !u.$set.secureTesting.valueRaw) {
                  return
                }

                u.$set.secureTesting.valueSecure = await reporter.encryption.encrypt(u.$set.secureTesting.valueRaw)
                u.$set.secureTesting.valueRaw = null
              })
            })
          })
          .use(require('../')())
        cfg(res)
        return res
      }
      reporter = createReporter()

      await reporter.init()
      await reporter.documentStore.drop()
      await reporter.close()

      reporter = createReporter()

      await reporter.init()
    })

    afterEach(async () => {
      if (reporter) {
        await reporter.close()
      }
    })

    it('should contain metadata.json in export', async () => {
      const req = reporter.Request({})
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      const exportContents = await unzipEntities(exportPath)

      exportContents.metadata.should.have.properties([
        'reporterVersion',
        'importExportVersion',
        'storeProvider',
        'createdAt'
      ])
    })

    it('should be able to export import on empty db', async () => {
      const req = reporter.Request({})
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      return reporter.import(exportPath, req)
    })

    it('should be able to import and preserve _id by default', async () => {
      const req = reporter.Request({})
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})
      await reporter.import(exportPath, req)
      const res = await reporter.documentStore.collection('templates').find({})
      res.should.have.length(1)
      res[0]._id.should.be.eql(t1._id)
      res[0].name.should.be.eql('foo')
    })

    it('should be able to import and preserve shortid by default', async () => {
      const req = reporter.Request({})
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})
      await reporter.import(exportPath, req)
      const res = await reporter.documentStore.collection('templates').find({})
      res.should.have.length(1)
      res[0].shortid.should.be.eql(t1.shortid)
      res[0].name.should.be.eql('foo')
    })

    it('should be able to import and preserve _id, shortid by default', async () => {
      const req = reporter.Request({})
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})
      await reporter.import(exportPath, req)
      const res = await reporter.documentStore.collection('templates').find({})
      res.should.have.length(1)
      res[0]._id.should.be.eql(t1._id)
      res[0].shortid.should.be.eql(t1.shortid)
      res[0].name.should.be.eql('foo')
    })

    it('should be able to export encrypted properties and store it as raw value', async () => {
      const t = await reporter.documentStore.collection('templates').insert({
        name: 'secure',
        engine: 'none',
        recipe: 'html',
        secureTesting: {
          valueRaw: 'foo'
        }
      })

      reporter.encryption.isEncrypted(t.secureTesting.valueSecure).should.be.eql(true)

      const req = reporter.Request({})
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      const exportContents = await unzipEntities(exportPath)

      exportContents.entities.templates[0].secureTesting.valueSecure.should.be.eql('foo')
    })

    it('should be able to import encrypted properties and store it as encrypted value', async () => {
      const t = await reporter.documentStore.collection('templates').insert({
        name: 'secure',
        engine: 'none',
        recipe: 'html',
        secureTesting: {
          valueRaw: 'foo'
        }
      })

      reporter.encryption.isEncrypted(t.secureTesting.valueSecure).should.be.eql(true)

      const req = reporter.Request({})
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)

      await reporter.documentStore.collection('templates').remove({})

      await reporter.import(exportPath, req)

      const res = await reporter.documentStore.collection('templates').find({})

      res.should.have.length(1)
      reporter.encryption.isEncrypted(res[0].secureTesting.valueSecure).should.be.eql(true)
    })

    it('should import back deleted entity', async () => {
      const req = reporter.Request({})
      await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})
      await reporter.import(exportPath, req)
      const res = await reporter.documentStore.collection('templates').find({})
      res.should.have.length(1)
      res[0].name.should.be.eql('foo')
    })

    it('should update entity in import', async () => {
      const req = reporter.Request({})
      await reporter.documentStore.collection('templates').insert({ name: 'foo', content: 'x', engine: 'none', recipe: 'html' }, req)
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: 'y' } }, req)
      await reporter.import(exportPath, req)
      const res = await reporter.documentStore.collection('templates').find({}, req)
      res.should.have.length(1)
      res[0].name.should.be.eql('foo')
      res[0].content.should.be.eql('x')
    })

    it('should not update entity in import if there is no changes', async () => {
      const req = reporter.Request({})
      await reporter.documentStore.collection('templates').insert({ name: 'foo', content: 'x', engine: 'none', recipe: 'html' }, req)
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      const { log } = await reporter.import(exportPath, req)
      const res = await reporter.documentStore.collection('templates').find({}, req)
      log.should.containEql('No changes to import')
      res.should.have.length(1)
      res[0].name.should.be.eql('foo')
      res[0].content.should.be.eql('x')
    })

    it('should filter out entities by selection in export', async () => {
      const req = reporter.Request({})
      const e = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })
      const e2 = await reporter.documentStore.collection('templates').insert({ name: 'foo2', engine: 'none', recipe: 'html' })
      const { stream } = await reporter.export([e2._id.toString()], req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({ _id: e._id })
      await reporter.documentStore.collection('templates').remove({ _id: e2._id })
      await reporter.import(exportPath, req)
      const res = await reporter.documentStore.collection('templates').find({})
      res.should.have.length(1)
      res[0].name.should.be.eql('foo2')
    })

    it('should be able to export import folder of entity', async () => {
      await reporter.documentStore.collection('folders').insert({ name: 'level1', shortid: 'level1' })
      const e1 = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html', folder: { shortid: 'level1' } })
      const req = reporter.Request({})
      const { stream } = await reporter.export([e1._id.toString()], req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})

      // doing this because reporter.documentStore.collection('folders').remove({}) does not
      // delete all entities with mongodb store
      await Promise.all((await reporter.documentStore.collection('folders').find({})).map(async (e) => {
        return reporter.documentStore.collection('folders').remove({
          _id: e._id
        })
      }))

      await reporter.import(exportPath, req)
      const foldersRes = await reporter.documentStore.collection('folders').find({})
      const templatesRes = await reporter.documentStore.collection('templates').find({})
      foldersRes.should.have.length(1)
      templatesRes.should.have.length(1)
      foldersRes[0].name.should.be.eql('level1')
      templatesRes[0].name.should.be.eql('foo')
    })

    it('should be able to export import parent folders of entity', async () => {
      await reporter.documentStore.collection('folders').insert({ name: 'level1', shortid: 'level1' })
      await reporter.documentStore.collection('folders').insert({ name: 'level2', shortid: 'level2', folder: { shortid: 'level1' } })
      await reporter.documentStore.collection('folders').insert({ name: 'level3', shortid: 'level3', folder: { shortid: 'level2' } })
      const e1 = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html', folder: { shortid: 'level3' } })
      const req = reporter.Request({})
      const { stream } = await reporter.export([e1._id.toString()], req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})

      // doing this because reporter.documentStore.collection('folders').remove({}) does not
      // delete all entities with mongodb store
      await Promise.all((await reporter.documentStore.collection('folders').find({})).map(async (e) => {
        return reporter.documentStore.collection('folders').remove({
          _id: e._id
        })
      }))

      await reporter.import(exportPath, req)
      const foldersRes = await reporter.documentStore.collection('folders').find({})
      const templatesRes = await reporter.documentStore.collection('templates').find({})
      foldersRes.should.have.length(3)
      templatesRes.should.have.length(1)
      foldersRes.should.matchAny((f) => { f.should.have.properties({ name: 'level1' }) })
      foldersRes.should.matchAny((f) => { f.should.have.properties({ name: 'level2' }) })
      foldersRes.should.matchAny((f) => { f.should.have.properties({ name: 'level3' }) })
      templatesRes.should.matchAny((f) => { f.should.have.properties({ name: 'foo' }) })
    })

    it('should handle buffers', async () => {
      await reporter.documentStore.collection('assets').insert({ name: 'foo', content: 'foo' })
      const req = reporter.Request({})
      const { stream } = await reporter.export(undefined, req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('assets').remove({})
      await reporter.import(exportPath, req)
      const res = await reporter.documentStore.collection('assets').find({})
      res.should.have.length(1)
      res[0].content.toString().should.be.eql('foo')
    })

    it('should be able to import legacy export', async () => {
      const exportPath = path.join(__dirname, 'legacy-export.jsrexport')
      const req = reporter.Request({})
      await reporter.import(exportPath, req)
      const folderRes = await reporter.documentStore.collection('folders').find({})
      const templatesRes = await reporter.documentStore.collection('templates').find({})
      const dataRes = await reporter.documentStore.collection('data').find({})

      templatesRes.should.have.length(2)
      dataRes.should.have.length(1)

      folderRes.should.matchAny((e) => { e.should.have.properties({ name: 'templates' }) })
      folderRes.should.matchAny((e) => { e.should.have.properties({ name: 'data' }) })
      templatesRes.should.matchAny((e) => { e.should.have.properties({ name: 'foo' }) })
      templatesRes.should.matchAny((e) => { e.should.have.properties({ name: 'bar' }) })
      dataRes.should.matchAny((e) => { e.should.have.properties({ name: 'foo-data' }) })
    })

    it('should be able to import into target folder', async () => {
      const e1 = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })
      const req = reporter.Request({})
      const { stream } = await reporter.export([e1._id.toString()], req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})

      const targetFolder = await reporter.documentStore.collection('folders').insert({ name: 'target', shortid: 'target' })

      await reporter.import(exportPath, {
        targetFolder: targetFolder.shortid
      }, req)

      const foldersRes = await reporter.documentStore.collection('folders').find({})
      const templatesRes = await reporter.documentStore.collection('templates').find({})
      foldersRes.should.have.length(1)
      templatesRes.should.have.length(1)
      foldersRes[0].name.should.be.eql(targetFolder.name)
      templatesRes[0].name.should.be.eql(e1.name)
      templatesRes[0].folder.shortid.should.be.eql(targetFolder.shortid)
    })

    it('should be able to import into target folder (root entity explicitly contains folder: null)', async () => {
      const e1 = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html', folder: null })
      const req = reporter.Request({})
      const { stream } = await reporter.export([e1._id.toString()], req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})

      const targetFolder = await reporter.documentStore.collection('folders').insert({ name: 'target', shortid: 'target' })

      await reporter.import(exportPath, {
        targetFolder: targetFolder.shortid
      }, req)

      const foldersRes = await reporter.documentStore.collection('folders').find({})
      const templatesRes = await reporter.documentStore.collection('templates').find({})
      foldersRes.should.have.length(1)
      templatesRes.should.have.length(1)
      foldersRes[0].name.should.be.eql(targetFolder.name)
      templatesRes[0].name.should.be.eql(e1.name)
      templatesRes[0].folder.shortid.should.be.eql(targetFolder.shortid)
    })

    it('should be able to import into target folder (folder restored)', async () => {
      await reporter.documentStore.collection('folders').insert({ name: 'level1', shortid: 'level1' })
      const e1 = await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html', folder: { shortid: 'level1' } })
      const req = reporter.Request({})
      const { stream } = await reporter.export([e1._id.toString()], req)
      const exportPath = await saveExportStream(reporter, stream)
      await reporter.documentStore.collection('templates').remove({})

      // doing this because reporter.documentStore.collection('folders').remove({}) does not
      // delete all entities with mongodb store
      await Promise.all((await reporter.documentStore.collection('folders').find({})).map(async (e) => {
        return reporter.documentStore.collection('folders').remove({
          _id: e._id
        })
      }))

      const targetFolder = await reporter.documentStore.collection('folders').insert({ name: 'target', shortid: 'target' })

      await reporter.import(exportPath, {
        targetFolder: targetFolder.shortid
      }, req)

      const foldersRes = await reporter.documentStore.collection('folders').find({})
      const templatesRes = await reporter.documentStore.collection('templates').find({})
      foldersRes.should.have.length(2)
      templatesRes.should.have.length(1)
      foldersRes.find((f) => f.folder && f.folder.shortid === 'target').name.should.be.eql('level1')
    })

    it('should be able to handle full import mode (delete extra entities) and preserve _id', async () => {
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'a', engine: 'none', recipe: 'html' })
      const t2 = await reporter.documentStore.collection('templates').insert({ name: 'b', engine: 'none', recipe: 'html' })
      const req = reporter.Request({})

      const { stream } = await reporter.export([
        t1._id.toString(),
        t2._id.toString()
      ], req)

      const exportPath = await saveExportStream(reporter, stream)

      await reporter.documentStore.collection('templates').insert({ name: 'c', engine: 'none', recipe: 'html' })

      await reporter.import(exportPath, {
        fullImport: true
      }, req)

      const templatesRes = await reporter.documentStore.collection('templates').find({})

      templatesRes.should.have.length(2)

      const allExpectedTemplates = [t1, t2]

      allExpectedTemplates.forEach((t) => {
        templatesRes.should.matchAny((e) => e._id.toString().should.be.eql(t._id.toString()))
      })
    })

    it('should be able to handle full import mode (delete extra entities) and preserve shortid', async () => {
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'a', engine: 'none', recipe: 'html' })
      const t2 = await reporter.documentStore.collection('templates').insert({ name: 'b', engine: 'none', recipe: 'html' })
      const req = reporter.Request({})

      const { stream } = await reporter.export([
        t1._id.toString(),
        t2._id.toString()
      ], req)

      const exportPath = await saveExportStream(reporter, stream)

      await reporter.documentStore.collection('templates').insert({ name: 'c', engine: 'none', recipe: 'html' })

      await reporter.import(exportPath, {
        fullImport: true
      }, req)

      const templatesRes = await reporter.documentStore.collection('templates').find({})

      templatesRes.should.have.length(2)

      const allExpectedTemplates = [t1, t2]

      allExpectedTemplates.forEach((t) => {
        templatesRes.should.matchAny((e) => e.shortid.toString().should.be.eql(t.shortid.toString()))
      })
    })

    it('should be able to handle full import mode (delete extra entities) and preserve _id, shortid', async () => {
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'a', engine: 'none', recipe: 'html' })
      const t2 = await reporter.documentStore.collection('templates').insert({ name: 'b', engine: 'none', recipe: 'html' })
      const req = reporter.Request({})

      const { stream } = await reporter.export([
        t1._id.toString(),
        t2._id.toString()
      ], req)

      const exportPath = await saveExportStream(reporter, stream)

      await reporter.documentStore.collection('templates').insert({ name: 'c', engine: 'none', recipe: 'html' })

      await reporter.import(exportPath, {
        fullImport: true
      }, req)

      const templatesRes = await reporter.documentStore.collection('templates').find({})

      templatesRes.should.have.length(2)

      const allExpectedTemplates = [t1, t2]

      allExpectedTemplates.forEach((t) => {
        templatesRes.should.matchAny((e) => e._id.toString().should.be.eql(t._id.toString()))
        templatesRes.should.matchAny((e) => e.shortid.toString().should.be.eql(t.shortid.toString()))
      })
    })

    it('should be able to handle full import mode (entity should be restored to the state inside the export file)', async () => {
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'a', content: 'a', engine: 'none', recipe: 'html' })

      const req = reporter.Request({})

      const { stream } = await reporter.export([
        t1._id.toString()
      ], req)

      const exportPath = await saveExportStream(reporter, stream)

      await reporter.documentStore.collection('templates').update({
        _id: t1._id
      }, {
        $set: {
          content: 'new content',
          extraProp: 'foo'
        }
      })

      await reporter.import(exportPath, {
        fullImport: true
      }, req)

      const templatesRes = await reporter.documentStore.collection('templates').find({})

      templatesRes.should.have.length(1)

      const importedT1 = templatesRes[0]

      importedT1.content.should.be.eql('a')
      should(importedT1.extraProp).be.undefined()
    })

    it('should be able to handle full import mode (keep folder and delete extra entities inside it)', async () => {
      const f1 = await reporter.documentStore.collection('folders').insert({ name: 'folder1', shortid: 'folder1' })
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'a', engine: 'none', recipe: 'html', folder: { shortid: 'folder1' } })

      const req = reporter.Request({})

      const { stream } = await reporter.export([
        f1._id.toString(),
        t1._id.toString()
      ], req)

      const exportPath = await saveExportStream(reporter, stream)

      await reporter.documentStore.collection('templates').insert({ name: 'b', engine: 'none', recipe: 'html', folder: { shortid: 'folder1' } })

      await reporter.import(exportPath, {
        fullImport: true
      }, req)

      const foldersRes = await reporter.documentStore.collection('folders').find({})
      const templatesRes = await reporter.documentStore.collection('templates').find({})

      foldersRes.should.have.length(1)
      templatesRes.should.have.length(1)

      foldersRes[0]._id.should.be.eql(f1._id)
      templatesRes[0]._id.should.be.eql(t1._id)
    })

    it('should be able to handle full import mode (folders and sub-folders)', async () => {
      const t1 = await reporter.documentStore.collection('templates').insert({ name: 'a', engine: 'none', recipe: 'html' })
      const t2 = await reporter.documentStore.collection('templates').insert({ name: 'b', engine: 'none', recipe: 'html' })
      const f1 = await reporter.documentStore.collection('folders').insert({ name: 'level1', shortid: 'level1' })
      const t3 = await reporter.documentStore.collection('templates').insert({ name: 'c', engine: 'none', recipe: 'html', folder: { shortid: 'level1' } })
      const f2 = await reporter.documentStore.collection('folders').insert({ name: 'level2', shortid: 'level2', folder: { shortid: 'level1' } })
      const t4 = await reporter.documentStore.collection('templates').insert({ name: 'd', engine: 'none', recipe: 'html', folder: { shortid: 'level2' } })

      const req = reporter.Request({})

      const { stream } = await reporter.export([
        f1._id.toString(),
        f2._id.toString(),
        t1._id.toString(),
        t2._id.toString(),
        t3._id.toString(),
        t4._id.toString()
      ], req)

      const exportPath = await saveExportStream(reporter, stream)

      await Promise.all((await reporter.documentStore.collection('templates').find({})).map(async (e) => {
        return reporter.documentStore.collection('templates').remove({
          _id: e._id
        })
      }))

      await Promise.all((await reporter.documentStore.collection('folders').find({})).map(async (e) => {
        return reporter.documentStore.collection('folders').remove({
          _id: e._id
        })
      }))

      await reporter.documentStore.collection('templates').insert({ name: 'e', engine: 'none', recipe: 'html' })
      await reporter.documentStore.collection('templates').insert({ name: 'f', engine: 'none', recipe: 'html' })
      await reporter.documentStore.collection('folders').insert({ name: 'nlevel1', shortid: 'nlevel1' })
      await reporter.documentStore.collection('templates').insert({ name: 'g', engine: 'none', recipe: 'html', folder: { shortid: 'nlevel1' } })

      await reporter.import(exportPath, {
        fullImport: true
      }, req)

      const foldersRes = await reporter.documentStore.collection('folders').find({})
      const templatesRes = await reporter.documentStore.collection('templates').find({})

      foldersRes.should.have.length(2)
      templatesRes.should.have.length(4)

      const allExpectedTemplates = [t1, t2, t3, t4]
      const allExpectedFolders = [f1, f2]

      allExpectedTemplates.forEach((t) => {
        templatesRes.should.matchAny((e) => e._id.toString().should.be.eql(t._id.toString()))
      })

      allExpectedFolders.forEach((f) => {
        foldersRes.should.matchAny((e) => e._id.toString().should.be.eql(f._id.toString()))
      })
    })

    describe('conflict handling', () => {
      conflictsTest(() => reporter)
    })
  }
})

/*
describe('exports across stores', function () {
  describe('from fs to mongo', function () {
    test(fsStore, mongo)
  })

  describe('from mongo to fs', function () {
    test(mongo, fsStore)
  })

  describe('from fs to postgres', function () {
    test(fsStore, postgres)
  })

  describe('from postgres to fs', function () {
    test(postgres, fsStore)
  })

  describe('from mongo to postgres', function () {
    test(mongo, postgres)
  })

  describe('from postgres to mongo', function () {
    test(postgres, mongo)
  })

  function test (options, options2) {
    var reporter1
    var reporter2

    beforeEach(function () {
      reporter1 = new Reporter(options)
        .use(Object.assign({}, require('@jsreport/jsreport-fs-store')()))
        .use(Object.assign({}, require('@jsreport/jsreport-mongodb-store')()))
        .use(Object.assign({}, require('@jsreport/jsreport-postgres-store')()))
        .use(require('../')())

      reporter2 = new Reporter(options2)
        .use(Object.assign({}, require('@jsreport/jsreport-fs-store')()))
        .use(Object.assign({}, require('@jsreport/jsreport-mongodb-store')()))
        .use(Object.assign({}, require('@jsreport/jsreport-postgres-store')()))
        .use(require('../')())

      return reporter1.init().then(function () {
        return reporter2.init()
      }).then(function () {
        return reporter1.documentStore.drop()
      }).then(function () {
        return reporter2.documentStore.drop()
      }).then(function () {
        return reporter1.init()
      }).then(function () {
        return reporter2.init()
      })
    })

    it('should export import', function () {
      return reporter1.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' }).then(function () {
        return reporter1.export().then(function (stream) {
          return saveExportStream(reporter, stream).then(function (exportPath) {
            return reporter2.import(exportPath)
          })
        }).then(function () {
          return reporter2.documentStore.collection('templates').find({}).then(function (res) {
            res.should.have.length(1)
            res[0].name.should.be.eql('foo')
          })
        })
      })
    })
  }
})
*/
