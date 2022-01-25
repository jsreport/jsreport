const path = require('path')
const Persistence = require('../lib/persistence')
const DocumentModel = require('../lib/documentModel')
const { serialize } = require('../lib/customUtils')
const sinon = require('sinon')

const model = {
  namespace: 'jsreport',
  entitySets: {
    templates: {
      entityType: 'jsreport.TemplateType',
      splitIntoDirectories: true
    },
    reports: {
      entityType: 'jsreport.ReportType',
      splitIntoDirectories: false
    },
    folders: {
      entityType: 'jsreport.FolderType',
      splitIntoDirectories: false
    }
  },
  entityTypes: {
    TemplateType: {
      _id: { type: 'Edm.String', key: true },
      name: { type: 'Edm.String' },
      shortid: { type: 'Edm.String' },
      folder: { type: 'jsreport.FolderRefType' }
    },
    ReportType: {
      _id: { type: 'Edm.String', key: true },
      name: { type: 'Edm.String' }
    },
    FolderType: {
      _id: { type: 'Edm.String', key: true },
      name: { type: 'Edm.String' },
      shortid: { type: 'Edm.String' }
    }
  },
  complexTypes: {
    FolderRefType: {
      shortid: { type: 'Edm.String' }
    }
  }
}

describe('persistence', () => {
  let persistence
  let fs

  beforeEach(() => {
    fs = {
      init: sinon.mock(),
      load: sinon.mock(),
      stat: sinon.mock(),
      insert: sinon.mock(),
      exists: sinon.mock(),
      update: sinon.mock(),
      remove: sinon.mock(),
      readdir: sinon.mock(),
      mkdir: sinon.mock(),
      rename: sinon.mock(),
      readFile: sinon.mock(),
      appendFile: sinon.mock(),
      writeFile: sinon.mock(),
      lock: sinon.mock(),
      releaseLock: sinon.mock(),
      path: path
    }
    persistence = Persistence({ documentsModel: DocumentModel(model), fs: fs })
  })

  afterEach(async () => {
  })

  it('should call fs.init on load', async () => {
    fs.readdir.twice()
    fs.readdir.returns([])
    await persistence.load()
  })

  it('should call fs.remove on remove', async () => {
    await persistence.remove({ $entitySet: 'templates', name: 'foo' })
    sinon.assert.calledWith(fs.remove, 'foo')
  })

  it('should use crash safe approach to update doc', async () => {
    fs.rename.twice()
    fs.exists.twice()
    fs.readdir.returns([])
    await persistence.update({ $entitySet: 'templates', name: 'foo', shortid: 'a' }, { $entitySet: 'templates', name: 'foo', shortid: 'b' }, {}, true)
    sinon.assert.calledWith(fs.mkdir, '~~foo~foo')
    sinon.assert.calledWith(fs.writeFile, path.join('~~foo~foo', 'config.json'), JSON.stringify({ $entitySet: 'templates', name: 'foo', shortid: 'a' }, null, 4))
    sinon.assert.calledWith(fs.rename, path.join('~foo~foo'), path.join('foo'))
    sinon.assert.calledWith(fs.rename, path.join('~~foo~foo'), path.join('~foo~foo'))
  })

  it('compact should crash safe approach', async () => {
    fs.readdir.returns(['reports'])
    fs.stat.returns({
      isDirectory: () => false,
      isFile: () => true
    })
    fs.readFile.returns(JSON.stringify({ _id: 'aaa', name: 'a' }) + '\n' + JSON.stringify({ _id: 'aaa', name: 'a' }))
    await persistence.compact({ reports: {} })
    sinon.assert.calledWith(fs.writeFile, '~reports', serialize({ _id: 'aaa', name: 'a', $entitySet: 'reports' }, false) + '\n')
    sinon.assert.calledWith(fs.rename, '~reports', 'reports')
  })

  it('should remove inconsistent folders on load', async () => {
    fs.stat.twice()
    fs.readdir.twice()
    fs.readdir.returns(['~~foo~foo'])
    fs.stat.returns({
      isDirectory: () => true,
      isFile: () => false
    })
    await persistence.load()
    sinon.assert.calledWith(fs.remove, '~~foo~foo')
  })
})
