const JsReport = require('jsreport-core')
const http = require('http')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
require('should')
let licenseJsonFilePath = path.join(__dirname, '../', 'jsreport.license.json')

describe('licensing', () => {
  let jsreport
  let licensingServer

  function insertTemplates (n) {
    jsreport.initializeListeners.insert(0, 'test', async () => {
      for (let i = 0; i < 6; i++) {
        await jsreport.documentStore.collection('templates').insert({
          name: i + '',
          content: 'foo',
          engine: 'none',
          recipe: 'html'
        })
      }
    })
  }

  function createServer (handler) {
    return new Promise((resolve) => {
      licensingServer = http.createServer(handler)
      licensingServer.listen(6000, resolve)
    })
  }

  beforeEach(() => {
    if (fs.existsSync(licenseJsonFilePath)) {
      fs.unlinkSync(licenseJsonFilePath)
    }

    if (fs.existsSync(path.join(__dirname, '../', 'license-key.txt'))) {
      fs.unlinkSync(path.join(__dirname, '../', 'license-key.txt'))
    }

    jsreport = JsReport({ rootDirectory: path.join(__dirname, '../') })
      .use(require('../')({
        licensingServerUrl: 'http://localhost:6000'
      }))
  })

  afterEach(async () => {
    if (fs.existsSync(licenseJsonFilePath)) {
      fs.unlinkSync(licenseJsonFilePath)
    }

    if (fs.existsSync(path.join(__dirname, '../', 'license-key.txt'))) {
      fs.unlinkSync(path.join(__dirname, '../', 'license-key.txt'))
    }

    if (jsreport) {
      await jsreport.close()
    }

    if (licensingServer) {
      return licensingServer.close()
    }
  })

  it('should boot when server offline', async () => {
    await insertTemplates(6)
    return jsreport.init()
  })

  it('should load license key from license-key.txt file', async () => {
    const key = uuidv4()
    fs.writeFileSync(path.join(__dirname, '../', 'license-key.txt'), key)
    await insertTemplates(6)

    return new Promise(async (resolve) => {
      await createServer((req, res) => {
        let body = []
        req.on('data', (chunk) => {
          body.push(chunk)
        }).on('end', () => {
          const message = JSON.parse(Buffer.concat(body).toString())
          message.licenseKey.should.be.eql(key)
          resolve()
        })
      })
      jsreport.init()
    })
  })

  it('should create jsreport.license.json file with successfull check', async () => {
    jsreport.options.licenseKey = uuidv4()
    await insertTemplates(6)
    await createServer((req, res) => {
      res.end(JSON.stringify({
        status: 0,
        message: 'ok'
      }))
    })
    await jsreport.init()
    const licenseFile = JSON.parse(fs.readFileSync(licenseJsonFilePath).toString())
    licenseFile.licenseKey.should.be.eql(jsreport.options.licenseKey)
    licenseFile.validatedForVersion.should.be.eql(jsreport.version)
    licenseFile.securityHash.should.be.ok()
  })

  it('should reject invalid license key', async () => {
    jsreport.options.licenseKey = 'wrong'
    await insertTemplates(6)
    await createServer((req, res) => {
      res.end(JSON.stringify({
        status: 1,
        message: 'wrong key'
      }))
    })
    return jsreport.init().should.be.rejected()
  })

  it('should not fail process when licensing server crashes on ECONNRESET', async () => {
    jsreport.options.licenseKey = 'some key'
    await insertTemplates(6)

    await createServer((req, res) => setTimeout(() => req.destroy(), 3500))
    await jsreport.init()

    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 4000)
    })
  })

  it('should not fail process when licensing server returns wrong status code', async () => {
    jsreport.options.licenseKey = 'some key'
    await insertTemplates(6)

    await createServer((req, res) => {
      res.status = 500
      res.end('wrong')
    })
    return jsreport.init()
  })

  it('should mask license key in the logs', async () => {
    const messages = []
    const key = uuidv4()
    jsreport.logger.log = (level, m) => {
      messages.push(m)
    }
    jsreport.options.licenseKey = key
    await createServer((req, res) => {
      res.end(
        JSON.stringify({
          status: 0,
          message: 'ok'
        })
      )
    })
    await insertTemplates(6)
    await jsreport.init()

    const message = messages.find((m) => m.includes('Verifying license key'))
    message.should.containEql('XXX')
    message.should.not.containEql(key)
  })

  it('should mask short license key in the logs', async () => {
    const messages = []
    const key = 'hello'
    jsreport.logger.log = (level, m) => {
      messages.push(m)
    }
    jsreport.options.licenseKey = key
    await createServer((req, res) => {
      res.end(
        JSON.stringify({
          status: 0,
          message: 'ok'
        })
      )
    })
    await insertTemplates(6)
    await jsreport.init()

    const message = messages.find((m) => m.includes('Verifying license key'))
    message.should.containEql('XXX')
    message.should.not.containEql(key)
  })

  it('should not mask free license ky', async () => {
    const messages = []
    const key = 'free'
    jsreport.logger.log = (level, m) => {
      messages.push(m)
    }
    jsreport.options.licenseKey = key
    await createServer((req, res) => {
      res.end(
        JSON.stringify({
          status: 0,
          message: 'ok'
        })
      )
    })
    await insertTemplates(6)
    await jsreport.init()

    const message = messages.find((m) => m.includes('Verifying license key'))
    message.should.not.containEql('XXX')
    message.should.containEql(key)
  })
})
