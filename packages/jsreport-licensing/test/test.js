const JsReport = require('@jsreport/jsreport-core')
const http = require('http')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const should = require('should')
const licenseJsonFilePath = path.join(__dirname, '../', 'jsreport.license.json')

process.env.LICENSING_SERVER = 'http://localhost:6000'
process.env.LICENSING_USAGE_CHECK_INTERVAL = 100

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
      .use(require('../')())
  })

  afterEach(async () => {
    if (fs.existsSync(licenseJsonFilePath)) {
      fs.unlinkSync(licenseJsonFilePath)
    }

    if (fs.existsSync(path.join(__dirname, '../', 'license-key.txt'))) {
      fs.unlinkSync(path.join(__dirname, '../', 'license-key.txt'))
    }

    if (fs.existsSync(path.join(__dirname, '../', 'jsreport2.license.json'))) {
      fs.unlinkSync(path.join(__dirname, '../', 'jsreport2.license.json'))
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

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      await createServer((req, res) => {
        const body = []
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

  it('should create jsreport.license.json file with successfully check', async () => {
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

    jsreport.logger.info = (m) => {
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
    jsreport.logger.info = (m) => {
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

  it('should not mask free license key', async () => {
    const messages = []
    const key = 'free'
    jsreport.logger.info = (m) => {
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

  it('should update usageCheckFailureInfo when /license-usage returns status 1', async () => {
    jsreport.options.licenseKey = 'foo'
    await createServer((req, res) => {
      if (req.url === '/license-key') {
        return res.end(JSON.stringify({
          status: 0,
          message: 'ok',
          needsUsageCheck: true
        }))
      }

      if (req.url === '/license-usage') {
        res.end(JSON.stringify({
          status: 1,
          message: 'Parallel usage detected'
        }))
      }
    })
    await jsreport.init()
    await new Promise(resolve => setTimeout(resolve, 300))
    const licensingOptions = jsreport.extensionsManager.usedExtensions.find(e => e.name === 'licensing').options
    licensingOptions.usageCheckFailureInfo.message.should.be.ok()
    licensingOptions.usageCheckFailureInfo.status.should.be.eql(1)
  })

  it('should not update usageCheckFailureInfo when /license-usage returns status 0', async () => {
    jsreport.options.licenseKey = 'foo'
    await createServer((req, res) => {
      if (req.url === '/license-key') {
        res.end(JSON.stringify({
          status: 0,
          message: 'ok',
          needsUsageCheck: true
        }))
      }

      if (req.url === '/license-usage') {
        res.end(JSON.stringify({
          status: 0,
          message: 'Ok'
        }))
      }
    })
    await jsreport.init()
    await new Promise(resolve => setTimeout(resolve, 300))
    const licensingOptions = jsreport.extensionsManager.usedExtensions.find(e => e.name === 'licensing').options
    should(licensingOptions.usageCheckFailureInfo).not.be.ok()
  })

  it('should not call /license-usage when needsUsageCheck is false', async () => {
    jsreport.options.licenseKey = 'foo'
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      await createServer((req, res) => {
        if (req.url === '/license-key') {
          res.end(JSON.stringify({
            status: 0,
            message: 'ok'
          }))
        }

        if (req.url === '/license-usage') {
          reject(new Error('should not be used'))
        }
      })
      await jsreport.init()
      await new Promise(resolve => setTimeout(resolve, 300))
      resolve()
    })
  })

  it('should update usageCheckFailureInfo to null when second server is turned off', async () => {
    jsreport.options.licenseKey = 'foo'
    let attempt = 0

    await createServer((req, res) => {
      if (req.url === '/license-key') {
        res.end(JSON.stringify({
          status: 0,
          message: 'ok',
          needsUsageCheck: true
        }))
      }

      if (req.url === '/license-usage') {
        if (++attempt === 1) {
          res.end(JSON.stringify({
            status: 1,
            message: 'Wrong'
          }))
        } else {
          res.end(JSON.stringify({
            status: 0,
            message: 'Ok'
          }))
        }
      }
    })
    await jsreport.init()
    await new Promise(resolve => setTimeout(resolve, 500))

    const licensingOptions = jsreport.extensionsManager.usedExtensions.find(e => e.name === 'licensing').options
    should(licensingOptions.usageCheckFailureInfo).not.be.ok()
  })

  it('should not verify license usage when license.development', async () => {
    jsreport.options.licenseKey = 'foo'
    jsreport.options.license = { development: true }
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      await createServer((req, res) => {
        if (req.url === '/license-key') {
          return res.end(JSON.stringify({
            status: 0,
            message: 'ok',
            needsUsageCheck: true
          }))
        }

        if (req.url === '/license-usage') {
          reject(new Error('should not get here'))
        }
      })
      await jsreport.init()
      await new Promise(resolve => setTimeout(resolve, 300))
      resolve()
    })
  })

  it('should not use jsreport.license.json when license.useSavedLicenseInfo=false', async () => {
    jsreport.options.licenseKey = 'foo'

    let attempt = 0
    await createServer((req, res) => {
      attempt++
      return res.end(JSON.stringify({
        status: 0,
        message: 'ok'
      }))
    })

    await jsreport.init()
    await jsreport.close()
    jsreport = JsReport({ rootDirectory: path.join(__dirname, '../'), license: { useSavedLicenseInfo: false, licenseKey: 'foo' } })
      .use(require('../')())

    await jsreport.init()

    attempt.should.be.eql(2)
  })

  it('should use jsreport.license.json from license.licenseInfoPath', async () => {
    jsreport.options.licenseKey = 'foo'

    let attempt = 0
    await createServer((req, res) => {
      attempt++
      return res.end(JSON.stringify({
        status: 0,
        message: 'ok'
      }))
    })

    await jsreport.init()
    await jsreport.close()

    fs.renameSync(path.join(__dirname, '../', 'jsreport.license.json'), path.join(__dirname, '../', 'jsreport2.license.json'))

    jsreport = JsReport({
      rootDirectory: path.join(__dirname, '../'),
      license: {
        licenseInfoPath: path.join(__dirname, '../', 'jsreport2.license.json'),
        licenseKey: 'foo'
      }
    })
      .use(require('../')())

    await jsreport.init()

    attempt.should.be.eql(1)
  })
})
