const should = require('should')
const core = require('../../index')
const common = require('./common.js')

describe('document store', () => {
  describe('common', () => {
    let reporter
    let store

    beforeEach(async () => {
      reporter = await init({
        store: {
          provider: 'memory'
        },
        encryption: {
          secretKey: 'foo1234567891234',
          enabled: true
        }
      }, {
        name: 'customext',
        main: (instance, definition) => {
          common.init(() => instance.documentStore)
        }
      })

      store = reporter.documentStore
    })

    afterEach(async () => {
      if (store) {
        await common.clean(() => store)
      }

      if (reporter) {
        await reporter.close()
      }
    })

    common(() => store)
  })

  describe('core', () => {
    let reporter
    let store

    beforeEach(async () => {
      reporter = await init({
        store: {
          provider: 'memory'
        },
        encryption: {
          secretKey: 'foo1234567891234',
          enabled: true
        }
      })

      store = reporter.documentStore
    })

    afterEach(() => reporter && reporter.close())

    it('should register internal collection', async () => {
      const type = {
        name: { type: 'Edm.String' }
      }

      store.registerEntityType('internalType', type)

      store.registerEntitySet('internalCol', {
        entityType: 'jsreport.internalType',
        internal: true,
        splitIntoDirectories: true
      })

      await store.init()

      should(store.internalCollection('internalCol')).be.ok()
    })

    it('should throw error when getting into duplicate with public and internal collection', async () => {
      const type = {
        name: { type: 'Edm.String' }
      }

      store.registerEntityType('someType', type)

      should.throws(() => {
        store.registerEntitySet('uniqueCol', {
          entityType: 'jsreport.someType',
          splitIntoDirectories: true
        })

        store.registerEntitySet('uniqueCol', {
          entityType: 'jsreport.someType',
          internal: true,
          splitIntoDirectories: true
        })
      }, /can not be registered as internal entity because it was register as public entity/)
    })

    it('should add default fields', async () => {
      should(reporter.documentStore.model.entityTypes.ReportType._id).be.eql({ key: true, type: 'Edm.String' })
      should(reporter.documentStore.model.entityTypes.ReportType.shortid).be.eql({ type: 'Edm.String' })
      should(reporter.documentStore.model.entityTypes.ReportType.creationDate).be.eql({ type: 'Edm.DateTimeOffset' })
      should(reporter.documentStore.model.entityTypes.ReportType.modificationDate).be.eql({ type: 'Edm.DateTimeOffset' })
    })

    it('should generate values for default fields', async () => {
      const doc = await reporter.documentStore.collection('reports').insert({
        name: 'foo'
      })

      should(doc._id).be.String()
      should(doc.shortid).be.String()
      should(doc.creationDate).be.Date()
      should(doc.modificationDate).be.Date()
    })

    it('should generate value for modificationDate (defaut field) on update', async () => {
      const doc = await reporter.documentStore.collection('reports').insert({
        name: 'foo'
      })

      const previousModificationDate = doc.modificationDate

      // wait a bit to simulate that the update is done in another time in the future
      await new Promise((resolve) => setTimeout(resolve, 500))

      await reporter.documentStore.collection('reports').update({
        _id: doc._id
      }, {
        $set: {
          name: 'foo2'
        }
      })

      const lastDoc = await reporter.documentStore.collection('reports').findOne({
        _id: doc._id
      })

      should(lastDoc.modificationDate).be.not.eql(previousModificationDate)
    })

    it('should skip generation of modificationDate (default field) on update when context.skipModificationDateUpdate is true', async () => {
      const doc = await reporter.documentStore.collection('reports').insert({
        name: 'foo'
      })

      const previousModificationDate = doc.modificationDate

      await reporter.documentStore.collection('reports').update({
        _id: doc._id
      }, {
        $set: {
          name: 'foo2'
        }
      }, core.Request({
        context: {
          skipModificationDateUpdate: true
        }
      }))

      const lastDoc = await reporter.documentStore.collection('reports').findOne({
        _id: doc._id
      })

      should(lastDoc.modificationDate).be.eql(previousModificationDate)
    })

    it('should set properties with references to other entity sets (.referenceProperties) into entity type information', async () => {
      const reportsReferenceProperties = reporter.documentStore.model.entitySets.reports.referenceProperties

      reportsReferenceProperties.should.not.have.length(0)

      reportsReferenceProperties.should.matchAny((t) => t.name.should.be.eql('templateShortid') && t.referenceTo.should.be.eql('templates'))
      reportsReferenceProperties.should.matchAny((t) => t.name.should.be.eql('templateObj.shortid') && t.referenceTo.should.be.eql('templates'))
    })

    it('should set properties that reference an entity set (.linkedReferenceProperties) into such entity set type information', async () => {
      const templatesLinkedReferenceProperties = reporter.documentStore.model.entitySets.templates.linkedReferenceProperties

      templatesLinkedReferenceProperties.should.not.have.length(0)

      templatesLinkedReferenceProperties.should.matchAny((t) => t.name.should.be.eql('templateShortid') && t.entitySet.should.be.eql('reports'))
      templatesLinkedReferenceProperties.should.matchAny((t) => t.name.should.be.eql('templateObj.shortid') && t.entitySet.should.be.eql('reports'))
    })

    it('should resolve property definition for simple case using documentStore.resolvePropertyDefinition', async () => {
      const es = reporter.documentStore.model.entitySets.templates
      const resolved = reporter.documentStore.resolvePropertyDefinition(es.entityTypeDef.name)
      resolved.def.type.should.be.eql('Edm.String')
    })

    it('should return undefined when passing invalid def using documentStore.resolvePropertyDefinition', async () => {
      const resolved = reporter.documentStore.resolvePropertyDefinition({ type: 'DoesNotExists' })
      should(resolved).be.undefined()
    })

    it('should return sub type when passing def with complex type using documentStore.resolvePropertyDefinition', async () => {
      const es = reporter.documentStore.model.entitySets.reports
      const resolved = reporter.documentStore.resolvePropertyDefinition(es.entityTypeDef.templateObj)
      resolved.def.type.should.be.eql('jsreport.TemplateReportRefType')
      resolved.subType.should.be.Object()
      resolved.subType.should.ownProperty('shortid')
      resolved.subType.shortid.type.should.be.eql('Edm.String')
    })

    it('should return sub type when passing def with collection of complex type using documentStore.resolvePropertyDefinition', async () => {
      const es = reporter.documentStore.model.entitySets.reports
      const resolved = reporter.documentStore.resolvePropertyDefinition(es.entityTypeDef.tags)
      resolved.def.type.should.be.eql('Collection(jsreport.TagRefType)')
      resolved.subType.should.be.Object()
      resolved.subType.should.ownProperty('value')
      resolved.subType.value.type.should.be.eql('Edm.String')
    })

    it('should return sub def when passing def with collection of simple type using documentStore.resolvePropertyDefinition', async () => {
      const es = reporter.documentStore.model.entitySets.reports
      const resolved = reporter.documentStore.resolvePropertyDefinition(es.entityTypeDef.values)
      resolved.def.type.should.be.eql('Collection(Edm.String)')
      should(resolved.subType).be.undefined()
      resolved.subDef.type.should.be.eql('Edm.String')
    })

    it('should handle simple values when using collection.serializeProperties', async () => {
      await reporter.documentStore.collection('reports').insert({
        name: 'testing',
        templateShortid: 'reference',
        tags: [{ value: 'a' }, { value: 'b' }],
        values: ['a', 'b', 'c']
      })

      const reports = await reporter.documentStore.collection('reports').find({})
      const serialized = await reporter.documentStore.collection('reports').serializeProperties(reports)

      serialized.should.have.length(1)

      serialized.should.matchAny((t) => (
        t.name.should.be.eql('testing') &&
        t.templateShortid.should.be.eql('reference') &&
        t.tags.should.have.length(2) &&
        t.tags[0].should.be.eql({ value: 'a' }) &&
        t.tags[1].should.be.eql({ value: 'b' }) &&
        t.values.should.have.length(3) &&
        t.values[0].should.be.eql('a') &&
        t.values[1].should.be.eql('b') &&
        t.values[2].should.be.eql('c')
      ))
    })

    it('should handle binary property when using collection.serializeProperties', async () => {
      await reporter.documentStore.collection('reports').insert({
        name: 'testing',
        rawMetadata: Buffer.from('metadata')
      })

      const reports = await reporter.documentStore.collection('reports').find({})
      const serialized = await reporter.documentStore.collection('reports').serializeProperties(reports)

      serialized.should.have.length(1)

      serialized.should.matchAny((t) => (
        t.name.should.be.eql('testing') &&
        t.rawMetadata.should.be.eql(Buffer.from('metadata').toString('base64'))
      ))
    })

    it('should handle encrypted property when using collection.serializeProperties', async () => {
      const r = await reporter.documentStore.collection('reports').insert({
        name: 'testing',
        encryptedValue: 'secret'
      })

      r.encryptedValue.should.not.be.eql('secret')

      const reports = await reporter.documentStore.collection('reports').find({})
      const serialized = await reporter.documentStore.collection('reports').serializeProperties(reports)

      serialized.should.have.length(1)

      serialized.should.matchAny((t) => (
        t.name.should.be.eql('testing') &&
        t.encryptedValue.should.be.eql('secret')
      ))
    })

    it('should handle simple values when using collection.deserializeProperties', async () => {
      await reporter.documentStore.collection('reports').insert({
        name: 'testing',
        templateShortid: 'reference',
        tags: [{ value: 'a' }, { value: 'b' }],
        values: ['a', 'b', 'c']
      })

      const reports = await reporter.documentStore.collection('reports').find({})
      const serialized = await reporter.documentStore.collection('reports').serializeProperties(reports)

      serialized.should.have.length(1)

      const unserialized = await reporter.documentStore.collection('reports').deserializeProperties(serialized)

      unserialized.should.have.length(1)

      unserialized.should.matchAny((t) => (
        t.name.should.be.eql('testing') &&
        t.templateShortid.should.be.eql('reference') &&
        t.tags.should.have.length(2) &&
        t.tags[0].should.be.eql({ value: 'a' }) &&
        t.tags[1].should.be.eql({ value: 'b' }) &&
        t.values.should.have.length(3) &&
        t.values[0].should.be.eql('a') &&
        t.values[1].should.be.eql('b') &&
        t.values[2].should.be.eql('c')
      ))
    })

    it('should handle binary property when using collection.deserializeProperties', async () => {
      await reporter.documentStore.collection('reports').insert({
        name: 'testing',
        rawMetadata: Buffer.from('metadata')
      })

      const reports = await reporter.documentStore.collection('reports').find({})
      const serialized = await reporter.documentStore.collection('reports').serializeProperties(reports)

      serialized.should.have.length(1)

      const unserialized = await reporter.documentStore.collection('reports').deserializeProperties(serialized)
      unserialized.should.have.length(1)

      unserialized.should.matchAny((t) => (
        t.name.should.be.eql('testing') &&
        Buffer.isBuffer(t.rawMetadata).should.be.eql(true) &&
        t.rawMetadata.toString().should.be.eql('metadata')
      ))
    })

    it('should handle date property when using collection.deserializeProperties', async () => {
      const now = new Date()

      await reporter.documentStore.collection('reports').insert({
        name: 'testing',
        creationDate: now
      })

      const reports = await reporter.documentStore.collection('reports').find({})
      const serialized = await reporter.documentStore.collection('reports').serializeProperties(reports)

      serialized.should.have.length(1)

      const unserialized = await reporter.documentStore.collection('reports').deserializeProperties(serialized)
      unserialized.should.have.length(1)

      unserialized.should.matchAny((t) => (
        t.name.should.be.eql('testing') &&
        t.creationDate.toString().should.be.eql(now.toString())
      ))
    })

    it('insert should fail with invalid name', async () => {
      return store.collection('templates').insert({ name: '<test', engine: 'none', recipe: 'html' }).should.be.rejected()
    })

    it('insert should fail with invalid name (dot)', async () => {
      return store.collection('templates').insert({ name: '.', engine: 'none', recipe: 'html' }).should.be.rejected()
    })

    it('insert should fail with invalid name (two dot)', async () => {
      return store.collection('templates').insert({ name: '..', engine: 'none', recipe: 'html' }).should.be.rejected()
    })

    it('insert should fail with empty string in name', async () => {
      return store.collection('templates').insert({ name: '', engine: 'none', recipe: 'html' }).should.be.rejected()
    })

    it('update should fail with invalid name', async () => {
      await store.collection('templates').insert({ name: 'test', engine: 'none', recipe: 'html' })

      return store.collection('templates').update({ name: 'test' }, { $set: { name: '/foo/other' } }).should.be.rejected()
    })

    it('insert config.json should be rejected', async () => {
      return reporter.documentStore.collection('templates').insert({
        name: 'config.json'
      }).should.be.rejected()
    })

    it('update to config.json should be rejected', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'someentityname',
        engine: 'none',
        recipe: 'html'
      })
      return reporter.documentStore.collection('templates').update({ name: 'foo' }, {
        $set: { name: 'config.json' }
      }).should.be.rejected()
    })

    it('findOne should return first item', async () => {
      await store.collection('templates').insert({ name: 'test', engine: 'none', recipe: 'html' })
      const t = await store.collection('templates').findOne({ name: 'test' })
      t.name.should.be.eql('test')
    })

    it('findOne should return null if no result found', async () => {
      await store.collection('templates').insert({ name: 'test', engine: 'none', recipe: 'html' })
      const t = await store.collection('templates').findOne({ name: 'invalid' })
      should(t).be.null()
    })

    it('should call beforeFindListener without user in req.context during insert', async () => {
      reporter.documentStore.collection('templates').beforeFindListeners.add('custom-find-listener', (q, p, req) => {
        return should(req.context.user).be.undefined()
      })

      // this test validates that user is not taken into consideration during validation listeners
      const req = reporter.Request({ context: { user: { name: 'person' } } })

      await reporter.documentStore.collection('templates').insert({
        name: 'a',
        shortid: 'a',
        engine: 'none',
        recipe: 'html'
      }, req)

      req.context.user.name.should.be.eql('person')
    })

    describe('type json schemas', () => {
      describe('schema generation', () => {
        beforeEach(() => {
          store.registerEntityType('DemoType', {
            _id: { type: 'Edm.String' },
            name: { type: 'Edm.String' },
            active: { type: 'Edm.Boolean' },
            timeout: { type: 'Edm.Int32' },
            rawContent: { type: 'Edm.Binary' },
            modificationDate: { type: 'Edm.DateTimeOffset' }
          }, true)

          store.registerEntityType('ComplexTemplateType', {
            _id: { type: 'Edm.String' },
            name: { type: 'Edm.String' },
            content: { type: 'Edm.String', document: { extension: 'html', engine: true } },
            recipe: { type: 'Edm.String' },
            phantom: { type: 'jsreport.PhantomType' },
            modificationDate: { type: 'Edm.DateTimeOffset' }
          }, true)

          store.registerComplexType('ChromeType', {
            scale: { type: 'Edm.String' },
            displayHeaderFooter: { type: 'Edm.Boolean' },
            printBackground: { type: 'Edm.Boolean' },
            landscape: { type: 'Edm.Boolean' },
            pageRanges: { type: 'Edm.String' },
            format: { type: 'Edm.String' },
            width: { type: 'Edm.String' },
            height: { type: 'Edm.String' },
            marginTop: { type: 'Edm.String' },
            marginRight: { type: 'Edm.String' },
            marginBottom: { type: 'Edm.String' },
            marginLeft: { type: 'Edm.String' },
            waitForJS: { type: 'Edm.Boolean' },
            waitForNetworkIdle: { type: 'Edm.Boolean' },
            headerTemplate: { type: 'Edm.String', document: { extension: 'html', engine: true } },
            footerTemplate: { type: 'Edm.String', document: { extension: 'html', engine: true } }
          })

          store.model.entityTypes.ComplexTemplateType.chrome = { type: 'jsreport.ChromeType' }

          store.model.entityTypes.ComplexTemplateType.tags = {
            type: 'Collection(Edm.String)'
          }

          return store.init()
        })

        it('should generate JSON Schema for simple type def', async () => {
          const demoSchema = reporter.entityTypeValidator.getSchema('DemoType')

          demoSchema.should.be.eql({
            $schema: reporter.entityTypeValidator.schemaVersion,
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              active: { type: 'boolean' },
              timeout: { type: 'integer', minimum: -2147483648, maximum: 2147483647 },
              rawContent: { anyOf: [{ type: 'null' }, { type: 'string' }, { '$jsreport-acceptsBuffer': true }] },
              modificationDate: { anyOf: [{ '$jsreport-stringToDate': true }, { '$jsreport-acceptsDate': true }] }
            }
          })
        })

        it('should generate JSON Schema for complex type def', async () => {
          const complexTemplateSchema = reporter.entityTypeValidator.getSchema('ComplexTemplateType')

          complexTemplateSchema.should.be.eql({
            $schema: reporter.entityTypeValidator.schemaVersion,
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              content: { type: 'string' },
              recipe: { type: 'string' },
              modificationDate: { anyOf: [{ '$jsreport-stringToDate': true }, { '$jsreport-acceptsDate': true }] },
              chrome: {
                type: 'object',
                properties: {
                  scale: { type: 'string' },
                  displayHeaderFooter: { type: 'boolean' },
                  printBackground: { type: 'boolean' },
                  landscape: { type: 'boolean' },
                  pageRanges: { type: 'string' },
                  format: { type: 'string' },
                  width: { type: 'string' },
                  height: { type: 'string' },
                  marginTop: { type: 'string' },
                  marginRight: { type: 'string' },
                  marginBottom: { type: 'string' },
                  marginLeft: { type: 'string' },
                  waitForJS: { type: 'boolean' },
                  waitForNetworkIdle: { type: 'boolean' },
                  headerTemplate: { type: 'string' },
                  footerTemplate: { type: 'string' }
                }
              },
              tags: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          })
        })
      })

      describe('validation', async () => {
        it('should coerce input while doing insert', async () => {
          let input

          store.collection('validationTest').beforeInsertListeners.add('test', (doc) => {
            input = doc
          })

          await store.collection('validationTest').insert({
            name: 'testing',
            alias: 1,
            followers: '345',
            owner: 1,
            customDate: new Date(),
            customDate2: '2019-10-11T17:41:29.453Z'
          })

          should(input.alias).be.eql('1')
          should(input.followers).be.eql(345)
          should(input.owner).be.eql(true)
          should(input.customDate).be.Date()
          should(input.customDate2).be.Date()
        })

        it('should throw when validation fails while doing insert', async () => {
          return should(store.collection('validationTest').insert({
            name: 'testing',
            followers: 'foo',
            owner: 'fail'
          })).be.rejectedWith(/input contain values that does not match the schema/)
        })

        it('should coerce input while doing update', async () => {
          let input

          store.collection('validationTest').beforeUpdateListeners.add('test', (q, u) => {
            input = u.$set
          })

          await store.collection('validationTest').insert({
            name: 'testing',
            alias: 't',
            followers: 200,
            owner: true,
            customDate: new Date(),
            customDate2: '2019-10-11T17:41:29.453Z'
          })

          await store.collection('validationTest').update({
            name: 'testing'
          }, {
            $set: {
              alias: 1,
              followers: '345',
              owner: 1,
              customDate2: '2019-10-12T17:41:29.453Z'
            }
          })

          should(input.alias).be.eql('1')
          should(input.followers).be.eql(345)
          should(input.owner).be.eql(true)
          should(input.customDate2).be.Date()
        })

        it('should throw when validation fails while doing update', async () => {
          await store.collection('validationTest').insert({
            name: 'testing',
            alias: 't',
            followers: 200,
            owner: true
          })

          return should(store.collection('validationTest').update({
            name: 'testing'
          }, {
            $set: {
              followers: 'foo',
              owner: 'fail'
            }
          })).be.rejectedWith(/input contain values that does not match the schema/)
        })
      })
    })

    describe('with store.transactions.enabled: false', () => {
      let reporter
      let store

      beforeEach(async () => {
        reporter = await init({
          store: {
            provider: 'memory',
            transactions: {
              enabled: false
            }
          }
        })

        store = reporter.documentStore
      })

      afterEach(() => reporter && reporter.close())

      it('should not use transactions', async () => {
        const req = core.Request({})
        await store.beginTransaction(req)
        await store.collection('foo').insert({ name: 'test' }, req)
        await store.rollbackTransaction(req)

        const t = await store.collection('foo').findOne({})
        t.should.be.ok()
      })
    })
  })
})

