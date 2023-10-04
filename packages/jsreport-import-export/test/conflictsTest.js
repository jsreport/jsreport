const should = require('should')
const conflictsUtils = require('./conflictsUtils')

module.exports = (getReporter) => {
  let reporter
  let exportEntities
  let importEntities
  let assertExists

  beforeEach(() => {
    reporter = getReporter()
    const manager = conflictsUtils(reporter)
    exportEntities = manager.exportEntities
    importEntities = manager.importEntities
    assertExists = manager.assertExists
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  describe('when no entity path conflict', () => {
    it('should produce entity insert when _id conflict on same folder level (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        't2', { _id: 't1' }
      )

      await assertExists('t1', 't2', (entities) => {
        const templates = entities.templates
        templates[0]._id.should.be.not.eql(templates[1]._id)
      })
    })

    it('should produce entity insert when _id conflict on same folder level (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/t2', { _id: 't1' }
      )

      await assertExists('f1/t1', 'f1/t2', (entities) => {
        const templates = entities.templates
        templates[0]._id.should.be.not.eql(templates[1]._id)
      })
    })

    it('should produce entity insert when _id conflict on different folder level (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'f1',
        'f1/t2', { _id: 't1' }
      )

      await assertExists('t1', 'f1/t2', (entities) => {
        const templates = entities.templates
        templates[0]._id.should.be.not.eql(templates[1]._id)
      })
    })

    it('should produce entity insert when _id conflict on different folder level (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        't2', { _id: 't1' },
        'f1'
      )

      await assertExists('t2', 'f1/t1', (entities) => {
        const templates = entities.templates
        templates[0]._id.should.be.not.eql(templates[1]._id)
      })
    })

    it('should produce entity update when shortid conflict on same folder level (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        't2', { shortid: 't1' }
      )

      await assertExists('t1', (entities) => {
        const templates = entities.templates
        templates.should.have.length(1)
        templates[0].shortid.should.be.eql('t1')
      })
    })

    it('should produce entity update when shortid conflict on same folder level (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/t2', { shortid: 't1' }
      )

      await assertExists('f1/t1', (entities) => {
        const templates = entities.templates
        templates.should.have.length(1)
        templates[0].shortid.should.be.eql('t1')
      })
    })

    it('should produce entity update when shortid conflict of parent folder on same folder level (import on root)', async () => {
      await exportEntities(
        'f1',
        'f1/t1'
      )

      await importEntities(
        'f2', { shortid: 'f1' },
        'f2/t1'
      )

      await assertExists('f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(1)
      })
    })

    it('should produce entity update when shortid conflict of parent folder on same folder level (import on folder)', async () => {
      await exportEntities(
        'f1',
        'f1/t1'
      )

      await importEntities(
        { targetFolder: 'fcontainer' },
        'fcontainer',
        'fcontainer/f2', { shortid: 'f1' },
        'fcontainer/f2/t1'
      )

      await assertExists('fcontainer/f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(2)
        templates.should.have.length(1)
      })
    })

    it('should produce entity update and keep references when shortid conflict on same folder level (import on root)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        'd2', { shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('t1', 'd1', (entities) => {
        const { templates, data } = entities
        templates.should.have.length(1)
        data.should.have.length(1)
        data[0].shortid.should.be.eql('d1')
        JSON.parse(data[0].dataJson).a.should.be.eql('a')
        templates[0].data.shortid.should.be.eql('d1')
      })
    })

    it('should produce entity update and keep references when shortid conflict on same folder level (import on folder)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d2', { shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('f1/d1', 'f1/t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(1)
        templates.should.have.length(1)
        data[0].shortid.should.be.eql('d1')
        JSON.parse(data[0].dataJson).a.should.be.eql('a')
        templates[0].data.shortid.should.be.eql('d1')
      })
    })

    it('should produce entity insert when shortid conflict on different folder level (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'f1',
        'f1/t2', { shortid: 't1' }
      )

      await assertExists('t1', 'f1/t2', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0].shortid.should.be.not.eql(templates[1].shortid)
      })
    })

    it('should produce entity insert when shortid conflict on different folder level (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        't2', { shortid: 't1' },
        'f1'
      )

      await assertExists('t2', 'f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0].shortid.should.be.not.eql(templates[1].shortid)
      })
    })

    it('should produce entity insert and updated references when shortid conflict on different folder level (import on root)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        'f1',
        'f1/d2', { shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('t1', 'd1', 'f1/d2', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)

        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce entity insert and updated references when shortid conflict on different folder level (import on folder)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'd2', { shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('d2', 'f1/d1', 'f1/t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)

        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce entity update when both _id and shortid conflict on same folder level (import on root)', async () => {
      await exportEntities('t1')

      await importEntities('t2', { _id: 't1', shortid: 't1' })

      await assertExists('t1', (entities) => {
        const { templates } = entities
        templates.should.have.length(1)
        templates[0]._id.should.be.eql('t1')
        templates[0].shortid.should.be.eql('t1')
      })
    })

    it('should produce entity update when both _id and shortid conflict on same folder level (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/t2', { _id: 't1', shortid: 't1' }
      )

      await assertExists('f1', 'f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(1)
        templates[0]._id.should.be.eql('t1')
        templates[0].shortid.should.be.eql('t1')
      })
    })

    it('should produce entity update and keep references when both _id and shortid conflict on same folder level (import on root)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities('d2', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' })

      await assertExists('d1', 't1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(1)
        templates.should.have.length(1)
        data[0]._id.should.be.eql('d1')
        data[0].shortid.should.be.eql('d1')
        JSON.parse(data[0].dataJson).a.should.be.eql('a')
        templates[0].data.shortid.should.be.eql('d1')
      })
    })

    it('should produce entity update and keep references when both _id and shortid conflict on same folder level (import on folder)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d2', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('f1/d1', 'f1/t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(1)
        templates.should.have.length(1)
        data[0]._id.should.be.eql('d1')
        data[0].shortid.should.be.eql('d1')
        JSON.parse(data[0].dataJson).a.should.be.eql('a')
        templates[0].data.shortid.should.be.eql('d1')
      })
    })

    it('should produce entity insert when both _id and shortid conflict on different folder level (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'f1',
        'f1/t2', { _id: 't1', shortid: 't1' }
      )

      await assertExists('t1', 'f1/t2', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0]._id.should.be.not.eql(templates[1]._id)
        templates[0].shortid.should.be.not.eql(templates[1].shortid)
      })
    })

    it('should produce entity insert when both _id and shortid conflict on different folder level (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        't2', { _id: 't1', shortid: 't1' }
      )

      await assertExists('t2', 'f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0]._id.should.be.not.eql(templates[1]._id)
        templates[0].shortid.should.be.not.eql(templates[1].shortid)
      })
    })

    it('should produce entity insert and updated references when both _id and shortid conflict on different folder level (import on root)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        'f1',
        'f1/d2', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('d1', 't1', 'f1/d2', (entities) => {
        const { templates, data } = entities

        data.should.have.length(2)
        templates.should.have.length(1)

        data[0]._id.should.not.be.eql(data[1]._id)
        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce entity insert and updated references when both _id and shortid conflict on different folder level (import on folder)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'd2', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('d2', 'f1/t1', 'f1/d1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)

        data[0]._id.should.not.be.eql(data[1]._id)
        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce updated references when no shortid conflict but entities referenced in conflict', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        'f1',
        'f1/d2', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('d1', 't1', 'f1/d2', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)

        data[0]._id.should.not.be.eql(data[1]._id)
        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.not.be.eql('d1')
        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce updated references when folder shortid conflict (import on root)', async () => {
      await exportEntities(
        'f1',
        'f1/t1'
      )

      await importEntities(
        'f3',
        'f3/f2', { shortid: 'f1' }
      )

      await assertExists('f1', 'f3', 'f3/f2', 'f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(3)
        templates.should.have.length(1)
        folders.should.matchAny((f) => f.name.should.be.eql('f2') && f.shortid.should.be.eql('f1'))
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f.shortid.should.be.not.eql('f1'))
      })
    })

    it('should produce updated references when folder shortid conflict (import on folder)', async () => {
      await exportEntities(
        'f1',
        'f1/t1'
      )

      await importEntities(
        { targetFolder: 'fcontainer' },
        'fcontainer',
        'fcontainer/fparent',
        'fcontainer/fparent/f2', { shortid: 'f1' }
      )

      await assertExists('fcontainer', 'fcontainer/f1', 'fcontainer/f1/t1', 'fcontainer/fparent', 'fcontainer/fparent/f2', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(4)
        templates.should.have.length(1)
        folders.should.matchAny((f) => f.name.should.be.eql('f2') && f.shortid.should.be.eql('f1'))
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f.shortid.should.be.not.eql('f1'))
        templates[0].folder.shortid.should.be.not.eql('f1')
      })
    })

    it('should produce entity insert when importing folder inside the same folder (import on folder)', async () => {
      await exportEntities('f1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1'
      )

      await assertExists('f1', 'f1/f1', (entities) => {
        const folders = entities.folders
        folders.should.have.length(2)
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.eql('f1') && f.shortid.should.eql('f1') && should(f.folder).be.not.ok())
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.not.eql('f1') && f.shortid.should.be.not.eql('f1') && f.folder.shortid.should.be.eql('f1'))
      })
    })

    it('should produce entity insert and updated references when importing folder with entity inside the same folder (import on folder)', async () => {
      await exportEntities('f1', 'f1/t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/t1'
      )

      await assertExists('f1', 'f1/t1', 'f1/f1', 'f1/f1/t1', (entities) => {
        const folders = entities.folders
        const templates = entities.templates
        folders.should.have.length(2)
        templates.should.have.length(2)
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.eql('f1') && f.shortid.should.eql('f1') && should(f.folder).be.not.ok())
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.not.eql('f1') && f.shortid.should.be.not.eql('f1') && f.folder.shortid.should.be.eql('f1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.be.eql('t1') && t.shortid.should.be.eql('t1') && t.folder.shortid.should.be.eql('f1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.be.not.eql('t1') && t.shortid.should.be.not.eql('t1') && t.folder.shortid.should.be.not.eql('f1'))
      })
    })
  })

  describe('when entity path conflict', () => {
    it('should produce entity update when _id conflict on same folder level (import on root)', async () => {
      await exportEntities('t1')

      await importEntities('t1', { _id: 't1' })

      await assertExists('t1', (entities) => {
        const { templates } = entities
        templates.should.have.length(1)
        templates[0]._id.should.be.eql('t1')
      })
    })

    it('should produce entity update when _id conflict on same folder level (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/t1', { _id: 't1' }
      )

      await assertExists('f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(1)
        templates[0]._id.should.be.eql('t1')
      })
    })

    it('should produce entity update when _id conflict on different folder level (import on root)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities(
        'f1',
        'f1/t2', { _id: 't1' },
        't1', { _id: undefined }
      )

      await assertExists('f1', 't1', 'f1/t2', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0]._id.should.be.not.eql(templates[1]._id)

        templates.should.matchAny((t) => (
          t.name.should.be.eql('t1') &&
          t._id.should.be.not.eql('t1') &&
          t.engine.should.be.eql('handlebars')
        ))
      })
    })

    it('should produce entity update when _id conflict on different folder level (import on folder)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities(
        { targetFolder: 'f1' },
        't2', { _id: 't1' },
        'f1',
        'f1/t1', { _id: undefined }
      )

      await assertExists('t2', 'f1', 'f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0]._id.should.be.not.eql(templates[1]._id)

        templates.should.matchAny((t) => (
          t.name.should.be.eql('t1') &&
          t._id.should.be.not.eql('t1') &&
          t.engine.should.be.eql('handlebars')
        ))
      })
    })

    it('should produce entity update when shortid conflict on same folder level (import on root)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities('t1', { shortid: 't1' })

      await assertExists('t1', (entities) => {
        const { templates } = entities
        templates.should.have.length(1)
        templates[0].shortid.should.be.eql('t1')
        templates[0].engine.should.be.eql('handlebars')
      })
    })

    it('should produce entity update when shortid conflict on same folder level (import on folder)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/t1', { shortid: 't1' }
      )

      await assertExists('f1/t1', (entities) => {
        const { templates } = entities
        templates.should.have.length(1)
        templates[0].shortid.should.be.eql('t1')
        templates[0].engine.should.be.eql('handlebars')
      })
    })

    it('should produce entity update and keep references when shortid conflict on same folder level (import on root)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        'd1', { shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('d1', 't1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(1)
        templates.should.have.length(1)
        data[0].shortid.should.be.eql('d1')
        JSON.parse(data[0].dataJson).a.should.be.eql('a')
        templates[0].data.shortid.should.be.eql('d1')
      })
    })

    it('should produce entity update and keep references when shortid conflict on same folder level (import on folder)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d1', { shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('f1/t1', 'f1/d1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(1)
        templates.should.have.length(1)
        data[0].shortid.should.be.eql('d1')
        JSON.parse(data[0].dataJson).a.should.be.eql('a')
        templates[0].data.shortid.should.be.eql('d1')
      })
    })

    it('should produce entity update when shortid conflict on different folder level (import on root)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities(
        'f1',
        'f1/t2', { shortid: 't1' },
        't1', { _id: undefined, shortid: undefined }
      )

      await assertExists('t1', 'f1', 'f1/t2', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0].shortid.should.be.not.eql(templates[1].shortid)

        templates.should.matchAny((t) => (
          t.name.should.be.eql('t1') &&
          t._id.should.be.not.eql('t1') &&
          t.engine.should.be.eql('handlebars')
        ))
      })
    })

    it('should produce entity update when shortid conflict on different folder level (import on folder)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities(
        { targetFolder: 'f1' },
        't2', { shortid: 't1' },
        'f1',
        'f1/t1', { _id: undefined, shortid: undefined }
      )

      await assertExists('t2', 'f1', 'f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0].shortid.should.be.not.eql(templates[1].shortid)

        templates.should.matchAny((t) => (
          t.name.should.be.eql('t1') &&
          t.shortid.should.be.not.eql('t1') &&
          t.engine.should.be.eql('handlebars')
        ))
      })
    })

    it('should produce entity update and updated references when shortid conflict on different folder level (import on root)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        'd1', { _id: undefined, shortid: undefined, dataJson: '{ "a": "b" }' },
        'f1',
        'f1/d2', { shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('d1', 't1', 'f1/d2', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)
        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.be.not.eql('d1')
        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce entity update and updated references when shortid conflict on different folder level (import on folder)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'd2', { shortid: 'd1', dataJson: '{ "a": "b" }' },
        'f1',
        'f1/d1', { _id: undefined, shortid: undefined, dataJson: '{ "a": "b" }' }
      )

      await assertExists('d2', 'f1/d1', 'f1/t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)
        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.be.not.eql('d1')
        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce entity update when both _id and shortid conflict on same folder level (import on root)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities('t1', { _id: 't1', shortid: 't1' })

      await assertExists('t1', (entities) => {
        const { templates } = entities
        templates.should.have.length(1)
        templates[0]._id.should.be.eql('t1')
        templates[0].shortid.should.be.eql('t1')
        templates[0].engine.should.be.eql('handlebars')
      })
    })

    it('should produce entity update when both _id and shortid conflict on same folder level (import on folder)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/t1', { _id: 't1', shortid: 't1' }
      )

      await assertExists('f1/t1', (entities) => {
        const { templates } = entities
        templates.should.have.length(1)
        templates[0]._id.should.be.eql('t1')
        templates[0].shortid.should.be.eql('t1')
        templates[0].engine.should.be.eql('handlebars')
      })
    })

    it('should produce entity update and keep references when both _id and shortid conflict on same folder level (import on root)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        'd1', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('d1', 't1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(1)
        templates.should.have.length(1)
        data[0]._id.should.be.eql('d1')
        data[0].shortid.should.be.eql('d1')
        JSON.parse(data[0].dataJson).a.should.be.eql('a')
        templates[0].data.shortid.should.be.eql('d1')
      })
    })

    it('should produce entity update and keep references when both _id and shortid conflict on same folder level (import on folder)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d1', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('f1/d1', 'f1/t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(1)
        templates.should.have.length(1)
        data[0]._id.should.be.eql('d1')
        data[0].shortid.should.be.eql('d1')
        JSON.parse(data[0].dataJson).a.should.be.eql('a')
        templates[0].data.shortid.should.be.eql('d1')
        templates[0].folder.shortid.should.be.eql('f1')
      })
    })

    it('should produce entity update when both _id and shortid conflict on different folder level (import on root)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities(
        't1', { _id: undefined, shortid: undefined },
        'f1',
        'f1/t2', { _id: 't1', shortid: 't1' }
      )

      await assertExists('t1', 'f1/t2', (entities) => {
        const { templates, folders } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0]._id.should.be.not.eql(templates[1]._id)
        templates[0].shortid.should.be.not.eql(templates[1].shortid)

        templates.should.matchAny((t) => (
          t.name.should.be.eql('t2') &&
          t._id.should.be.eql('t1') &&
          t.shortid.should.be.eql('t1')
        ))

        templates.should.matchAny((t) => (
          t.name.should.be.eql('t1') &&
          t._id.should.be.not.eql('t1') &&
          t.shortid.should.be.not.eql('t1') &&
          t.engine.should.be.eql('handlebars')
        ))
      })
    })

    it('should produce entity update when both _id and shortid conflict on different folder level (import on folder)', async () => {
      await exportEntities('t1', { engine: 'handlebars' })

      await importEntities(
        { targetFolder: 'f1' },
        't2', { _id: 't1', shortid: 't1' },
        'f1',
        'f1/t1', { _id: undefined, shortid: undefined }
      )

      await assertExists('t2', 'f1/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(2)
        templates[0]._id.should.be.not.eql(templates[1]._id)
        templates[0].shortid.should.be.not.eql(templates[1].shortid)

        templates.should.matchAny((t) => (
          t.name.should.be.eql('t2') &&
          t._id.should.be.eql('t1') &&
          t.shortid.should.be.eql('t1')
        ))

        templates.should.matchAny((t) => (
          t.name.should.be.eql('t1') &&
          t._id.should.be.not.eql('t1') &&
          t.shortid.should.be.not.eql('t1') &&
          t.engine.should.be.eql('handlebars')
        ))
      })
    })

    it('should produce entity update and updated references when both _id and shortid conflict on different folder level (import on root)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        'd1', { _id: undefined, shortid: undefined, dataJson: '{ "a": "b" }' },
        'f1',
        'f1/d2', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('d1', 't1', 'f1/d2', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)
        data[0]._id.should.not.be.eql(data[1]._id)
        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          d._id.should.be.not.eql('d1') &&
          d.shortid.should.be.not.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          d.folder.shortid.should.be.eql('f1') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.be.not.eql('d1')
        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce entity update and updated references when both _id and shortid conflict on different folder level (import on folder)', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { data: { shortid: 'd1' } }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'd2', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' },
        'f1',
        'f1/d1', { _id: undefined, shortid: undefined, dataJson: '{ "a": "b" }' }
      )

      await assertExists('d2', 'f1/d1', 'f1/t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)
        data[0]._id.should.not.be.eql(data[1]._id)
        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          d._id.should.be.not.eql('d1') &&
          d.shortid.should.be.not.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].data.shortid.should.be.not.eql('d1')
        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce entity update and updated references when no shortid conflict but entities referenced in conflict', async () => {
      await exportEntities(
        'd1', { dataJson: '{ "a": "a" }' },
        't1', { engine: 'handlebars', data: { shortid: 'd1' } }
      )

      await importEntities(
        't1', { _id: undefined, shortid: undefined },
        'd1', { _id: undefined, shortid: undefined, dataJson: '{ "a": "b" }' },
        'f1',
        'f1/d2', { _id: 'd1', shortid: 'd1', dataJson: '{ "a": "b" }' }
      )

      await assertExists('t1', 'd1', 'f1/d2', (entities) => {
        const { templates, data } = entities
        data.should.have.length(2)
        templates.should.have.length(1)

        data[0]._id.should.not.be.eql(data[1]._id)
        data[0].shortid.should.not.be.eql(data[1].shortid)

        data.should.matchAny((d) => (
          d.name.should.be.eql('d1') &&
          d._id.should.be.not.eql('d1') &&
          d.shortid.should.be.not.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('a')
        ))

        data.should.matchAny((d) => (
          d.name.should.be.eql('d2') &&
          d._id.should.be.eql('d1') &&
          d.shortid.should.be.eql('d1') &&
          JSON.parse(d.dataJson).a.should.be.eql('b')
        ))

        templates[0].engine.should.be.eql('handlebars')
        templates[0].data.shortid.should.not.be.eql('d1')
        templates[0].data.shortid.should.be.eql(data.find((d) => d.name === 'd1').shortid)
      })
    })

    it('should produce entity replace when there is conflict between entities of different entity sets (import on root)', async () => {
      await exportEntities('t1')

      await importEntities('d1', { name: 't1', dataJson: '{ "a": "a" }' })

      await assertExists('t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
      })
    })

    it('should produce entity replace when there is conflict between entities of different entity sets (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d1', { name: 't1', dataJson: '{ "a": "a" }' }
      )

      await assertExists('f1/t1', (entities) => {
        const { folders, templates, data } = entities
        folders.should.have.length(1)
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
      })
    })

    it('should produce entity replace when there is conflict between entities of different entity sets (fullImport: true)', async () => {
      await exportEntities('t1')

      await importEntities(
        { fullImport: true },
        'd1', { name: 't1', dataJson: '{ "a": "a" }' }
      )

      await assertExists('t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
      })
    })

    it('should produce entity replace (keeping _id) when there is conflict between entities of different entity sets (import on root)', async () => {
      await exportEntities('t1')

      await importEntities('d1', { name: 't1', dataJson: '{ "a": "a" }' })

      await assertExists('t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
        templates[0]._id.should.be.eql('t1')
      })
    })

    it('should produce entity replace (keeping _id) when there is conflict between entities of different entity sets (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d1', { name: 't1', dataJson: '{ "a": "a" }' }
      )

      await assertExists('f1/t1', (entities) => {
        const { folders, templates, data } = entities
        folders.should.have.length(1)
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
        templates[0]._id.should.be.eql('t1')
      })
    })

    it('should produce entity replace (keeping shortid) when there is conflict between entities of different entity sets (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'd1', { name: 't1', dataJson: '{ "a": "a" }' }
      )

      await assertExists('t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
        templates[0].shortid.should.be.eql('t1')
      })
    })

    it('should produce entity replace (keeping shortid) when there is conflict between entities of different entity sets (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d1', { name: 't1', dataJson: '{ "a": "a" }' }
      )

      await assertExists('f1/t1', (entities) => {
        const { folders, templates, data } = entities
        folders.should.have.length(1)
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
        templates[0].shortid.should.be.eql('t1')
      })
    })

    it('should produce entity replace (keeping _id, shortid) when there is conflict between entities of different entity sets (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'd1', { name: 't1', dataJson: '{ "a": "a" }' }
      )

      await assertExists('t1', (entities) => {
        const { templates, data } = entities
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
        templates[0]._id.should.be.eql('t1')
        templates[0].shortid.should.be.eql('t1')
      })
    })

    it('should produce entity replace (keeping _id, shortid) when there is conflict between entities of different entity sets (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d1', { name: 't1', dataJson: '{ "a": "a" }' }
      )

      await assertExists('f1/t1', (entities) => {
        const { folders, templates, data } = entities
        folders.should.have.length(1)
        data.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
        templates[0]._id.should.be.eql('t1')
        templates[0].shortid.should.be.eql('t1')
      })
    })

    it('should produce entity replace (generating new _id) when there is conflict between entities of different entity sets (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'd1', { name: 't1', dataJson: '{ "a": "a" }' },
        't2', { _id: 't1' }
      )

      await assertExists('t1', 't2', (entities) => {
        const { templates, data } = entities
        data.should.have.length(0)
        templates.should.have.length(2)
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.not.be.eql('t1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t2') && t._id.should.be.eql('t1'))
      })
    })

    it('should produce entity replace (generating new _id) when there is conflict between entities of different entity sets (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d1', { name: 't1', dataJson: '{ "a": "a" }' },
        'f1/t2', { _id: 't1' }
      )

      await assertExists('f1/t1', 'f1/t2', (entities) => {
        const { folders, templates, data } = entities
        folders.should.have.length(1)
        data.should.have.length(0)
        templates.should.have.length(2)
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.not.be.eql('t1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t2') && t._id.should.be.eql('t1'))
      })
    })

    it('should produce entity replace (generating new shortid) when there is conflict between entities of different entity sets (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'd1', { name: 't1', dataJson: '{ "a": "a" }' },
        'f1',
        'f1/t2', { shortid: 't1' }
      )

      await assertExists('t1', 'f1/t2', (entities) => {
        const { templates, data } = entities
        data.should.have.length(0)
        templates.should.have.length(2)
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t.shortid.should.not.be.eql('t1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t2') && t.shortid.should.be.eql('t1'))
      })
    })

    it('should produce entity replace (generating new shortid) when there is conflict between entities of different entity sets (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/d1', { name: 't1', dataJson: '{ "a": "a" }' },
        't2', { shortid: 't1' }
      )

      await assertExists('t2', 'f1/t1', (entities) => {
        const { folders, templates, data } = entities
        folders.should.have.length(1)
        data.should.have.length(0)
        templates.should.have.length(2)
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t.shortid.should.not.be.eql('t1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t2') && t.shortid.should.be.eql('t1'))
      })
    })

    it('should produce entity replace (generating new _id, shortid) when there is conflict between entities of different entity sets (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'd1', { name: 't1', dataJson: '{ "a": "a" }' },
        'f1',
        'f1/t2', { _id: 't1', shortid: 't1' }
      )

      await assertExists('t1', 'f1/t2', (entities) => {
        const { templates, data } = entities
        data.should.have.length(0)
        templates.should.have.length(2)
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.not.be.eql('t1') && t.shortid.should.not.be.eql('t1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t2') && t._id.should.be.eql('t1') && t.shortid.should.be.eql('t1'))
      })
    })

    it('should produce entity replace (generating new _id, shortid) when there is conflict between entities of different entity sets (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'f1' },
        't2', { _id: 't1', shortid: 't1' },
        'f1',
        'f1/d1', { name: 't1', dataJson: '{ "a": "a" }' }
      )

      await assertExists('t2', 'f1/t1', (entities) => {
        const { folders, templates, data } = entities
        folders.should.have.length(1)
        data.should.have.length(0)
        templates.should.have.length(2)
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.not.be.eql('t1') && t.shortid.should.not.be.eql('t1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t2') && t._id.should.be.eql('t1') && t.shortid.should.be.eql('t1'))
      })
    })

    it('should produce entity replace and child entities removed when there is conflict between folder and other entity set (import on root)', async () => {
      await exportEntities('t1')

      await importEntities(
        'f1', { name: 't1' },
        't1/t2',
        't1/t3',
        't1/f2',
        't1/f2/t4'
      )

      await assertExists('t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(0)
        templates.should.have.length(1)
        templates[0].name.should.be.eql('t1')
      })
    })

    it('should produce entity replace and child entities removed when there is conflict between folder and other entity set (import on folder)', async () => {
      await exportEntities('t1')

      await importEntities(
        { targetFolder: 'fcontainer' },
        'fcontainer',
        'fcontainer/f1', { name: 't1' },
        'fcontainer/t1/t2',
        'fcontainer/t1/t3',
        'fcontainer/t1/f2',
        'fcontainer/t1/f2/t4'
      )

      await assertExists('fcontainer/t1', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(1)
        templates.should.have.length(1)
        folders[0].name.should.be.eql('fcontainer')
        templates[0].name.should.be.eql('t1')
      })
    })

    it('should produce entity replace and child entities inserted when there is conflict between other entity set and folder (import on root)', async () => {
      await exportEntities(
        'f1', { name: 'tf' },
        'tf/t1',
        'tf/t2',
        'tf/f2',
        'tf/f2/t3'
      )

      await importEntities('tf')

      await assertExists('tf/t1', 'tf/t2', 'tf/f2', 'tf/f2/t3', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(2)
        templates.should.have.length(3)
      })
    })

    it('should produce entity replace and child entities inserted when there is conflict between other entity set and folder (import on folder)', async () => {
      await exportEntities(
        'f1',
        'f1/t1',
        'f1/t2',
        'f1/f2',
        'f1/f2/t3'
      )

      await importEntities(
        { targetFolder: 'fcontainer' },
        'fcontainer',
        'fcontainer/tfoo', { name: 'f1' }
      )

      await assertExists('fcontainer/f1', 'fcontainer/f1/t1', 'fcontainer/f1/t2', 'fcontainer/f1/f2', 'fcontainer/f1/f2/t3', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(3)
        templates.should.have.length(3)
      })
    })

    it('should produce updated references when folder shortid conflict (import on root)', async () => {
      await exportEntities(
        'f1',
        'f1/t1'
      )

      await importEntities(
        'f1', { _id: undefined, shortid: 'custom' },
        'fcontainer',
        'fcontainer/f2', { shortid: 'f1' }
      )

      await assertExists('f1/t1', 'fcontainer/f2', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(3)
        templates.should.have.length(1)
        folders.should.matchAny((f) => f.name.should.be.eql('f2') && f.shortid.should.be.eql('f1'))
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f.shortid.should.be.not.eql('f1') && f.shortid.should.be.eql('custom'))
        templates[0].name.should.be.eql('t1')
        templates[0].folder.shortid.should.be.eql('custom')
      })
    })

    it('should produce updated references when folder shortid conflict (import on folder)', async () => {
      await exportEntities(
        'f1',
        'f1/t1'
      )

      await importEntities(
        { targetFolder: 'fcontainer' },
        'fcontainer',
        'fcontainer/f1', { _id: undefined, shortid: 'custom' },
        'fcontainer/fparent',
        'fcontainer/fparent/f2', { shortid: 'f1' }
      )

      await assertExists('fcontainer/f1/t1', 'fcontainer/fparent/f2', (entities) => {
        const { folders, templates } = entities
        folders.should.have.length(4)
        templates.should.have.length(1)
        folders.should.matchAny((f) => f.name.should.be.eql('f2') && f.shortid.should.be.eql('f1'))
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f.shortid.should.be.not.eql('f1') && f.shortid.should.be.eql('custom'))
        templates[0].name.should.be.eql('t1')
        templates[0].folder.shortid.should.be.eql('custom')
      })
    })

    it('should not produce entity update when importing folder into the same folder but with existing folder there (import on folder)', async () => {
      await exportEntities(
        'f1'
      )

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/f1', { _id: 'cf1', shortid: 'cf1' }
      )

      await assertExists('f1', 'f1/f1', (entities) => {
        const folders = entities.folders
        folders.should.have.length(2)
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.eql('f1') && f.shortid.should.eql('f1') && should(f.folder).be.not.ok())
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.eql('cf1') && f.shortid.should.be.eql('cf1') && f.folder.shortid.should.be.eql('f1'))
      })
    })

    it('should produce entity insert, update and updated references when importing folder with nested entities inside the same folder (import on folder)', async () => {
      await exportEntities(
        'f1',
        'f1/t1',
        'f1/f1', { _id: 'cf1', shortid: 'cf1' },
        'f1/f1/t1', { _id: 'ct1', shortid: 'ct1' }
      )

      await importEntities(
        { targetFolder: 'f1' },
        'f1',
        'f1/t1',
        'f1/f1', { _id: 'cf1', shortid: 'cf1' },
        'f1/f1/t1', { _id: 'ct1', shortid: 'ct1' }
      )

      await assertExists('f1', 'f1/t1', 'f1/f1', 'f1/f1/t1', 'f1/f1/f1', 'f1/f1/f1/t1', (entities) => {
        const folders = entities.folders
        const templates = entities.templates
        folders.should.have.length(3)
        templates.should.have.length(3)
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.eql('f1') && f.shortid.should.eql('f1') && should(f.folder).be.not.ok())
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.not.eql('f1') && f.shortid.should.be.eql('cf1') && f.folder.shortid.should.be.eql('f1'))
        folders.should.matchAny((f) => f.name.should.be.eql('f1') && f._id.should.be.not.eql('f1') && f.shortid.should.be.not.oneOf(['f1', 'cf1']) && f.folder.shortid.should.be.eql('cf1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.be.eql('t1') && t.shortid.should.be.eql('t1') && t.folder.shortid.should.be.eql('f1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.be.not.eql('t1') && t.shortid.should.eql('ct1') && t.folder.shortid.should.be.eql('cf1'))
        templates.should.matchAny((t) => t.name.should.be.eql('t1') && t._id.should.be.not.eql('t1') && t.shortid.should.be.not.oneOf(['t1', 'ct1']) && t.folder.shortid.should.be.not.oneOf(['f1', 'cf1']))
      })
    })
  })
}
