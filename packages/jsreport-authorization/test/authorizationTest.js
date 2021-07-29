const should = require('should')
const jsreport = require('jsreport-core')

describe('authorization', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
    reporter.use(require('../')())
    reporter.use((reporter, definition) => {
      // auth fake
      reporter.authentication = {}
      reporter.documentStore.model.entityTypes.UserType = {}
    })
    return reporter.init()
  })

  afterEach(() => reporter.close())

  function createTemplate (req) {
    return reporter.documentStore.collection('templates').insert({ content: 'foo', name: 'foo', engine: 'none', recipe: 'html' }, req)
  }

  async function countTemplates (req) {
    const res = await reporter.documentStore.collection('templates').find({}, req)
    return res.length
  }

  const req1 = () => reporter.Request({ context: { user: { _id: 'a' } } })
  const req2 = () => reporter.Request({ context: { user: { _id: 'b' } } })
  const reqAdmin = () => reporter.Request({ context: { user: { _id: 'admin', isAdmin: true } } })

  it('user creating entity should be able to read it', async () => {
    await createTemplate(req1())
    const count = await countTemplates(req1())
    count.should.be.eql(1)
  })

  it('user creating entity should be added to read, edit permissions', async () => {
    const req = req1()
    const template = await createTemplate(req)

    const readPermissions = template.readPermissions || []
    const editPermissions = template.editPermissions || []

    readPermissions.should.have.length(1)
    editPermissions.should.have.length(1)
    template.readPermissions.should.containEql(req.context.user._id)
    template.editPermissions.should.containEql(req.context.user._id)
  })

  it('admin user creating entity should not be added to read, edit permissions', async () => {
    const req = reqAdmin()
    const template = await createTemplate(req)

    const readPermissions = template.readPermissions || []
    const editPermissions = template.editPermissions || []

    readPermissions.should.have.length(0)
    editPermissions.should.have.length(0)
    readPermissions.should.not.containEql(req.context.user._id)
    editPermissions.should.not.containEql(req.context.user._id)
  })

  it('user should not be able to read entity without permission to it', async () => {
    await createTemplate(req1())
    const count = await countTemplates(req2())
    count.should.be.eql(0)
  })

  it('query should filter out entities without permissions', async () => {
    await reporter.documentStore.collection('templates').insert({ content: 'foo', name: 'a', engine: 'none', recipe: 'html' }, req1())
    await reporter.documentStore.collection('templates').insert({ content: 'foo', name: 'b', engine: 'none', recipe: 'html' }, req2())
    const count = await countTemplates(req1())
    count.should.be.eql(1)
  })

  it('user creating entity should be able to update it', async () => {
    await createTemplate(req1())
    await reporter.documentStore.collection('templates').update({}, { $set: { content: 'hello' } }, req1())
    const templates = await reporter.documentStore.collection('templates').find({}, req1())
    templates[0].content.should.be.eql('hello')
  })

  it('user creating entity should be able to remove it', async () => {
    await createTemplate(req1())
    await reporter.documentStore.collection('templates').update({}, { $set: { content: 'hello' } }, req1())
    await reporter.documentStore.collection('templates').remove({}, req1())
    const count = await countTemplates(req1())
    count.should.be.eql(0)
  })

  it('user without permission should not be able to update entity', async () => {
    await createTemplate(req1())
    return reporter.documentStore.collection('templates')
      .update({}, { $set: { content: 'hello' } }, req2())
      .should.be.rejectedWith(/Unauthorized/)
  })

  it('user without permission should not be able to remove entity', async () => {
    await createTemplate(req1())
    return reporter.documentStore.collection('templates')
      .remove({}, req2())
      .should.be.rejectedWith(/Unauthorized/)
  })

  it('admin user should be able to remove entity even without permission', async () => {
    await createTemplate(req1())
    await reporter.documentStore.collection('templates').remove({}, reporter.Request({ context: { user: { isAdmin: true } } }))
    const count = await countTemplates(req1())
    count.should.be.eql(0)
  })

  it('admin user should be able to update entity even without permission', async () => {
    await createTemplate(req1())
    await reporter.documentStore.collection('templates').update({}, { $set: { content: 'hello' } }, reporter.Request({ context: { user: { isAdmin: true } } }))
    const templates = await reporter.documentStore.collection('templates').find({}, req1())
    templates[0].content.should.be.eql('hello')
  })

  it('authorizeRequest should return false when user is not authorized', async () => {
    const requestAuth = await reporter.authorization.authorizeRequest({ context: { } })
    should(requestAuth).not.be.ok()
  })

  it('authorizeRequest should return true when user is authorized', async () => {
    const requestAuth = await reporter.authorization.authorizeRequest(req1())
    should(requestAuth).be.ok()
  })

  it('user with readAllPermissions should be able to read all entities', async () => {
    await createTemplate(req1())
    const count = await countTemplates(reporter.Request({ context: { user: { _id: 'foo', readAllPermissions: true } } }))
    count.should.be.eql(1)
  })

  it('user with editAllPermissions should be able to update entities', async () => {
    await createTemplate(req1())
    const req = reporter.Request({ context: { user: { _id: 'foo', editAllPermissions: true } } })
    await reporter.documentStore.collection('templates').update({}, { $set: { content: 'hello' } }, req)
  })

  it('query with $or should still correctly filter permissions', async () => {
    await reporter.documentStore.collection('templates').insert({
      name: 'a',
      engine: 'none',
      recipe: 'html'
    }, req1())
    await reporter.documentStore.collection('templates').insert({
      name: 'b',
      engine: 'none',
      recipe: 'html'
    }, req1())
    await reporter.documentStore.collection('templates').insert({
      name: 'c',
      engine: 'none',
      recipe: 'html'
    }, req1())
    const templates = await reporter.documentStore.collection('templates').find({
      $or: [{ name: 'a' }, { name: 'b' }]
    }, req1())

    templates.should.have.length(2)
  })

  it('query with $and should still correctly filter permissions', async () => {
    await reporter.documentStore.collection('templates').insert({
      name: 'a',
      engine: 'none',
      recipe: 'html'
    }, req1())
    await reporter.documentStore.collection('templates').insert({
      name: 'b',
      engine: 'none',
      recipe: 'html'
    }, req1())
    await reporter.documentStore.collection('templates').insert({
      name: 'c',
      engine: 'none',
      recipe: 'another'
    }, req1())
    const templates = await reporter.documentStore.collection('templates').find({
      $and: [{ engine: 'none' }, { recipe: 'html' }]
    }, req1())

    templates.should.have.length(2)
  })

  it('user with permissions to the folder should have access also to the entities inside the folder', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      readPermissions: [req2().context.user._id]
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folder'
      }
    }, req1())

    const count = await countTemplates(req2())
    count.should.be.eql(1)
  })

  it('user should not be able to create entities in folders where he has no permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      visibilityPermissions: ['a']
    }, reqAdmin())

    return reporter.documentStore.collection('templates').insert({
      name: 'nested',
      engine: 'none',
      recipe: 'html',
      shortid: 'nested',
      folder: { shortid: 'folder' }
    }, req1()).should.be.rejectedWith(/Unauthorized/)
  })

  it('user should be able to create entities in folders where he has permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      editPermissions: ['b'],
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      shortid: 'template',
      engine: 'none',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, req2())
  })

  it('user should not be able to update entities in folders where he has no permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder'
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'folder' }
    }, req1())

    return reporter.documentStore.collection('templates').update({
      name: 'template'
    }, {
      $set: { content: 'change' }
    }, req2()).should.be.rejected()
  })

  it('user should be able to update entities in folders where he has permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      editPermissions: [req2().context.user._id],
      readPermissions: [req2().context.user._id]
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'folder' }
    }, req2())

    return reporter.documentStore.collection('templates').update({
      name: 'template'
    }, {
      $set: { content: 'change' }
    }, req1())
  })

  it('user should be able to insert entities in folders where he has permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      editPermissions: [req2().context.user._id],
      readPermissions: [req2().context.user._id]
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'folder' }
    }, req2())
  })

  it('user should not be able to remove entities in folders where he has no permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder'
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'folder' }
    }, req1())

    return reporter.documentStore.collection('templates').remove({
      name: 'template'
    }, req2()).should.be.rejected()
  })

  it('user should be able to remove entities in folders where he has permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      editPermissions: [req2().context.user._id]
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'folder' }
    }, req1())

    return reporter.documentStore.collection('templates').remove({
      name: 'template'
    }, req2())
  })

  it('updating folder permissions should propagate to the all childs', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'a',
      shortid: 'a'
    }, req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'b',
      shortid: 'b',
      folder: { shortid: 'a' }
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'b' }
    }, req1())

    await reporter.documentStore.collection('folders').update({
      name: 'a'
    }, {
      $set: { editPermissions: [req1().context.user._id, req2().context.user._id] }
    }, req1())

    const count = await countTemplates(req2())
    count.should.be.eql(1)
  })

  it('updating entity folder should get permissions from it', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'b',
      shortid: 'b',
      readPermissions: ['c']
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo'
    }, req1())

    await reporter.documentStore.collection('templates').update({
      name: 'template'
    }, {
      $set: { folder: { shortid: 'b' } }
    }, req1())

    const count = await countTemplates(reporter.Request({ context: { user: { _id: 'c' } } }))
    count.should.be.eql(1)
  })

  it('removing entity folder should remove inherited permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'b',
      shortid: 'b'
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: {
        shortid: 'b'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'template'
    }, {
      $set: { folder: null }
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(0)
  })

  it('user with read to an entity should be able to read parent folders', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      folder: { shortid: 'foldera' }
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, req1())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissions: [req2().context.user._id] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(2)
  })

  it('failed authorizatoin should not update visibility permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      shortid: 'template',
      engine: 'none',
      recipe: 'html',
      readPermissions: ['a'],
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').remove({ name: 'template' }, req1()).should.be.rejectedWith(/Unauthorized/)

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(1)
  })

  it('moving folder should recalculate visibility permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb'
    }, req2())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, req2())

    await reporter.documentStore.collection('folders').update({ name: 'folderb' }, { $set: { folder: { shortid: 'foldera' } } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(2)
  })

  it('moving folder should recalculate visibility permissions from inherited permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissions: ['b'] } }, reqAdmin())
    await reporter.documentStore.collection('folders').update({ name: 'folderb' }, { $set: { folder: { shortid: 'foldera' } } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(2)
  })

  it('moving folder should remove outdated visibility permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb'
    }, req2())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, req2())

    await reporter.documentStore.collection('folders').update({ name: 'folderb' }, { $set: { folder: { shortid: 'foldera' } } }, reqAdmin())
    await reporter.documentStore.collection('folders').update({ name: 'folderb' }, { $set: { folder: null } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(1)
  })

  it('moving folder inside the same hierarchy should refresh visibility permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      },
      readPermissions: [req1().context.user._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { folder: { shortid: 'foldera' } } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(1)
  })

  it('removing entity should recalculate visibility', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissions: ['b'] } }, reqAdmin())
    await reporter.documentStore.collection('templates').remove({ }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('inserting entity should recalculate visibility on folders', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      editPermissions: ['a'],
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(1)
  })

  it('inserting entity should recalculate visibility on folders (permissions on folder)', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      editPermissions: ['a'],
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(1)
  })

  it('inserting entity should recalculate visibility on folders (nested)', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      editPermissions: ['a'],
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(2)
  })

  it('inserting entity should recalculate visibility on folders (nested - permissions on folder)', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      folder: {
        shortid: 'foldera'
      },
      editPermissions: ['a']
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(2)
  })

  it('removing entity permissions should recalculate visibility', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissions: ['b'],
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissions: [] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('removing folder permissions should recalculate visibility in the parent folder', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissions: ['b'],
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('folders').remove({ name: 'folderb' }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('should not have user on context when collecting entities for visibility propagation', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, req2())

    reporter.documentStore.collection('templates').beforeFindListeners.insert(0, 'test', (q, p, req) => {
      if (q.folder) {
        should(req.context.user).not.be.ok()
      }
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'foldera'
      }
    }, req2())
  })
})

