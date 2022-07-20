const should = require('should')
const core = require('../../index')
const RenderRequest = core.Request

function init (options) {
  const reporter = core({ discover: false, ...options })

  reporter.use({
    name: 'testing',
    main: (reporter, definition) => {
      reporter.documentStore.registerEntityType('DataType', {
        name: { type: 'Edm.String' },
        dataJson: { type: 'Edm.String', document: { extension: 'json' } }
      })

      reporter.documentStore.registerComplexType('DataItemRefType', {
        shortid: { type: 'Edm.String', referenceTo: 'data' }
      })

      reporter.documentStore.registerEntitySet('data', { entityType: 'jsreport.DataType' })

      reporter.documentStore.model.entityTypes.TemplateType.data = {
        // this makes the reference to accept null also when validating with json schema
        type: 'jsreport.DataItemRefType', schema: { type: 'null' }
      }

      reporter.documentStore.registerEntityType('ReportType', {
        name: { type: 'Edm.String' }
      })

      reporter.documentStore.registerEntitySet('reports', { entityType: 'jsreport.ReportType' })
    }
  }).use(core.tests.listeners())

  return reporter.init()
}

describe('folders', function () {
  let reporter

  beforeEach(async () => {
    reporter = await init()
  })

  afterEach(() => reporter.close())

  describe('basic', () => {
    it('should extend entities model', () => {
      reporter.documentStore.model.entityTypes.TemplateType.should.have.property('folder')
      reporter.documentStore.model.entityTypes.should.have.property('FolderType')
      reporter.documentStore.model.entitySets.should.have.property('folders')
    })

    it('remove of folder should remove all entities', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b',
        folder: {
          shortid: 'a'
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'b'
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'd',
        shortid: 'd',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'b'
        }
      })

      await reporter.documentStore.collection('folders').remove({ name: 'a' })
      const folders = await reporter.documentStore.collection('folders').find({})
      const templates = await reporter.documentStore.collection('templates').find({})

      folders.should.have.length(0)
      templates.should.have.length(0)
    })

    it('getEntitiesInFolder should return empty array when no child', async () => {
      const f1 = await reporter.documentStore.collection('folders').insert({
        name: 'f1',
        shortid: 'f1'
      })

      const entities = await reporter.folders.getEntitiesInFolder(f1.shortid, false)

      entities.should.have.length(0)
    })

    it('getEntitiesInFolder should return entities present in folder', async () => {
      const f1 = await reporter.documentStore.collection('folders').insert({
        name: 'f1',
        shortid: 'f1'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 't1',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: f1.shortid
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 't2',
        engine: 'none',
        recipe: 'html'
      })

      const f2 = await reporter.documentStore.collection('folders').insert({
        name: 'f2',
        shortid: 'f2',
        folder: {
          shortid: f1.shortid
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 't3',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: f2.shortid
        }
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'f3',
        shortid: 'f3',
        folder: {
          shortid: f1.shortid
        }
      })

      const entities = await reporter.folders.getEntitiesInFolder(f1.shortid, false)

      entities.should.have.length(3)

      entities.should.matchAny((e) => e.entitySet.should.be.eql('templates') && e.entity.name.should.be.eql('t1'))
      entities.should.matchAny((e) => e.entitySet.should.be.eql('folders') && e.entity.name.should.be.eql('f2'))
      entities.should.matchAny((e) => e.entitySet.should.be.eql('folders') && e.entity.name.should.be.eql('f3'))
    })

    it('getEntitiesInFolder should return entities recursively in folder', async () => {
      const f1 = await reporter.documentStore.collection('folders').insert({
        name: 'f1',
        shortid: 'f1'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 't1',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: f1.shortid
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 't2',
        engine: 'none',
        recipe: 'html'
      })

      const f2 = await reporter.documentStore.collection('folders').insert({
        name: 'f2',
        shortid: 'f2',
        folder: {
          shortid: f1.shortid
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 't3',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: f2.shortid
        }
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'f3',
        shortid: 'f3',
        folder: {
          shortid: f1.shortid
        }
      })

      const f4 = await reporter.documentStore.collection('folders').insert({
        name: 'f4',
        shortid: 'f4',
        folder: {
          shortid: f2.shortid
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 't4',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: f4.shortid
        }
      })

      const entities = await reporter.folders.getEntitiesInFolder(f1.shortid, true)

      entities.should.have.length(6)

      entities.should.matchAny((e) => e.entitySet.should.be.eql('folders') && e.entity.name.should.be.eql('f2'))
      entities.should.matchAny((e) => e.entitySet.should.be.eql('folders') && e.entity.name.should.be.eql('f3'))
      entities.should.matchAny((e) => e.entitySet.should.be.eql('templates') && e.entity.name.should.be.eql('t1'))
      entities.should.matchAny((e) => e.entitySet.should.be.eql('folders') && e.entity.name.should.be.eql('f4'))
      entities.should.matchAny((e) => e.entitySet.should.be.eql('templates') && e.entity.name.should.be.eql('t3'))
      entities.should.matchAny((e) => e.entitySet.should.be.eql('templates') && e.entity.name.should.be.eql('t4'))
    })

    it('resolveEntityPath should return full hierarchy path of entity', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b',
        folder: {
          shortid: 'a'
        }
      })

      const t = await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'b'
        }
      })

      const fullPath = await reporter.folders.resolveEntityPath(t, 'templates')
      fullPath.should.be.eql('/a/b/c')
    })

    it('resolveEntityPath should throw when some part of the hierarchy does not exists', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })

      const t = await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'none'
        }
      })

      return reporter.folders.resolveEntityPath(t, 'templates').should.be.rejectedWith(/Folder with shortid/)
    })

    it('resolveFolderFromPath should resolve folder from absolute path', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const folder = await reporter.folders.resolveFolderFromPath('/a/b')
      folder.shortid.should.be.eql('a')
    })

    it('resolveFolderFromPath should resolve folder from absolute path (last part is folder)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b',
        folder: {
          shortid: 'a'
        }
      })

      const folder = await reporter.folders.resolveFolderFromPath('/a/b')
      folder.shortid.should.be.eql('b')
    })

    it('resolveFolderFromPath should resolve folder from absolute path with spaces', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const folder = await reporter.folders.resolveFolderFromPath('/a a/b')
      folder.shortid.should.be.eql('a')
    })

    it('resolveFolderFromPath should resolve folder from absolute path with %', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a%a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const folder = await reporter.folders.resolveFolderFromPath('/a%a/b')
      folder.shortid.should.be.eql('a')
    })

    it('resolveFolderFromPath should return null for root objects', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html'
      })

      const folder = await reporter.folders.resolveFolderFromPath('/a/b')
      should(folder).be.null()
    })

    it('resolveFolderFromPath should not return folder for un-existing parent', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      const folder = await reporter.folders.resolveFolderFromPath('/unknown/b')
      should(folder).be.null()
    })

    it('resolveFolderFromPath should not return folder for un-existing path', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'd',
        shortid: 'd',
        folder: { shortid: 'b' }
      })

      const folder = await reporter.folders.resolveFolderFromPath('/unknown/b/another/d')
      should(folder).be.null()
    })

    it('resolveFolderFromPath should resolve folder from relative path', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      const folder = await reporter.folders.resolveFolderFromPath('../b', RenderRequest({
        context: {
          currentFolderPath: '/a'
        }
      }))
      folder.shortid.should.be.eql('b')
    })

    it('resolveEntityFromPath should resolve entity from absolute path', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const { entitySet, entity } = await reporter.folders.resolveEntityFromPath('/a/b')
      entitySet.should.be.eql('templates')
      entity.name.should.be.eql('b')
    })

    it('resolveEntityFromPath should resolve entity from absolute path (target entitySet)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const { entitySet, entity } = await reporter.folders.resolveEntityFromPath('/a/b', 'templates')
      entitySet.should.be.eql('templates')
      entity.name.should.be.eql('b')
    })

    it('resolveEntityFromPath should resolve entity from absolute path with spaces', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const { entitySet, entity } = await reporter.folders.resolveEntityFromPath('/a a/b')
      entitySet.should.be.eql('templates')
      entity.name.should.be.eql('b')
    })

    it('resolveEntityFromPath should resolve entity from absolute path with %', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a%a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const { entitySet, entity } = await reporter.folders.resolveEntityFromPath('/a%a/b')
      entitySet.should.be.eql('templates')
      entity.name.should.be.eql('b')
    })

    it('resolveEntityFromPath should resolve entity from absolute path with spaces (target entitySet)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const { entitySet, entity } = await reporter.folders.resolveEntityFromPath('/a a/b', 'templates')
      entitySet.should.be.eql('templates')
      entity.name.should.be.eql('b')
    })

    it('resolveEntityFromPath should resolve entity from absolute path with % (target entitySet)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a%a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'a'
        }
      })

      const { entitySet, entity } = await reporter.folders.resolveEntityFromPath('/a%a/b', 'templates')
      entitySet.should.be.eql('templates')
      entity.name.should.be.eql('b')
    })

    it('resolveEntityFromPath should return empty for not found', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html'
      })

      const result = await reporter.folders.resolveEntityFromPath('/c')
      should(result).be.not.ok()
    })

    it('resolveEntityFromPath should return empty for not found (target entitySet)', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html'
      })

      const result = await reporter.folders.resolveEntityFromPath('/c', 'templates')
      should(result).be.not.ok()
    })

    it('resolveEntityFromPath should not return entity for un-existing parent', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      const result = await reporter.folders.resolveEntityFromPath('/unknown/b')
      should(result).be.not.ok()
    })

    it('resolveEntityFromPath should not return entity for un-existing parent (target entitySet)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      const result = await reporter.folders.resolveEntityFromPath('/unknown/b', 'folders')
      should(result).be.not.ok()
    })

    it('resolveEntityFromPath should not return entity for un-existing path', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'd',
        shortid: 'd',
        folder: { shortid: 'b' }
      })

      const result = await reporter.folders.resolveEntityFromPath('/unknown/b/another/d')
      should(result).be.not.ok()
    })

    it('resolveEntityFromPath should not return entity for un-existing path (target entitySet)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'd',
        shortid: 'd',
        folder: { shortid: 'b' }
      })

      const result = await reporter.folders.resolveEntityFromPath('/unknown/b/another/d', 'folders')
      should(result).be.not.ok()
    })

    it('resolveEntityFromPath should resolve entity from relative path', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      const result = await reporter.folders.resolveEntityFromPath('../b', undefined, RenderRequest({
        context: {
          currentFolderPath: '/a'
        }
      }))

      result.entitySet.should.be.eql('folders')
      result.entity.shortid.should.be.eql('b')
    })

    it('resolveEntityFromPath should resolve entity from relative path (target entitySet)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      const result = await reporter.folders.resolveEntityFromPath('../b', 'folders', RenderRequest({
        context: {
          currentFolderPath: '/a'
        }
      }))

      result.entitySet.should.be.eql('folders')
      result.entity.shortid.should.be.eql('b')
    })

    it('resolveEntityFromPath should not resolve entity if it does not match target entitySet', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      const result = await reporter.folders.resolveEntityFromPath('/a/b', 'templates')

      should(result).not.be.ok()
    })

    it('inserting splited entitity into root with reserved name should be blocked', () => {
      return reporter.documentStore.collection('folders').insert({
        name: 'reports'
      }).should.be.rejected()
    })

    it('inserting splited entitity into nested dir with reserved name should be fine', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'ok',
        shortid: 'ok'
      })
      return reporter.documentStore.collection('folders').insert({
        name: 'reports',
        folder: {
          shortid: 'ok'
        }
      })
    })

    it('inserting splitted entity should be always fine', () => {
      return reporter.documentStore.collection('reports').insert({
        name: 'reports'
      })
    })

    it('inserting splited entity into root with not reserved name should be fine', () => {
      return reporter.documentStore.collection('folders').insert({
        name: 'templates'
      })
    })

    it('renaming splited entitity to reserved name should be be rejected', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'ok',
        shortid: 'ok'
      })
      return reporter.documentStore.collection('folders').update({ name: 'ok' }, { $set: { name: 'reports' } }).should.be.rejected()
    })

    it('upsert reserved name should be rejected', async () => {
      return reporter.documentStore.collection('folders').update({
        name: 'reports'
      }, {
        $set: {
          name: 'reports'
        }
      }, {
        upsert: true
      }).should.be.rejected()
    })

    it('inserting duplicated entity name into the root should fail', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'duplicate',
        shortid: 'duplicate'
      })

      return reporter.documentStore.collection('templates').insert({
        name: 'duplicate',
        engine: 'none',
        recipe: 'html'
      }).should.be.rejectedWith({ code: 'DUPLICATED_ENTITY' })
    })

    it('upsert duplicated entity name into the root should fail', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'duplicate',
        shortid: 'duplicate'
      })

      return reporter.documentStore.collection('templates').update({
        name: 'duplicate'
      }, {
        $set: {
          name: 'duplicate',
          shortid: 'duplicate2'
        }
      }, {
        upsert: true
      }).should.be.rejectedWith({ code: 'DUPLICATED_ENTITY' })
    })

    it('inserting duplicated entity name into different folder should work', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'duplicate',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'a' }
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'duplicate',
        shortid: 'd',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'b' }
      })
    })

    it('upsert duplicated entity name into different folder should work', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'duplicate',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'a' }
      })
      await reporter.documentStore.collection('templates').update({
        shortid: 'd'
      }, {
        $set: {
          name: 'duplicate',
          shortid: 'd',
          folder: { shortid: 'b' }
        }
      }, {
        upsert: true
      })
    })

    it('inserting duplicated entity name into the nested should fail', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'duplicate',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'a' }
      })

      return reporter.documentStore.collection('templates').insert({
        name: 'duplicate',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'a' }
      }).should.be.rejected()
    })

    it('upsert duplicated entity name into the nested should fail', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'duplicate',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'a' }
      })

      return reporter.documentStore.collection('templates').update({
        shortid: 'c'
      }, {
        $set: {
          name: 'duplicate',
          shortid: 'c',
          folder: { shortid: 'a' }
        }
      }, {
        upsert: true
      }).should.be.rejected()
    })

    it('should not validate duplicated name for the current entity', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        content: 'a'
      })

      return reporter.documentStore.collection('templates').update({ name: 'a' }, { $set: { name: 'a', content: 'foo' } })
    })

    it('should not validate duplicated name for the current entity (upsert)', async () => {
      return reporter.documentStore.collection('templates').update({
        name: 'a'
      }, {
        $set: { name: 'a', shortid: 'a', content: 'foo' }
      }, {
        upsert: true
      })
    })

    it('duplicate entity name validation should be case insensitive', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        content: 'a'
      })

      reporter.documentStore.collection('templates').insert({
        name: 'A',
        shortid: 'A',
        engine: 'none',
        recipe: 'html',
        content: 'a'
      }).should.be.rejected()
    })

    it('resolveEntityFromPath should work also in proxy', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b',
        folder: {
          shortid: 'a'
        }
      })

      reporter.tests.beforeRenderEval(async (req, res, { reporter }) => {
        const proxy = reporter.createProxy({ req })
        const { entity } = await proxy.folders.resolveEntityFromPath('/a/b', 'folders')
        req.template.content = entity.name
      })

      const res = await reporter.render({
        template: {
          content: 'hello',
          engine: 'none',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('b')
    })
  })

  describe('move/copy', () => {
    it('should reject when updating folder and the name is duplicated', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'aa',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'a' }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'ab',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'b' }
      })

      return reporter.documentStore.collection('templates').update(
        { shortid: 'ab' },
        { $set: { folder: { shortid: 'a' } } }).should.be.rejected()
    })

    it('should reject when updating entity to the root and there is duplicate', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'folder',
        shortid: 'a'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'aa',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: 'a' }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'ar',
        engine: 'none',
        recipe: 'html'
      })

      return reporter.documentStore.collection('templates').update(
        { shortid: 'aa' },
        { $set: { folder: null } }).should.be.rejected()
    })

    it('should move file', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: a._id
        },
        target: {
          shortid: folder2.shortid
        }
      })

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder2.should.eql(['a', 'c'])
    })

    it('should move folder', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'folders',
          id: folder2._id
        },
        target: {
          shortid: folder1.shortid
        }
      })

      const foldersInFolder1 = (await reporter.documentStore.collection('folders').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      foldersInFolder1.should.eql(['folder2'])
      templatesInFolder1.should.eql(['a', 'b'])
      templatesInFolder2.should.eql(['c'])
    })

    it('should copy file', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: a._id
        },
        target: {
          shortid: folder2.shortid
        },
        shouldCopy: true
      })

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder1.should.eql(['a', 'b'])
      templatesInFolder2.should.eql(['a', 'c'])
    })

    it('should copy folder', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const c = await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'folders',
          id: folder2._id
        },
        target: {
          shortid: folder1.shortid
        },
        shouldCopy: true
      })

      const folders = await reporter.documentStore.collection('folders').find({})
      const templates = await reporter.documentStore.collection('templates').find({})

      folders.should.have.length(3)
      templates.should.have.length(4)

      folders.should.matchAny((f) => f.name.should.be.eql('folder1') && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.shortid.should.be.eql(folder2.shortid) && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.folder && f.folder.shortid.should.be.eql(folder1.shortid) && f.shortid.should.be.not.eql(folder2.shortid))

      templates.should.matchAny((t) => t.name.should.be.eql('a') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('b') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('c') && t.shortid.should.be.eql(c.shortid) && t.folder.shortid.should.be.eql(folder2.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('c') && t.shortid.should.be.not.eql(c.shortid) && t.folder.shortid.should.be.not.eql(folder2.shortid))
    })

    it('should copy folder and fix references', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const data = await reporter.documentStore.collection('data').insert({
        name: 'data',
        shortid: 'data',
        folder: { shortid: folder2.shortid }
      })

      const b = await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        data: {
          shortid: data.shortid
        },
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'folders',
          id: folder2._id
        },
        target: {
          shortid: folder1.shortid
        },
        shouldCopy: true
      })

      const folders = await reporter.documentStore.collection('folders').find({})
      const templates = await reporter.documentStore.collection('templates').find({})
      const dataItems = await reporter.documentStore.collection('data').find({})

      folders.should.have.length(3)
      templates.should.have.length(3)
      dataItems.should.have.length(2)

      folders.should.matchAny((f) => f.name.should.be.eql('folder1') && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.shortid.should.be.eql(folder2.shortid) && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.folder && f.folder.shortid.should.be.eql(folder1.shortid) && f.shortid.should.be.not.eql(folder2.shortid))

      dataItems.should.matchAny((d) => d.name.should.be.eql('data') && d.shortid.should.be.eql(data.shortid) && d.folder.shortid.should.be.eql(folder2.shortid))
      dataItems.should.matchAny((d) => d.name.should.be.eql('data') && d.shortid.should.be.not.eql(data.shortid) && d.folder.shortid.should.be.not.eql(folder2.shortid))

      templates.should.matchAny((t) => t.name.should.be.eql('a') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('b') && t.shortid.should.be.eql(b.shortid) && t.data.shortid.should.be.eql(data.shortid) && t.folder.shortid.should.be.eql(folder2.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('b') && t.shortid.should.be.not.eql(b.shortid) && t.data.shortid.should.be.not.eql(data.shortid) && t.folder.shortid.should.be.not.eql(folder2.shortid))
    })

    it('should copy multiple entities', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const b = await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: [{
          entitySet: 'templates',
          id: a._id
        }, {
          entitySet: 'templates',
          id: b._id
        }],
        target: {
          shortid: folder2.shortid
        },
        shouldCopy: true
      })

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder1.should.eql(['a', 'b'])
      templatesInFolder2.should.eql(['a', 'b', 'c'])
    })

    it('should copy multiple folders', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      const folder3 = await reporter.documentStore.collection('folders').insert({
        name: 'folder3',
        shortid: 'folder3'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const c = await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      const d = await reporter.documentStore.collection('templates').insert({
        name: 'd',
        shortid: 'd',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder3.shortid }
      })

      await reporter.folders.move({
        source: [{
          entitySet: 'folders',
          id: folder2._id
        }, {
          entitySet: 'folders',
          id: folder3._id
        }],
        target: {
          shortid: folder1.shortid
        },
        shouldCopy: true
      })

      const folders = await reporter.documentStore.collection('folders').find({})
      const templates = await reporter.documentStore.collection('templates').find({})

      folders.should.have.length(5)
      templates.should.have.length(6)

      folders.should.matchAny((f) => f.name.should.be.eql('folder1') && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.shortid.should.be.eql(folder2.shortid) && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.folder && f.folder.shortid.should.be.eql(folder1.shortid) && f.shortid.should.be.not.eql(folder2.shortid))
      folders.should.matchAny((f) => f.name.should.be.eql('folder3') && f.shortid.should.be.eql(folder3.shortid) && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder3') && f.folder && f.folder.shortid.should.be.eql(folder1.shortid) && f.shortid.should.be.not.eql(folder3.shortid))

      templates.should.matchAny((t) => t.name.should.be.eql('a') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('b') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('c') && t.shortid.should.be.eql(c.shortid) && t.folder.shortid.should.be.eql(folder2.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('c') && t.shortid.should.be.not.eql(c.shortid) && t.folder.shortid.should.be.not.eql(folder2.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('d') && t.shortid.should.be.eql(d.shortid) && t.folder.shortid.should.be.eql(folder3.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('d') && t.shortid.should.be.not.eql(d.shortid) && t.folder.shortid.should.be.not.eql(folder3.shortid))
    })

    it('should copy multiple entities and folders', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      const folder3 = await reporter.documentStore.collection('folders').insert({
        name: 'folder3',
        shortid: 'folder3'
      })

      const rootA = await reporter.documentStore.collection('templates').insert({
        name: 'rootA',
        shortid: 'rootA',
        engine: 'none',
        recipe: 'html'
      })

      const rootB = await reporter.documentStore.collection('templates').insert({
        name: 'rootB',
        shortid: 'rootB',
        engine: 'none',
        recipe: 'html'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const c = await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      const d = await reporter.documentStore.collection('templates').insert({
        name: 'd',
        shortid: 'd',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder3.shortid }
      })

      await reporter.folders.move({
        source: [{
          entitySet: 'templates',
          id: rootA._id
        }, {
          entitySet: 'templates',
          id: rootB._id
        }, {
          entitySet: 'folders',
          id: folder2._id
        }, {
          entitySet: 'folders',
          id: folder3._id
        }],
        target: {
          shortid: folder1.shortid
        },
        shouldCopy: true
      })

      const folders = await reporter.documentStore.collection('folders').find({})
      const templates = await reporter.documentStore.collection('templates').find({})

      folders.should.have.length(5)
      templates.should.have.length(10)

      folders.should.matchAny((f) => f.name.should.be.eql('folder1') && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.shortid.should.be.eql(folder2.shortid) && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.folder && f.folder.shortid.should.be.eql(folder1.shortid) && f.shortid.should.be.not.eql(folder2.shortid))
      folders.should.matchAny((f) => f.name.should.be.eql('folder3') && f.shortid.should.be.eql(folder3.shortid) && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder3') && f.folder && f.folder.shortid.should.be.eql(folder1.shortid) && f.shortid.should.be.not.eql(folder3.shortid))

      templates.should.matchAny((t) => t.name.should.be.eql('rootA') && should(t.folder).be.not.ok())
      templates.should.matchAny((t) => t.name.should.be.eql('rootA') && t.shortid.should.be.not.eql(rootA.shortid) && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('rootB') && should(t.folder).be.not.ok())
      templates.should.matchAny((t) => t.name.should.be.eql('rootB') && t.shortid.should.be.not.eql(rootB.shortid) && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('a') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('b') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('c') && t.shortid.should.be.eql(c.shortid) && t.folder.shortid.should.be.eql(folder2.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('c') && t.shortid.should.be.not.eql(c.shortid) && t.folder.shortid.should.be.not.eql(folder2.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('d') && t.shortid.should.be.eql(d.shortid) && t.folder.shortid.should.be.eql(folder3.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('d') && t.shortid.should.be.not.eql(d.shortid) && t.folder.shortid.should.be.not.eql(folder3.shortid))
    })

    it('should replace when found duplicate during move file', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        content: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const bInFolder2 = await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b2',
        content: 'b2',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: bInFolder2._id
        },
        target: {
          shortid: folder1.shortid
        },
        shouldCopy: false,
        shouldReplace: true
      })

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      }))

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      }))

      templatesInFolder1.map((e) => e.name).sort().should.eql(['a', 'b'])
      templatesInFolder2.map((e) => e.name).sort().should.eql([])

      templatesInFolder1.find((e) => e.name === 'b').content.should.eql('b2')
    })

    it('should replace when found duplicate during copy file', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        content: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const bInFolder2 = await reporter.documentStore.collection('templates').insert({
        name: 'b',
        content: 'b2',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: bInFolder2._id
        },
        target: {
          shortid: folder1.shortid
        },
        shouldCopy: true,
        shouldReplace: true
      })

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      }))

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      }))

      templatesInFolder1.map((e) => e.name).sort().should.eql(['a', 'b'])
      templatesInFolder2.map((e) => e.name).sort().should.eql(['b'])

      templatesInFolder1.find((e) => e.name === 'b').content.should.eql('b2')
      templatesInFolder2.find((e) => e.name === 'b').content.should.eql('b2')
    })

    it('should produce copies with different name automatically when copying multiple entities and duplicates found', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const b = await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a2',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b2',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: [{
          entitySet: 'templates',
          id: a._id
        }, {
          entitySet: 'templates',
          id: b._id
        }],
        target: {
          shortid: folder2.shortid
        },
        shouldCopy: true
      })

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder1.should.eql(['a', 'b'])
      templatesInFolder2.should.eql(['a', 'a(copy)', 'b', 'b(copy)', 'c'])
    })

    it('should produce copies with different name automatically when copying multiple folders and duplicates found', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2-1',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'folder3',
        shortid: 'folder3-1',
        folder: { shortid: folder1.shortid }
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      const folder3 = await reporter.documentStore.collection('folders').insert({
        name: 'folder3',
        shortid: 'folder3'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const c = await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      const d = await reporter.documentStore.collection('templates').insert({
        name: 'd',
        shortid: 'd',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder3.shortid }
      })

      await reporter.folders.move({
        source: [{
          entitySet: 'folders',
          id: folder2._id
        }, {
          entitySet: 'folders',
          id: folder3._id
        }],
        target: {
          shortid: folder1.shortid
        },
        shouldCopy: true
      })

      const folders = await reporter.documentStore.collection('folders').find({})
      const templates = await reporter.documentStore.collection('templates').find({})

      folders.should.have.length(7)
      templates.should.have.length(6)

      folders.should.matchAny((f) => f.name.should.be.eql('folder1') && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2') && f.shortid.should.be.eql(folder2.shortid) && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder2(copy)') && f.folder && f.folder.shortid.should.be.eql(folder1.shortid) && f.shortid.should.be.not.eql(folder2.shortid))
      folders.should.matchAny((f) => f.name.should.be.eql('folder3') && f.shortid.should.be.eql(folder3.shortid) && should(f.folder).be.not.ok())
      folders.should.matchAny((f) => f.name.should.be.eql('folder3(copy)') && f.folder && f.folder.shortid.should.be.eql(folder1.shortid) && f.shortid.should.be.not.eql(folder3.shortid))

      templates.should.matchAny((t) => t.name.should.be.eql('a') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('b') && t.folder.shortid.should.be.eql(folder1.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('c') && t.shortid.should.be.eql(c.shortid) && t.folder.shortid.should.be.eql(folder2.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('c') && t.shortid.should.be.not.eql(c.shortid) && t.folder.shortid.should.be.not.eql(folder2.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('d') && t.shortid.should.be.eql(d.shortid) && t.folder.shortid.should.be.eql(folder3.shortid))
      templates.should.matchAny((t) => t.name.should.be.eql('d') && t.shortid.should.be.not.eql(d.shortid) && t.folder.shortid.should.be.not.eql(folder3.shortid))
    })

    it('should produce name of copies sequentially automatically when copying multiple folders and duplicates found', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const b = await reporter.documentStore.collection('templates').insert({
        name: 'b',
        shortid: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        shortid: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: [{
          entitySet: 'templates',
          id: a._id
        }, {
          entitySet: 'templates',
          id: b._id
        }],
        target: {
          shortid: folder2.shortid
        },
        shouldCopy: true
      })

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      let templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder1.should.eql(['a', 'b'])
      templatesInFolder2.should.eql(['a', 'b', 'c'])

      await reporter.folders.move({
        source: [{
          entitySet: 'templates',
          id: a._id
        }, {
          entitySet: 'templates',
          id: b._id
        }],
        target: {
          shortid: folder2.shortid
        },
        shouldCopy: true
      })

      templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder2.should.eql(['a', 'a(copy)', 'b', 'b(copy)', 'c'])

      await reporter.folders.move({
        source: [{
          entitySet: 'templates',
          id: a._id
        }, {
          entitySet: 'templates',
          id: b._id
        }],
        target: {
          shortid: folder2.shortid
        },
        shouldCopy: true
      })

      templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder2.should.eql(['a', 'a(copy)', 'a(copy2)', 'b', 'b(copy)', 'b(copy2)', 'c'])
    })

    it('should move to top level', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2'
      })

      const folder3 = await reporter.documentStore.collection('folders').insert({
        name: 'folder3',
        folder: { shortid: folder2.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const c = await reporter.documentStore.collection('templates').insert({
        name: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'd',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder3.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: c._id
        },
        target: {
          shortid: null
        }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'folders',
          id: folder3._id
        },
        target: {
          shortid: null
        }
      })

      const templatesInRoot = (await reporter.documentStore.collection('templates').find({
        folder: null
      })).map((e) => e.name).sort()

      const foldersInRoot = (await reporter.documentStore.collection('folders').find({
        folder: null
      })).map((e) => e.name).sort()

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder3 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder3.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder2.should.eql([])
      templatesInFolder3.should.eql(['d'])

      templatesInRoot.should.eql(['c'])
      foldersInRoot.should.eql(['folder1', 'folder2', 'folder3'])
    })

    it('should copy to top level', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      const c = await reporter.documentStore.collection('templates').insert({
        name: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: c._id
        },
        target: {
          shortid: null
        },
        shouldCopy: true
      })

      const templatesInRoot = (await reporter.documentStore.collection('templates').find({
        folder: null
      })).map((e) => e.name).sort()

      const templatesInFolder2 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder2.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder2.should.eql(['c'])

      templatesInRoot.should.eql(['c'])
    })

    it('move should work recursively', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        folder: {
          shortid: folder1.shortid
        }
      })

      const folder3 = await reporter.documentStore.collection('folders').insert({
        name: 'folder3',
        folder: { shortid: folder2.shortid }
      })

      const folder4 = await reporter.documentStore.collection('folders').insert({
        name: 'folder4'
      })

      const folder5 = await reporter.documentStore.collection('folders').insert({
        name: 'folder5',
        folder: {
          shortid: folder4.shortid
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'd',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder3.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'e',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder5.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'folders',
          id: folder2._id
        },
        target: {
          shortid: folder4.shortid
        }
      })

      const foldersInFolder4 = (await reporter.documentStore.collection('folders').find({
        folder: {
          shortid: folder4.shortid
        }
      })).map((e) => e.name).sort()

      const foldersInFolder1 = (await reporter.documentStore.collection('folders').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder5 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder5.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder1.should.eql(['a', 'b'])
      templatesInFolder5.should.eql(['e'])

      foldersInFolder4.should.eql(['folder2', 'folder5'])
      foldersInFolder1.should.eql([])
    })

    it('should not let move from parent entity into child entity', async () => {
      const folder1 = await reporter.documentStore.collection('folders').insert({
        name: 'folder1'
      })

      const folder2 = await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        folder: {
          shortid: folder1.shortid
        }
      })

      const folder3 = await reporter.documentStore.collection('folders').insert({
        name: 'folder3',
        folder: { shortid: folder2.shortid }
      })

      const folder4 = await reporter.documentStore.collection('folders').insert({
        name: 'folder4',
        folder: { shortid: folder3.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'b',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder1.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'c',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder2.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'd',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder3.shortid }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'e',
        engine: 'none',
        recipe: 'html',
        folder: { shortid: folder4.shortid }
      })

      await reporter.folders.move({
        source: {
          entitySet: 'folders',
          id: folder2._id
        },
        target: {
          shortid: folder4.shortid
        }
      })

      const foldersInFolder4 = (await reporter.documentStore.collection('folders').find({
        folder: {
          shortid: folder4.shortid
        }
      })).map((e) => e.name).sort()

      const foldersInFolder1 = (await reporter.documentStore.collection('folders').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder4 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder4.shortid
        }
      })).map((e) => e.name).sort()

      const templatesInFolder1 = (await reporter.documentStore.collection('templates').find({
        folder: {
          shortid: folder1.shortid
        }
      })).map((e) => e.name).sort()

      templatesInFolder1.should.eql(['a', 'b'])
      templatesInFolder4.should.eql(['e'])

      foldersInFolder4.should.eql([])
      foldersInFolder1.should.eql(['folder2'])
    })

    it('should not let move entity when it causes conflict with folder with same name', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'foo',
        shortid: 'foo-folder'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'foo',
        shortid: 'foo',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'foo-folder'
        }
      })

      return should(reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: a._id
        },
        target: {
          shortid: null
        }
      })).be.rejectedWith({ code: 'DUPLICATED_ENTITY' })
    })

    it('should not let move entity (replace: true) when it causes conflict with folder with same name', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'foo',
        shortid: 'foo-folder'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'foo',
        shortid: 'foo',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'foo-folder'
        }
      })

      return should(reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: a._id
        },
        target: {
          shortid: null
        },
        shouldReplace: true
      })).be.rejectedWith({ code: 'DUPLICATED_ENTITY' })
    })

    it('should not let copy entity when it causes conflict with folder with same name', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'foo',
        shortid: 'foo-folder'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'foo',
        shortid: 'foo',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'foo-folder'
        }
      })

      return should(reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: a._id
        },
        target: {
          shortid: null
        },
        shouldCopy: true
      })).be.rejectedWith({ code: 'DUPLICATED_ENTITY' })
    })

    it('should not let copy entity (replace: true) when it causes conflict with folder with same name', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'foo',
        shortid: 'foo-folder'
      })

      const a = await reporter.documentStore.collection('templates').insert({
        name: 'foo',
        shortid: 'foo',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'foo-folder'
        }
      })

      return should(reporter.folders.move({
        source: {
          entitySet: 'templates',
          id: a._id
        },
        target: {
          shortid: null
        },
        shouldCopy: true,
        shouldReplace: true
      })).be.rejectedWith({ code: 'DUPLICATED_ENTITY' })
    })
  })
})