function init (options, customExt) {
  const reporter = core({
    discover: false,
    ...options
  })

  if (customExt) {
    reporter.use(customExt)
  } else {
    reporter.use({
      name: 'testing',
      main: (reporter, definition) => {
        reporter.documentStore.registerComplexType('TagRefType', {
          value: { type: 'Edm.String' }
        })

        reporter.documentStore.registerComplexType('TemplateReportRefType', {
          shortid: { type: 'Edm.String', referenceTo: 'templates' }
        })

        reporter.documentStore.registerEntityType('ReportType', {
          name: { type: 'Edm.String' },
          templateShortid: { type: 'Edm.String', referenceTo: 'templates' },
          templateObj: { type: 'jsreport.TemplateReportRefType' },
          tags: { type: 'Collection(jsreport.TagRefType)' },
          values: { type: 'Collection(Edm.String)' },
          rawMetadata: { type: 'Edm.Binary' },
          encryptedValue: { type: 'Edm.String', encrypted: true },
          creationDate: { type: 'Edm.DateTimeOffset' }
        })

        reporter.documentStore.registerEntityType('ValidationTestType', {
          name: { type: 'Edm.String' },
          alias: { type: 'Edm.String' },
          followers: { type: 'Edm.Int32' },
          owner: { type: 'Edm.Boolean' },
          customDate: { type: 'Edm.DateTimeOffset' },
          customDate2: { type: 'Edm.DateTimeOffset' },
          creationDate: { type: 'Edm.DateTimeOffset' }
        })

        reporter.documentStore.registerEntityType('FooType', {
          name: { type: 'Edm.String' }
        })

        reporter.documentStore.registerEntitySet('reports', {
          entityType: 'jsreport.ReportType'
        })

        reporter.documentStore.registerEntitySet('foo', {
          entityType: 'jsreport.FooType'
        })

        reporter.documentStore.registerEntitySet('validationTest', {
          entityType: 'jsreport.ValidationTestType'
        })

        reporter.initializeListeners.add('testing-ext', async (req, res) => {
          reporter.documentStore.collection('reports').beforeInsertListeners.add('reports-encrypt-value', async (doc, req) => {
            if (!doc.encryptedValue) {
              return
            }

            doc.encryptedValue = await reporter.encryption.encrypt(doc.encryptedValue)
          })
        })
      }
    })
  }

  return reporter.init()
}