const util = require('util')
const ncp = util.promisify(require('ncp'))
const rimraf = util.promisify(require('rimraf'))
const path = require('path')

describe('authorization migration', () => {
  let reporter

  beforeEach(async () => {
    await rimraf(path.join(__dirname, 'datatmp'))
    await ncp(path.join(__dirname, 'data'), path.join(__dirname, 'datatmp'))
    reporter = jsreport({
      store: {
        provider: 'fs'
      }
    })
    reporter.use(require('../')())
    reporter.use(require('jsreport-fs-store')({ dataDirectory: path.join(__dirname, 'datatmp') }))
    reporter.use((reporter, definition) => {
      // auth fake
      reporter.authentication = {}
      reporter.documentStore.model.entityTypes.UserType = {}
    })
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should propagate visibility permissions to the folders', async () => {
    const folders = await reporter.documentStore.collection('folders').find({})
    folders.should.have.length(1)
    folders[0].visibilityPermissions.should.have.length(1)
    folders[0].visibilityPermissions[0].should.be.eql('jUEFiKelpSjuQkae')

    const templates = await reporter.documentStore.collection('templates').find({}, {}, reporter.Request({
      context: {
        user: {
          _id: 'jUEFiKelpSjuQkae'
        }
      }
    }))
    templates.should.have.length(1)
  })
})
