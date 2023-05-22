const JsReport = require('@jsreport/jsreport-core')
const common = require('./common')
const should = require('should')

describe('version control', () => {
  let jsreport

  beforeEach(async () => {
    jsreport = JsReport({})
    jsreport.use(require('@jsreport/jsreport-data')())
    jsreport.use(require('@jsreport/jsreport-chrome-pdf')())
    jsreport.use(require('@jsreport/jsreport-assets')())
    jsreport.use(require('../')())
    await jsreport.init()

    // postpone the commit to avoid having two commits in same ms
    const old = jsreport.versionControl.commit.bind(jsreport.versionControl)
    jsreport.versionControl.commit = (...args) => new Promise((resolve) => setTimeout(resolve, 3)).then(() => old(...args))
  })

  afterEach(() => jsreport && jsreport.close())

  common(() => jsreport)

  it('commit should throw error when there are no changes to commit', async () => {
    const req = jsreport.Request({})
    return should(jsreport.versionControl.commit('commit 1', undefined, req)).be.rejectedWith(/there are no changes to commit/)
  })

  it('commit should store diffs for document properties separately', async () => {
    const req = jsreport.Request({})
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', content: '1', helpers: '1', engine: 'none', recipe: 'html' }, req)
    await jsreport.versionControl.commit('1', undefined, req)
    await jsreport.documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: '2', helpers: '2' } }, req)
    const commit = await jsreport.versionControl.commit('2', undefined, req)
    commit.changes.should.have.length(1)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(2)
  })

  it('commit changes should be persisted to the blob', async () => {
    const req = jsreport.Request({})
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', content: '1', helpers: '1', engine: 'none', recipe: 'html' }, req)
    const commit = await jsreport.versionControl.commit('my first commit', undefined, req)
    commit.blobName.should.containEql('versions/myfirstcommit')
  })

  it('commit should store diffs only for changed document props', async () => {
    const req = jsreport.Request({})
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', content: '1', helpers: '1', engine: 'none', recipe: 'html' }, req)
    await jsreport.versionControl.commit('1', undefined, req)
    await jsreport.documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: '2' } }, req)
    const commit = await jsreport.versionControl.commit('2', undefined, req)
    commit.changes.should.have.length(1)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
  })

  it('entity insert in second commit should be present in the commit changes', async () => {
    const req = jsreport.Request({})
    await jsreport.documentStore.collection('templates').insert({ name: '1', engine: 'none', recipe: 'html' }, req)
    await jsreport.versionControl.commit('commit 1', undefined, req)
    await jsreport.documentStore.collection('templates').insert({ name: '2', engine: 'none', recipe: 'html' }, req)
    const commit = await jsreport.versionControl.commit('commit 2', undefined, req)
    commit.changes.should.have.length(1)
    commit.changes[0].path.should.be.eql('/2')
  })

  it('commit should store diffs for nested document properties', async () => {
    const req = jsreport.Request({})
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html', chrome: { headerTemplate: 'header' } }, req)

    await jsreport.versionControl.commit('1', undefined, req)
    await jsreport.documentStore.collection('templates').update({ name: 'foo' }, { $set: { chrome: { headerTemplate: 'header2' } } }, req)
    const commit = await jsreport.versionControl.commit('2', undefined, req)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
    patch.documentProperties[0].path.should.be.eql('chrome.headerTemplate')
    should(patch.documentProperties[0].type).not.be.eql('bigfile')
  })

  it('commit should store raw base64 for big nested document properties', async () => {
    const longArray = []
    const longArray2 = []
    for (let i = 0; i < 600 * 1024; i++) {
      longArray.push(i)
      longArray2.push(i - 1)
    }

    const req = jsreport.Request({})

    await jsreport.documentStore.collection('assets').insert({ name: 'foo', content: Buffer.from(longArray) }, req)

    await jsreport.versionControl.commit('1', undefined, req)

    await jsreport.documentStore.collection('assets').update({ name: 'foo' }, { $set: { content: Buffer.from(longArray2) } }, req)
    const commit = await jsreport.versionControl.commit('2', undefined, req)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
    patch.documentProperties[0].path.should.be.eql('content')
    patch.documentProperties[0].type.should.be.eql('bigfile')
  })

  it('diff of removed entity should show null in patch', async () => {
    const longArray = []
    for (let i = 0; i < 600 * 1024; i++) {
      longArray.push(i)
    }

    const req = jsreport.Request({})

    await jsreport.documentStore.collection('assets').insert({ name: 'foo', content: Buffer.from(longArray) }, req)
    await jsreport.versionControl.commit('1', undefined, req)

    await jsreport.documentStore.collection('assets').remove({ name: 'foo' }, req)

    const changes = await jsreport.versionControl.localChanges(req)
    changes.should.have.length(2)
    changes[0].path.should.be.eql('/foo')
    changes[1].path.should.be.eql('/foo/content')
    should(changes[1].patch).be.null()
  })

  it('big document property insert array/commit, update null/commit, update array and revert should restore to null', async () => {
    const longArray = []
    for (let i = 0; i < 600 * 1024; i++) {
      longArray.push(i)
    }

    const req = jsreport.Request({})

    await jsreport.documentStore.collection('assets').insert({ name: 'foo', content: Buffer.from(longArray) }, req)
    await jsreport.versionControl.commit('1', undefined, req)

    await jsreport.documentStore.collection('assets').update({ name: 'foo' }, { $set: { content: null } }, req)
    await jsreport.versionControl.commit('2', undefined, req)

    await jsreport.documentStore.collection('assets').update({ name: 'foo' }, { $set: { content: Buffer.from([]) } }, req)

    await jsreport.versionControl.revert(req)

    const asset = await jsreport.documentStore.collection('assets').findOne({ name: 'foo' }, req)
    should(asset.content).be.null()
  })

  it('big document delete revert of not a binary file should restore it fine', async () => {
    const longArray = []
    for (let i = 0; i < 600 * 1024; i++) {
      longArray.push(i)
    }

    const data = {
      longArray
    }

    const bigContent = JSON.stringify(data)

    const req = jsreport.Request({})

    await jsreport.documentStore.collection('data').insert({ name: 'foo', dataJson: JSON.stringify({}) }, req)

    await jsreport.versionControl.commit('1', undefined, req)

    await jsreport.documentStore.collection('data').update({ name: 'foo' }, { $set: { dataJson: bigContent } }, req)

    await jsreport.versionControl.commit('2', undefined, req)

    await jsreport.documentStore.collection('data').remove({ name: 'foo' }, req)

    await jsreport.versionControl.revert(req)

    const dataEntity = await jsreport.documentStore.collection('data').findOne({ name: 'foo' }, req)
    should(dataEntity.dataJson).be.eql(bigContent)
  })
})

