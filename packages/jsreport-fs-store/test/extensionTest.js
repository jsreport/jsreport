const util = require('util')
const path = require('path')
const should = require('should')
const JsReport = require('@jsreport/jsreport-core')
const IO = require('socket.io-client')
const fs = require('fs')
const rimrafAsync = util.promisify(require('rimraf'))

describe('extension use', () => {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport({ store: { provider: 'fs' } })
    jsreport.use(require('../')())
    return jsreport.init()
  })

  afterEach(() => jsreport.close())

  it('should be able apply fs store without store option just with jsreport.use', () => {
    jsreport.documentStore.provider.name.should.be.eql('fs')
  })
})

// there two stucks in travis-ci for some reason
describe.skip('extension discovery', () => {
  let jsreport

  beforeEach(async () => {
    jsreport = JsReport({
      discover: true,
      extensionsList: ['fs-store'],
      rootDirectory: path.join(__dirname, '../'),
      store: { provider: 'fs' }
    })

    await jsreport.init()
  })

  afterEach(async () => {
    if (jsreport) {
      await jsreport.close()
    }
  })

  it('should find and apply fs store', () => {
    jsreport.documentStore.provider.name.should.be.eql('fs')
  })
}).timeout(10000)

describe.skip('extension disabled through store', () => {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport({
      discover: true,
      extensionsList: ['fs-store'],
      store: { provider: 'memory' },
      rootDirectory: path.join(__dirname, '../')
    })
    return jsreport.init()
  })

  afterEach(() => jsreport.close())

  it('should find and apply fs store', () => {
    should(jsreport.documentStore.provider.name).not.be.eql('fs')
  })
}).timeout(10000)

describe('extension sockets', () => {
  const tmpData = path.join(__dirname, 'tmpData')
  let jsreport
  let io

  beforeEach(async () => {
    await rimrafAsync(tmpData)
    fs.mkdirSync(tmpData)
    io = IO('http://localhost:3000')
    jsreport = JsReport({ store: { provider: 'fs' } })
    jsreport.use(require('@jsreport/jsreport-express')({ httpPort: 3000 }))
    jsreport.use(require('../')({ externalModificationsSync: true, dataDirectory: tmpData }))
    return jsreport.init()
  })

  afterEach(async () => {
    await rimrafAsync(tmpData)
    io.close()
    return jsreport.close()
  })

  it('should not emit sockets when root file is edited', (done) => {
    let _done = false
    io.on('connect', () => fs.writeFileSync(path.join(tmpData, 'users'), 'hello'))
    io.on('external-modification', () => {
      _done = true
      done(new Error('shouldn\'t be called'))
    })
    setTimeout(() => {
      if (!_done) {
        done()
      }
    }, 300)
  })

  it('should emit sockets when nested files are edited', (done) => {
    io.on('connect', () => {
      fs.mkdirSync(path.join(tmpData, 'folderA'))
      fs.writeFileSync(path.join(tmpData, 'folderA', 'file.js'), 'hello')
    })
    io.on('external-modification', () => done())
  })
})
