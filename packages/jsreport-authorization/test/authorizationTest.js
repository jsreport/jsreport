const should = require('should')
const jsreport = require('@jsreport/jsreport-core')

describe('authorization', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
    reporter.use(require('@jsreport/jsreport-authentication')({
      admin: {
        username: 'admin',
        password: 'password'
      },
      cookieSession: {
        secret: 'secret'
      }
    }))
    reporter.use(require('../')())
    reporter.use((reporter, definition) => {
      reporter.initializeListeners.add('authorization-test', async () => {
        await reporter.documentStore.collection('users').insert({
          _id: 'a',
          name: 'a',
          password: 'a',
          shortid: 'a'
        })

        await reporter.documentStore.collection('users').insert({
          _id: 'b',
          name: 'b',
          password: 'b',
          shortid: 'b'
        })
      })
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

  const req1 = () => reporter.Request({ context: { user: { _id: 'a', shortid: 'a' } } })
  const req2 = () => reporter.Request({ context: { user: { _id: 'b', shortid: 'b' } } })
  const reqAdmin = () => reporter.Request({ context: { user: { _id: 'admin', isAdmin: true } } })
  const reqGroup = (g) => reporter.Request({ context: { user: { _id: g._id, isGroup: true } } })

  const addUserToGroup = async (name, userReq) => {
    let group = await reporter.documentStore.collection('usersGroups').findOne({ name }, reqAdmin())

    if (group == null) {
      group = await reporter.documentStore.collection('usersGroups').insert({ name, users: [] }, reqAdmin())
    }

    await reporter.documentStore.collection('usersGroups').update({
      _id: group._id
    }, {
      $set: {
        users: [...group.users, { shortid: userReq.context.user.shortid }]
      }
    }, reqAdmin())

    return reporter.documentStore.collection('usersGroups').findOne({ name }, reqAdmin())
  }

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
    await reporter.documentStore.collection('templates').insert({ content: 'foo', name: 't1', engine: 'none', recipe: 'html' }, req1())
    await reporter.documentStore.collection('templates').insert({ content: 'foo', name: 't2', engine: 'none', recipe: 'html' }, req2())
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

  it('req with no user should be able to remove entities', async () => {
    await createTemplate(req1())
    return reporter.documentStore.collection('templates').remove({
      name: 'template'
    }, reporter.Request({}))
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
      name: 't1',
      engine: 'none',
      recipe: 'html'
    }, req1())
    await reporter.documentStore.collection('templates').insert({
      name: 't2',
      engine: 'none',
      recipe: 'html'
    }, req1())
    await reporter.documentStore.collection('templates').insert({
      name: 't3',
      engine: 'none',
      recipe: 'html'
    }, req1())
    const templates = await reporter.documentStore.collection('templates').find({
      $or: [{ name: 't1' }, { name: 't2' }]
    }, req1())

    templates.should.have.length(2)
  })

  it('query with $and should still correctly filter permissions', async () => {
    await reporter.documentStore.collection('templates').insert({
      name: 't1',
      engine: 'none',
      recipe: 'html'
    }, req1())
    await reporter.documentStore.collection('templates').insert({
      name: 't2',
      engine: 'none',
      recipe: 'html'
    }, req1())
    await reporter.documentStore.collection('templates').insert({
      name: 't3',
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
      visibilityPermissions: [req1().context.user._id]
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
      editPermissions: [req2().context.user._id],
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

  it('updating folder permissions should propagate to the all children', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    }, req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'f2',
      shortid: 'f2',
      folder: { shortid: 'f1' }
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'f2' }
    }, req1())

    await reporter.documentStore.collection('folders').update({
      name: 'f1'
    }, {
      $set: { editPermissions: [req1().context.user._id, req2().context.user._id] }
    }, req1())

    const count = await countTemplates(req2())
    count.should.be.eql(1)
  })

  it('updating entity to a folder should get permissions from it', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1',
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
      $set: { folder: { shortid: 'f1' } }
    }, req1())

    const count = await countTemplates(reporter.Request({ context: { user: { _id: 'c' } } }))
    count.should.be.eql(1)
  })

  it('updating entity from a folder to the root should remove inherited permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: {
        shortid: 'f1'
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

  it('failed authorization when updating entity should not update visibility permissions', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      shortid: 'template',
      engine: 'none',
      recipe: 'html',
      readPermissions: [req1().context.user._id],
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

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissions: [req2().context.user._id] } }, reqAdmin())
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

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissions: [req2().context.user._id] } }, reqAdmin())
    await reporter.documentStore.collection('templates').remove({ }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('removing entity should not fail cause visibility recalc when user has no permissions to parent folder', async () => {
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
      }
    }, reqAdmin())

    await reporter.documentStore.collection('folders').update({ name: 'folderb' }, {
      $set: {
        editPermissions: [req2().context.user._id]
      }
    }, reqAdmin())

    await reporter.documentStore.collection('folders').remove({ name: 'folderb' }, req2())
    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('removing entity should recalculate and preserve visibility', async () => {
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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissions: [req2().context.user._id] } }, reqAdmin())
    await reporter.documentStore.collection('templates').update({ name: 'template2' }, { $set: { readPermissions: [req2().context.user._id] } }, reqAdmin())
    await reporter.documentStore.collection('templates').remove({ name: 'template' }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(1)
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
      editPermissions: [req1().context.user._id],
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
      editPermissions: [req1().context.user._id],
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
      editPermissions: [req1().context.user._id],
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
      editPermissions: [req1().context.user._id]
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

  it('updating folder permissions should preserve inherited permissions in its children', async () => {
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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'foldera'
      },
      readPermissions: [req1().context.user._id]
    }, reqAdmin())

    await reporter.documentStore.collection('folders').update({ name: 'foldera' }, { $set: { readPermissions: [req2().context.user._id] } }, reqAdmin())

    const count = await reporter.documentStore.collection('templates').count({}, req1())
    count.should.be.eql(1)

    const foldersCount = await reporter.documentStore.collection('folders').count({}, req1())
    foldersCount.should.be.eql(1)

    const count2 = await reporter.documentStore.collection('templates').count({}, req2())
    count2.should.be.eql(2)

    const foldersCount2 = await reporter.documentStore.collection('folders').count({}, req2())
    foldersCount2.should.be.eql(1)
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
      readPermissions: [req2().context.user._id],
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissions: [] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('removing folder should recalculate visibility in the parent folder', async () => {
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
      readPermissions: [req2().context.user._id],
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

  it('user inside group should not be able to read entity if group has no permission to it', async () => {
    await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html'
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(0)
  })

  it('user inside group should be able to read entity if group has permission to it', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(1)
  })

  it('user without group should not be able to read entity with only permissions to group', async () => {
    const g1 = await reporter.documentStore.collection('usersGroups').insert({ name: 'g1', users: [] }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(0)
  })

  it('user inside group should not be able to edit entity if group has no permissions to it', async () => {
    await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html'
    }, reqAdmin())

    return reporter.documentStore.collection('templates')
      .update({ name: 'foo' }, { $set: { content: 'hello' } }, req1())
      .should.be.rejectedWith(/Unauthorized/)
  })

  it('user inside group should not be able to remove entity if group has no permissions to it', async () => {
    await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html'
    }, reqAdmin())

    return reporter.documentStore.collection('templates')
      .remove({ name: 'foo' }, req1())
      .should.be.rejectedWith(/Unauthorized/)
  })

  it('user inside group should be able to edit entity if group has permissions to it', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html',
      editPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: { content: 'hello' }
    }, req1())

    const templates = await reporter.documentStore.collection('templates').find({}, req1())
    templates[0].content.should.be.eql('hello')
  })

  it('user inside group should be able to remove entity if group has permissions to it', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html',
      editPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').remove({
      name: 'foo'
    }, req1())

    const templates = await reporter.documentStore.collection('templates').find({}, req1())
    templates.should.have.length(0)
  })

  it('user inside group should not be able to read entity if entity permissions was updated to disallow the group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: {
        readPermissionsGroup: []
      }
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(0)
  })

  it('user inside group should not be able to edit entity if entity permissions was updated to disallow the group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html',
      editPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: {
        editPermissionsGroup: []
      }
    }, reqAdmin())

    return reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: { content: 'hello' }
    }, req1()).should.be.rejectedWith(/Unauthorized/)
  })

  it('user inside group should not be able to remove entity if entity permissions was updated to disallow the group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html',
      editPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: {
        editPermissionsGroup: []
      }
    }, reqAdmin())

    return reporter.documentStore.collection('templates').remove({
      name: 'foo'
    }, req1()).should.be.rejectedWith(/Unauthorized/)
  })

  it('user inside group should be able to read entity if entity permissions was updated to allow the group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: {
        readPermissionsGroup: [g1._id]
      }
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(1)
  })

  it('user inside group should be able to edit entity if entity permissions was updated to allow the group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: {
        editPermissionsGroup: [g1._id]
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: { content: 'hello' }
    }, req1())

    const templates = await reporter.documentStore.collection('templates').find({}, req1())
    templates[0].content.should.be.eql('hello')
  })

  it('user inside group should be able to remove entity if entity permissions was updated to allow the group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      content: 'foo',
      name: 'foo',
      engine: 'none',
      recipe: 'html'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'foo'
    }, {
      $set: {
        editPermissionsGroup: [g1._id]
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').remove({
      name: 'foo'
    }, req1())

    const templates = await reporter.documentStore.collection('templates').find({}, req1())
    templates.should.have.length(0)
  })

  it('user inside group with permissions to the folder should have access also to the entities inside the folder', async () => {
    const g1 = await addUserToGroup('g1', req2())

    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      readPermissionsGroup: [g1._id]
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

  it('user inside group should not be able to create entities in folders where group has no permissions', async () => {
    await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      visibilityPermissions: [req1().context.user._id]
    }, reqAdmin())

    return reporter.documentStore.collection('templates').insert({
      name: 'nested',
      engine: 'none',
      recipe: 'html',
      shortid: 'nested',
      folder: { shortid: 'folder' }
    }, req1()).should.be.rejectedWith(/Unauthorized/)
  })

  it('user inside group should be able to create entities in folders where group has permissions', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      editPermissionsGroup: [g1._id],
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
    }, req1())
  })

  it('user inside group should not be able to update entities in folders where group has no permissions', async () => {
    await addUserToGroup('g1', req1())

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

  it('user inside group should be able to update entities in folders where group has permissions', async () => {
    const g1 = await addUserToGroup('g1', req2())

    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      editPermissionsGroup: [g1._id],
      readPermissionsGroup: [g1._id]
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'folder' }
    }, req1())

    await reporter.documentStore.collection('templates').update({
      name: 'template'
    }, {
      $set: { content: 'change' }
    }, req2())
  })

  it('user inside group should be able to insert entities in folders where group has permissions', async () => {
    const g1 = await addUserToGroup('g1', req2())

    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      editPermissionsGroup: [g1._id],
      readPermissionsGroup: [g1._id]
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'folder' }
    }, req2())
  })

  it('user inside group should not be able to remove entities in folders where group has no permissions', async () => {
    await addUserToGroup('g1', req2())

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
    }, req2()).should.be.rejectedWith(/Unauthorized/)
  })

  it('user inside group should be able to remove entities in folders where group has permissions', async () => {
    const g1 = await addUserToGroup('g1', req2())

    await reporter.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder',
      editPermissionsGroup: [g1._id]
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

  it('updating folder group permissions should propagate to the all children', async () => {
    const g1 = await addUserToGroup('g1', req2())

    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    }, req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'f2',
      shortid: 'f2',
      folder: { shortid: 'f1' }
    }, req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: { shortid: 'f2' }
    }, req1())

    await reporter.documentStore.collection('folders').update({
      name: 'f1'
    }, {
      $set: { editPermissionsGroup: [g1._id] }
    }, req1())

    const count = await countTemplates(req2())
    count.should.be.eql(1)
  })

  it('updating entity to a folder with group permissions should get permissions from it', async () => {
    await reporter.documentStore.collection('users').insert({
      _id: 'c',
      name: 'c',
      password: 'c',
      shortid: 'c'
    })

    const g1 = await addUserToGroup('g1', reporter.Request({ context: { user: { _id: 'c', shortid: 'c' } } }))

    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1',
      readPermissionsGroup: [g1._id]
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
      $set: { folder: { shortid: 'f1' } }
    }, req1())

    const count = await countTemplates(reporter.Request({ context: { user: { _id: 'c', shortid: 'c' } } }))
    count.should.be.eql(1)
  })

  it('updating entity from a folder with group permissions to the root should remove inherited permissions', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      folder: {
        shortid: 'f1'
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

  it('user inside group with read to an entity should be able to read parent folders', async () => {
    const g1 = await addUserToGroup('g1', req2())

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

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissionsGroup: [g1._id] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(2)
  })

  it('moving folder should recalculate visibility permissions from inherited permissions (groups)', async () => {
    const g1 = await addUserToGroup('g1', req2())

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

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissionsGroup: [g1._id] } }, reqAdmin())
    await reporter.documentStore.collection('folders').update({ name: 'folderb' }, { $set: { folder: { shortid: 'foldera' } } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(2)
  })

  it('moving folder inside the same hierarchy should refresh visibility permissions (groups)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { folder: { shortid: 'foldera' } } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(1)
  })

  it('inserting entity with group permissions should recalculate visibility on folders', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      editPermissionsGroup: [g1._id],
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(1)
  })

  it('inserting entity should recalculate visibility on folders (group permissions on folder)', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      editPermissionsGroup: [g1._id],
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

  it('inserting entity should recalculate visibility on folders (nested - groups permissions)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      editPermissionsGroup: [g1._id],
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(2)
  })

  it('inserting entity should recalculate visibility on folders (nested - groups permissions on folder)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      editPermissionsGroup: [g1._id]
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

  it('updating folder group permissions should preserve inherited permissions from group in its children', async () => {
    const g1 = await addUserToGroup('g1', req1())
    const g2 = await addUserToGroup('g2', req2())

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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'foldera'
      },
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('folders').update({ name: 'foldera' }, { $set: { readPermissionsGroup: [g2._id] } }, reqAdmin())

    const count = await reporter.documentStore.collection('templates').count({}, req1())
    count.should.be.eql(1)

    const foldersCount = await reporter.documentStore.collection('folders').count({}, req1())
    foldersCount.should.be.eql(1)

    const count2 = await reporter.documentStore.collection('templates').count({}, req2())
    count2.should.be.eql(2)

    const foldersCount2 = await reporter.documentStore.collection('folders').count({}, req2())
    foldersCount2.should.be.eql(1)
  })

  it('updating folder group permissions should calculate visibility for itself', async () => {
    const g1 = await addUserToGroup('g1', req1())

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

    await reporter.documentStore.collection('folders').update({ name: 'foldera' }, { $set: { readPermissionsGroup: [g1._id] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(1)

    const f = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())

    f.visibilityPermissions.should.have.length(2)
    f.visibilityPermissions.should.containEql(g1._id)
    f.visibilityPermissions.should.containEql(req1().context.user._id)
  })

  it('updating folder group permissions should calculate visibility for itself (nested)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      }
    }, reqAdmin())

    await reporter.documentStore.collection('folders').update({ name: 'folderb' }, { $set: { readPermissionsGroup: [g1._id] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(2)

    const fa = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())

    fa.visibilityPermissions.should.have.length(2)
    fa.visibilityPermissions.should.containEql(g1._id)
    fa.visibilityPermissions.should.containEql(req1().context.user._id)

    const fb = await reporter.documentStore.collection('folders').findOne({ name: 'folderb' }, reqAdmin())

    fb.visibilityPermissions.should.have.length(2)
    fb.visibilityPermissions.should.containEql(g1._id)
    fb.visibilityPermissions.should.containEql(req1().context.user._id)
  })

  it('removing folder group permissions should calculate visibility for itself', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera',
      readPermissionsGroup: [g1._id]
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

    await reporter.documentStore.collection('folders').update({ name: 'foldera' }, { $set: { readPermissionsGroup: [] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(0)

    const f = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())

    f.visibilityPermissions = f.visibilityPermissions || []
    f.visibilityPermissions.should.have.length(0)
  })

  it('removing folder group permissions should calculate visibility for itself (nested)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      readPermissionsGroup: [g1._id]
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

    await reporter.documentStore.collection('folders').update({ name: 'folderb' }, { $set: { readPermissionsGroup: [] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(0)

    const fa = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())

    fa.visibilityPermissions.should.have.length(0)

    const fb = await reporter.documentStore.collection('folders').findOne({ name: 'folderb' }, reqAdmin())

    fb.visibilityPermissions.should.have.length(0)
  })

  it('removing folder group permissions should calculate visibility for itself with update like studio (nested)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      readPermissionsGroup: [g1._id]
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

    const originalFb = await reporter.documentStore.collection('folders').findOne({ name: 'folderb' }, reqAdmin())

    await reporter.documentStore.collection('folders').update({
      name: 'folderb'
    }, {
      $set: {
        ...originalFb,
        readPermissionsGroup: []
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(0)

    const fa = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())

    fa.inheritedReadPermissions.should.have.length(0)
    fa.inheritedEditPermissions.should.have.length(0)
    fa.visibilityPermissions.should.have.length(0)

    const fb = await reporter.documentStore.collection('folders').findOne({ name: 'folderb' }, reqAdmin())

    fb.inheritedReadPermissions.should.have.length(0)
    fb.inheritedEditPermissions.should.have.length(0)
    fb.visibilityPermissions.should.have.length(0)
  })

  it('removing entity group permissions should recalculate visibility', async () => {
    const g1 = await addUserToGroup('g1', req2())

    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id],
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissionsGroup: [] } }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('removing entity should recalculate visibility in the parent folder (groups permissions)', async () => {
    const g1 = await addUserToGroup('g1', req2())

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

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissionsGroup: [g1._id] } }, reqAdmin())
    await reporter.documentStore.collection('templates').remove({ }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('removing entity should recalculate and preserve visibility in the parent folder (groups permissions)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'foldera'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({ name: 'template' }, { $set: { readPermissionsGroup: [g1._id] } }, reqAdmin())
    await reporter.documentStore.collection('templates').update({ name: 'template2' }, { $set: { readPermissionsGroup: [g1._id] } }, reqAdmin())
    await reporter.documentStore.collection('templates').remove({ name: 'template' }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req1())
    count.should.be.eql(1)
  })

  it('adding entity should recalculate and preserve visibility in the parent folders (nested - groups permissions)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      editPermissionsGroup: [g1._id]
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

    let foldersCount = await reporter.documentStore.collection('folders').count({}, req1())
    foldersCount.should.be.eql(2)

    let templatesCount = await reporter.documentStore.collection('templates').count({}, req1())
    templatesCount.should.be.eql(1)

    let fa = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())
    fa.visibilityPermissions.should.have.length(2)
    fa.visibilityPermissions.should.containEql(req1().context.user._id)
    fa.visibilityPermissions.should.containEql(g1._id)

    let fb = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())
    fb.visibilityPermissions.should.have.length(2)
    fb.visibilityPermissions.should.containEql(req1().context.user._id)
    fb.visibilityPermissions.should.containEql(g1._id)

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    foldersCount = await reporter.documentStore.collection('folders').count({}, req1())
    foldersCount.should.be.eql(2)

    templatesCount = await reporter.documentStore.collection('templates').count({}, req1())
    templatesCount.should.be.eql(2)

    fa = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())
    fa.visibilityPermissions.should.have.length(2)
    fa.visibilityPermissions.should.containEql(req1().context.user._id)
    fa.visibilityPermissions.should.containEql(g1._id)

    fb = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())
    fb.visibilityPermissions.should.have.length(2)
    fb.visibilityPermissions.should.containEql(req1().context.user._id)
    fb.visibilityPermissions.should.containEql(g1._id)
  })

  it('removing entity should recalculate and preserve visibility in the parent folders (nested - groups permissions)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      editPermissionsGroup: [g1._id]
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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('templates').remove({ name: 'template2' }, reqAdmin())

    let foldersCount = await reporter.documentStore.collection('folders').count({}, req1())
    foldersCount.should.be.eql(2)

    let templatesCount = await reporter.documentStore.collection('templates').count({}, req1())
    templatesCount.should.be.eql(1)

    let fa = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())
    fa.visibilityPermissions.should.have.length(2)
    fa.visibilityPermissions.should.containEql(req1().context.user._id)
    fa.visibilityPermissions.should.containEql(g1._id)

    let fb = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())
    fb.visibilityPermissions.should.have.length(2)
    fb.visibilityPermissions.should.containEql(req1().context.user._id)
    fb.visibilityPermissions.should.containEql(g1._id)

    await reporter.documentStore.collection('templates').remove({ name: 'template' }, reqAdmin())

    foldersCount = await reporter.documentStore.collection('folders').count({}, req1())
    foldersCount.should.be.eql(2)

    templatesCount = await reporter.documentStore.collection('templates').count({}, req1())
    templatesCount.should.be.eql(0)

    fa = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())
    fa.visibilityPermissions.should.have.length(2)
    fa.visibilityPermissions.should.containEql(req1().context.user._id)
    fa.visibilityPermissions.should.containEql(g1._id)

    fb = await reporter.documentStore.collection('folders').findOne({ name: 'foldera' }, reqAdmin())
    fb.visibilityPermissions.should.have.length(2)
    fb.visibilityPermissions.should.containEql(req1().context.user._id)
    fb.visibilityPermissions.should.containEql(g1._id)
  })

  it('removing folder should recalculate visibility in the parent folder (groups permissions)', async () => {
    const g1 = await addUserToGroup('g1', req2())

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
      readPermissionsGroup: [g1._id],
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('folders').remove({ name: 'folderb' }, reqAdmin())

    const count = await reporter.documentStore.collection('folders').count({}, req2())
    count.should.be.eql(0)
  })

  it('adding users to group should propagate permissions to the entities with permission to that group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('usersGroups').update({
      name: 'g1'
    }, {
      $set: {
        users: [{ shortid: req1().context.user.shortid }, { shortid: req2().context.user.shortid }]
      }
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(2)

    const count2 = await countTemplates(req2())
    count2.should.be.eql(2)
  })

  it('removing users from group should propagate permissions to the entities with permission to that group', async () => {
    const g1 = await addUserToGroup('g1', req1())
    await addUserToGroup('g1', req2())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('usersGroups').update({
      name: 'g1'
    }, {
      $set: {
        users: [{ shortid: req1().context.user.shortid }]
      }
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(2)

    const count2 = await countTemplates(req2())
    count2.should.be.eql(0)
  })

  it('removing group should propagate permissions to the entities with permission to that group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id]
    }, reqAdmin())

    await reporter.documentStore.collection('usersGroups').remove({ name: 'g1' }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(0)

    const t = await reporter.documentStore.collection('templates').findOne({
      name: 'template'
    }, reqAdmin())

    t.readPermissionsGroup.should.have.length(0)

    const t2 = await reporter.documentStore.collection('templates').findOne({
      name: 'template'
    }, reqAdmin())

    t2.readPermissionsGroup.should.have.length(0)
  })

  it('removing group should propagate permissions to the entities with permission to that group (preserve other group permissions)', async () => {
    const g1 = await addUserToGroup('g1', req1())
    const g2 = await addUserToGroup('g2', req2())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id, g2._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      readPermissionsGroup: [g1._id, g2._id]
    }, reqAdmin())

    await reporter.documentStore.collection('usersGroups').remove({ name: 'g1' }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(0)

    const count2 = await countTemplates(req2())
    count2.should.be.eql(2)

    const t = await reporter.documentStore.collection('templates').findOne({
      name: 'template'
    }, reqAdmin())

    t.readPermissionsGroup.should.have.length(1)
    t.readPermissionsGroup.should.containEql(g2._id)

    const t2 = await reporter.documentStore.collection('templates').findOne({
      name: 'template'
    }, reqAdmin())

    t2.readPermissionsGroup.should.have.length(1)
    t2.readPermissionsGroup.should.containEql(g2._id)
  })

  it('adding users to group should propagate permissions to the entities with permission to that group (folders affected)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      readPermissionsGroup: [g1._id]
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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('usersGroups').update({
      name: 'g1'
    }, {
      $set: {
        users: [{ shortid: req1().context.user.shortid }, { shortid: req2().context.user.shortid }]
      }
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(2)

    const count2 = await countTemplates(req2())
    count2.should.be.eql(2)
  })

  it('removing users from group should propagate permissions to the entities with permission to that group (folders affected)', async () => {
    const g1 = await addUserToGroup('g1', req1())
    await addUserToGroup('g1', req2())

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
      readPermissionsGroup: [g1._id]
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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('usersGroups').update({
      name: 'g1'
    }, {
      $set: {
        users: [{ shortid: req1().context.user.shortid }]
      }
    }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(2)

    const count2 = await countTemplates(req2())
    count2.should.be.eql(0)
  })

  it('removing group should propagate permissions to the entities with permission to that group (folders affected)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      readPermissionsGroup: [g1._id]
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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('usersGroups').remove({ name: 'g1' }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(0)

    const f = await reporter.documentStore.collection('folders').findOne({
      name: 'folderb'
    }, reqAdmin())

    f.readPermissionsGroup.should.have.length(0)
  })

  it('removing group should propagate permissions to the entities with permission to that group (folders affected - preserve other group permissions)', async () => {
    const g1 = await addUserToGroup('g1', req1())
    const g2 = await addUserToGroup('g2', req2())

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
      readPermissionsGroup: [g1._id, g2._id]
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

    await reporter.documentStore.collection('templates').insert({
      name: 'template2',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, reqAdmin())

    await reporter.documentStore.collection('usersGroups').remove({ name: 'g1' }, reqAdmin())

    const count = await countTemplates(req1())
    count.should.be.eql(0)

    const count2 = await countTemplates(req2())
    count2.should.be.eql(2)

    const f = await reporter.documentStore.collection('folders').findOne({
      name: 'folderb'
    }, reqAdmin())

    f.readPermissionsGroup.should.have.length(1)
  })

  it('adding entity group permissions should propagate group', async () => {
    const g1 = await addUserToGroup('g1', req1())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      editPermissionsGroup: [g1._id]
    }, reqAdmin())

    const count = await reporter.documentStore.collection('templates').count({}, req1())
    count.should.be.eql(1)

    const t = await reporter.documentStore.collection('templates').findOne({ name: 'template' }, reqAdmin())

    t.editPermissionsGroup.should.have.length(1)
    t.editPermissionsGroup[0].should.be.eql(g1._id)
    t.inheritedEditPermissions.should.have.length(2)
    t.inheritedEditPermissions[0].should.be.eql(g1._id)
    t.inheritedEditPermissions[1].should.be.eql(req1().context.user._id)
  })

  it('removing entity group permissions should propagate group', async () => {
    const g1 = await addUserToGroup('g1', req1())
    const g2 = await addUserToGroup('g2', req2())

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      editPermissionsGroup: [g1._id, g2._id]
    }, reqAdmin())

    await reporter.documentStore.collection('templates').update({
      name: 'template'
    }, {
      $set: {
        editPermissionsGroup: [g1._id]
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('templates').count({}, req1())
    count.should.be.eql(1)

    const count2 = await reporter.documentStore.collection('templates').count({}, req2())
    count2.should.be.eql(0)

    const t = await reporter.documentStore.collection('templates').findOne({ name: 'template' }, reqAdmin())

    t.editPermissionsGroup.should.have.length(1)
    t.editPermissionsGroup[0].should.be.eql(g1._id)
    t.inheritedEditPermissions.should.have.length(2)
    t.inheritedEditPermissions[0].should.be.eql(g1._id)
    t.inheritedEditPermissions[1].should.be.eql(req1().context.user._id)
  })

  it('adding entity group read permissions should propagate group (nested folders)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      readPermissionsGroup: [g1._id]
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

    const count = await reporter.documentStore.collection('templates').count({}, req1())
    count.should.be.eql(1)

    const countFolders = await reporter.documentStore.collection('folders').count({}, req1())
    countFolders.should.be.eql(2)

    const f = await reporter.documentStore.collection('folders').findOne({ name: 'folderb' }, reqAdmin())

    f.editPermissionsGroup = f.editPermissionsGroup || []
    f.editPermissionsGroup.should.have.length(0)
    f.readPermissionsGroup.should.have.length(1)
    f.readPermissionsGroup[0].should.be.eql(g1._id)

    const t = await reporter.documentStore.collection('templates').findOne({ name: 'template' }, reqAdmin())

    t.inheritedEditPermissions = t.inheritedEditPermissions || []
    t.inheritedEditPermissions.should.have.length(0)
    t.inheritedReadPermissions.should.have.length(2)
    t.inheritedReadPermissions[0].should.be.eql(g1._id)
    t.inheritedReadPermissions[1].should.be.eql(req1().context.user._id)
  })

  it('adding entity group edit permissions should propagate group (nested folders)', async () => {
    const g1 = await addUserToGroup('g1', req1())

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
      editPermissionsGroup: [g1._id]
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

    const count = await reporter.documentStore.collection('templates').count({}, req1())
    count.should.be.eql(1)

    const countFolders = await reporter.documentStore.collection('folders').count({}, req1())
    countFolders.should.be.eql(2)

    const f = await reporter.documentStore.collection('folders').findOne({ name: 'folderb' }, reqAdmin())

    f.readPermissionsGroup = f.readPermissionsGroup || []
    f.readPermissionsGroup.should.have.length(0)
    f.editPermissionsGroup.should.have.length(1)
    f.editPermissionsGroup[0].should.be.eql(g1._id)

    const t = await reporter.documentStore.collection('templates').findOne({ name: 'template' }, reqAdmin())

    t.inheritedReadPermissions = t.inheritedReadPermissions || []
    t.inheritedReadPermissions.should.have.length(0)
    t.inheritedEditPermissions.should.have.length(2)
    t.inheritedEditPermissions[0].should.be.eql(g1._id)
    t.inheritedEditPermissions[1].should.be.eql(req1().context.user._id)
  })

  it('removing entity group permissions should propagate group (nested folders)', async () => {
    const g1 = await addUserToGroup('g1', req1())
    const g2 = await addUserToGroup('g2', req2())

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
      editPermissionsGroup: [g1._id, g2._id]
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

    await reporter.documentStore.collection('folders').update({
      name: 'folderb'
    }, {
      $set: {
        editPermissionsGroup: [g1._id]
      }
    }, reqAdmin())

    const count = await reporter.documentStore.collection('templates').count({}, req1())
    count.should.be.eql(1)

    const countFolders = await reporter.documentStore.collection('folders').count({}, req1())
    countFolders.should.be.eql(2)

    const count2 = await reporter.documentStore.collection('templates').count({}, req2())
    count2.should.be.eql(0)

    const countFolders2 = await reporter.documentStore.collection('folders').count({}, req2())
    countFolders2.should.be.eql(0)

    const f = await reporter.documentStore.collection('folders').findOne({ name: 'folderb' }, reqAdmin())

    f.editPermissionsGroup.should.have.length(1)
    f.editPermissionsGroup[0].should.be.eql(g1._id)

    const t = await reporter.documentStore.collection('templates').findOne({ name: 'template' }, reqAdmin())

    t.inheritedEditPermissions.should.have.length(2)
    t.inheritedEditPermissions[0].should.be.eql(g1._id)
    t.inheritedEditPermissions[1].should.be.eql(req1().context.user._id)
  })

  it('adding should work ok with user that is group', async () => {
    const g = await reporter.documentStore.collection('usersGroups').insert({ name: 'g', users: [] }, reqAdmin())
    const req = reqGroup(g)

    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, req)

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      folder: {
        shortid: 'foldera'
      }
    }, req)

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, req)

    const t = await reporter.documentStore.collection('templates').findOne({ name: 'template' }, req)

    t.readPermissions = t.readPermissions || []
    t.editPermissions = t.editPermissions || []

    t.readPermissions.should.have.length(0)
    t.editPermissions.should.have.length(0)
    t.readPermissionsGroup.should.have.length(1)
    t.editPermissionsGroup.should.have.length(1)
    t.readPermissionsGroup[0].should.be.eql(g._id)
    t.editPermissionsGroup[0].should.be.eql(g._id)
  })

  it('updating should work ok with user that is group', async () => {
    const g = await reporter.documentStore.collection('usersGroups').insert({ name: 'g', users: [] }, reqAdmin())
    const req = reqGroup(g)

    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, req)

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      folder: {
        shortid: 'foldera'
      }
    }, req)

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, req)

    return reporter.documentStore.collection('templates').update({
      name: 'template'
    }, {
      $set: {
        content: 'foo2'
      }
    }, req).should.not.be.rejected()
  })

  it('removing should work ok with user that is group', async () => {
    const g = await reporter.documentStore.collection('usersGroups').insert({ name: 'g', users: [] }, reqAdmin())
    const req = reqGroup(g)

    await reporter.documentStore.collection('folders').insert({
      name: 'foldera',
      shortid: 'foldera'
    }, req)

    await reporter.documentStore.collection('folders').insert({
      name: 'folderb',
      shortid: 'folderb',
      folder: {
        shortid: 'foldera'
      }
    }, req)

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: {
        shortid: 'folderb'
      }
    }, req)

    return reporter.documentStore.collection('templates').remove({
      name: 'template'
    }, req).should.not.be.rejected()
  })
})