describe('version control with custom blobStorage', () => {
  let jsreport

  beforeEach(async () => {
    jsreport = JsReport({})
    jsreport.use(require('../')())
    await jsreport.init()
    jsreport.blobStorage.write = (blobName) => 'xxx-' + blobName
  })

  afterEach(() => jsreport && jsreport.close())

  it('commit changes should be persisted to the blob', async () => {
    const req = jsreport.Request({})
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', content: '1', helpers: '1', engine: 'none', recipe: 'html' }, req)
    const commit = await jsreport.versionControl.commit('my first commit', undefined, req)
    commit.blobName.startsWith('xxx-').should.be.true()
  })
})

describe('version control props migration', () => {
  let jsreport

  beforeEach(async () => {
    jsreport = JsReport()
    jsreport.use(require('@jsreport/jsreport-data')())
    jsreport.use(require('@jsreport/jsreport-chrome-pdf')())
    jsreport.use(require('@jsreport/jsreport-assets')())
    jsreport.use(require('../')())

    jsreport.use({
      name: 'version-control-props-migration',
      directory: __dirname,
      main: './versionControlPropsMigration.js',
      options: {}
    })

    await jsreport.init()
  })

  afterEach(() => jsreport && jsreport.close())

  it('should remove old props for version', async () => {
    const versions = await jsreport.documentStore.collection('versions').find({})

    versions.should.matchEach((v) => {
      should(v.changes).be.not.ok()
    })
  })

  it('should convert version to new props', async () => {
    const versions = await jsreport.documentStore.collection('versions').find({})

    versions.should.matchEach((v) => {
      should(v.blobName).be.ok()
    })
  })

  it('should create blob attached to version', async () => {
    const versions = await jsreport.documentStore.collection('versions').find({})
    const blobsFound = []

    for (const version of versions) {
      const blob = await jsreport.blobStorage.read(version.blobName)
      blobsFound.push(blob != null)
    }

    blobsFound.should.matchEach((v) => should(v).be.eql(true))
  })
})
