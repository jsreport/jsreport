const supertest = require('supertest')
const JsReport = require('@jsreport/jsreport-core')
const axios = require('axios')
const { unzipFiles } = require('../lib/helpers')
const fs = require('fs')
const path = require('path')
require('should')

const jsreportPort = 7002

describe('express', () => {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport()
      .use(require('../')())
      .use(require('@jsreport/jsreport-jsrender')())
      .use(require('@jsreport/jsreport-scripts')())
      .use(JsReport.tests.listeners())
      .use(require('./testExtension')({
        publicProp: 'I am public',
        publicDeepProp: {
          foo: 'foo value',
          bar: 'bar value'
        },
        publicArray: [1, 2, 3],
        privateProp: 'I am private'
      }))

    return jsreport.init()
  })

  afterEach(async () => {
    await jsreport.close()
  })

  it('/api/settings should return 200', () => {
    return supertest(jsreport.express.app)
      .get('/api/settings')
      .expect(200)
  })

  it('/api/recipe should return 200', () => {
    return supertest(jsreport.express.app)
      .get('/api/recipe')
      .expect(200)
  })

  it('/api/extensions should return 200', () => {
    return supertest(jsreport.express.app)
      .get('/api/extensions')
      .expect(200)
  })

  it('/api/extensions should return extensions with only exposed options', () => {
    return supertest(jsreport.express.app)
      .get('/api/extensions')
      .expect(200)
      .expect((res) => {
        const testExtension = res.body.find((e) => e.name === 'test')
        const exists = testExtension != null

        exists.should.be.True()
        testExtension.options.publicProp.should.be.eql('I am public')
        testExtension.options.publicDeepProp.foo.should.be.eql('foo value')
        testExtension.options.publicDeepProp.should.not.have.property('bar')
        testExtension.options.publicArray.should.be.eql([1, 2, 3])
        testExtension.options.should.not.have.property('privateProp')
      })
  })

  it('/api/version should return a package.json version', () => {
    return supertest(jsreport.express.app)
      .get('/api/version')
      .expect(200, jsreport.version)
  })

  it('/api/report should render report', () => {
    return supertest(jsreport.express.app)
      .post('/api/report')
      .send({ template: { content: 'Hey', engine: 'none', recipe: 'html' } })
      .expect(200, 'Hey')
  })

  it('/api/report should parse data if string and  render report', () => {
    return supertest(jsreport.express.app)
      .post('/api/report')
      .send({ template: { content: '{{:a}}', engine: 'jsrender', recipe: 'html' }, data: { a: 'foo' } })
      .expect(200, 'foo')
  })

  it('/api/report should use options[Content-Disposition] if set', () => {
    return supertest(jsreport.express.app)
      .post('/api/report')
      .send({
        template: { content: '{{:a}}', engine: 'jsrender', recipe: 'html' },
        data: { a: 'foo' },
        options: { 'Content-Disposition': 'foo' }
      })
      .expect(200, 'foo')
      .expect('Content-Disposition', 'foo')
  })

  it('/api/report should not crash when template name has invalid characters', () => {
    return supertest(jsreport.express.app)
      .post('/api/report')
      .send({ template: { content: 'Hey', engine: 'none', recipe: 'html', name: 'čščěš' } })
      .expect(200, 'Hey')
  })

  it('/api/report should abort request when request gets closed', async () => {
    let renderError
    jsreport.renderErrorListeners.add('test', (req, res, err) => {
      renderError = err
    })
    const cancelTokenSource = axios.CancelToken.source()
    const resPromise = axios({
      url: 'http://localhost:5488/api/report',
      method: 'POST',
      json: true,
      data: {
        template: { content: '{{:~loop()}}', engine: 'jsrender', recipe: 'html', helpers: 'function loop() { while (true) { } }' }
      },
      cancelToken: cancelTokenSource.token
    })
    setTimeout(() => {
      cancelTokenSource.cancel()
    }, 100)

    await resPromise.should.be.rejected()
    await new Promise((resolve) => setTimeout(resolve, 100))
    renderError.message.should.containEql('cancelled')
  })

  it('/odata/$metadata should return 200', () => {
    return supertest(jsreport.express.app)
      .get('/odata/$metadata')
      .expect(200)
  })

  it('/odata/templates?$filter=name eq test should return entity', async () => {
    await jsreport.documentStore.collection('templates').insert({
      name: 'test',
      engine: 'none',
      recipe: 'html'
    })

    return supertest(jsreport.express.app)
      .get('/odata/templates?$filter=name eq test')
      .expect(200)
      .expect((res) => {
        res.body.value.should.have.length(1)
        res.body.value[0].name.should.be.eql('test')
      })
  })

  it('/odata endpoint should not return non visible properties of entity', async () => {
    await jsreport.documentStore.collection('demos').insert({
      name: 'test',
      secret: 'secret',
      nested: {
        password: 'secret'
      }
    })

    return supertest(jsreport.express.app)
      .get('/odata/demos')
      .expect(200)
      .expect((res) => {
        res.body.value.should.have.length(1)
        res.body.value[0].name.should.be.eql('test')
        res.body.value[0].should.not.have.property('secret')
        res.body.value[0].nested.should.not.have.property('password')
      })
  })

  it('/odata endpoint should not return non visible properties of entity and not fail when other $select set', async () => {
    await jsreport.documentStore.collection('demos').insert({
      name: 'test',
      secret: 'secret'
    })

    return supertest(jsreport.express.app)
      .get('/odata/demos?$select=name,secret')
      .expect(200)
      .expect((res) => {
        res.body.value.should.have.length(1)
        res.body.value[0].name.should.be.eql('test')
        res.body.value[0].should.not.have.property('secret')
      })
  })

  it('should make it possible to add response.meta.headers', () => {
    jsreport.tests.beforeRenderListeners.add('test', (req, res) => {
      res.meta.headers.Test = 'header'
    })

    return supertest(jsreport.express.app)
      .post('/api/report')
      .send({ template: { content: '{{:a}}', engine: 'jsrender', recipe: 'html' }, data: { a: 'foo' } })
      .expect(200, 'foo')
      .expect('Test', 'header')
  })

  it('should work with scripts', async () => {
    const res = await jsreport.render({
      template: {
        content: 'foo',
        engine: 'none',
        recipe: 'html',
        scripts: [{
          content: `
            function beforeRender(req, res) {
              req.template.content = 'hello'
            }
          `
        }]
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should include profileId in response header', async () => {
    const renderRes = await supertest(jsreport.express.app)
      .post('/api/report')
      .send({ template: { content: 'hello', engine: 'none', recipe: 'html' } })

    renderRes.headers['profile-id'].should.be.ok()
    renderRes.headers['profile-location'].should.be.ok()
  })

  it('should be able to download and unzip profile', async () => {
    const res = await jsreport.render({
      template: {
        content: 'hello',
        engine: 'none',
        recipe: 'html'
      }
    })
    const profileLocationRes = await axios({
      url: `http://localhost:5488/api/profile/${res.meta.profileId}`,
      responseType: 'arraybuffer',
      method: 'get'
    })

    const entries = await unzipFiles(profileLocationRes.data)
    entries['events.log'].should.be.ok()
    entries['profile.json'].should.be.ok()
    entries['metadata.json'].should.be.ok()
  })

  it('should be able to upload profile and get back events', async () => {
    const FormData = require('form-data')

    const form = new FormData()
    form.append('profile.jsrprofile', fs.createReadStream(path.join(__dirname, 'test.jsrprofile')))

    const eventsRes = await axios({
      url: 'http://localhost:5488/api/profile/events',
      responseType: 'arraybuffer',
      method: 'POST',
      data: form,
      headers: form.getHeaders()
    })

    const events = eventsRes.data.toString().split('\n').filter(l => l).map(l => JSON.parse(l))
    events.length.should.be.greaterThan(0)
  })

  it('should enable cors by default', async () => {
    await supertest(jsreport.express.app)
      .get('/api/version')
      .expect('Access-Control-Expose-Headers', '*')

    await supertest(jsreport.express.app)
      .options('/api/version')
      .expect('access-control-allow-methods', 'GET,POST,PUT,DELETE,PATCH,MERGE')
  })
})

describe('express with appPath and mountOnAppPath config', () => {
  let jsreport
  beforeEach(() => {
    jsreport = JsReport({ appPath: '/test', mountOnAppPath: true })
      .use(require('../')())
      .use(require('@jsreport/jsreport-jsrender')())

    return jsreport.init()
  })

  afterEach(async () => {
    await jsreport.close()
  })

  it('/test/api/settings should return 200', async () => {
    return supertest(jsreport.express.server)
      .get('/test/api/settings')
      .expect(200)
  })

  it('/api/settings should return 404', async () => {
    return supertest(jsreport.express.server)
      .get('/api/settings')
      .expect(404)
  })
})

describe('express with custom middleware', () => {
  let jsreport

  beforeEach(() => {
    jsreport = JsReport()
      .use(require('../')())
      .use(JsReport.tests.listeners())

    jsreport.on('before-express-configure', (app) => app.use((req, res, next) => {
      req.context = { foo: 'hello' }
      next()
    }))

    jsreport.on('express-configure', (app) => app.post('/test-error-middleware-propagation', (req, res, next) => {
      next(new Error('error propagation'))
    }))

    return jsreport.init()
  })

  afterEach(async () => {
    console.log('running close...')
    await jsreport.close()
  })

  it('should merge in req.context from previous middlewares', () => {
    jsreport.beforeRenderListeners.add('test', (req, res) => {
      req.template.content = req.context.foo
    })

    return supertest(jsreport.express.app)
      .post('/api/report')
      .send({ template: { content: 'x', engine: 'none', recipe: 'html' } })
      .expect(200, 'hello')
  })

  it('should receive errors from custom middlewares', () => {
    return supertest(jsreport.express.app)
      .post('/test-error-middleware-propagation')
      .send()
      .expect(500)
      .then(res => {
        res.text.should.startWith('Error: error propagation')
      })
  })
})

describe('express limit', () => {
  let jsreport

  afterEach(async () => {
    await jsreport.close()
  })

  it('should fail with custom message when limit is reached', async () => {
    jsreport = JsReport({ httpPort: jsreportPort }).use(require('../')({
      inputRequestLimit: '1kb'
    }))

    await jsreport.init()

    return supertest(jsreport.express.app)
      .post('/api/report')
      .send({
        template: {
          content: `
            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          `,
          engine: 'none',
          recipe: 'html'
        }
      })
      .expect((res) => {
        res.statusCode.should.be.eql(413)
        res.body.message.includes('The limit can be increased using config').should.be.true()
      })
  })
})

describe('express port', () => {
  let jsreport

  afterEach(async () => {
    if (process.env.PORT != null) {
      delete process.env.PORT
    }

    await jsreport.close()
  })

  it('should not start on port automatically when option start: false', async () => {
    jsreport = JsReport({ httpPort: jsreportPort })
      .use(require('../')({ start: false }))

    await jsreport.init()
    jsreport.express.server.listening.should.be.eql(false)
  })

  it('should start on httpPort ', async () => {
    jsreport = JsReport({ httpPort: jsreportPort })
      .use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(jsreportPort)
  })

  it('should start on httpsPort ', async () => {
    jsreport = JsReport({
      httpsPort: jsreportPort,
      certificate: {
        key: '../certificates/jsreport.net.key',
        cert: '../certificates/jsreport.net.cert'
      }
    }).use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(jsreportPort)
  })

  it('should start on httpsPort ', async () => {
    jsreport = JsReport({
      httpsPort: jsreportPort,
      certificate: {
        key: '../certificates/jsreport.net.key',
        cert: '../certificates/jsreport.net.cert'
      }
    }).use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(jsreportPort)
  })

  it('should create redirect server when both httpsPort and httpPort specified', async () => {
    const jsreportAlternativePort = jsreportPort + 1000

    jsreport = JsReport({
      httpsPort: jsreportPort,
      httpPort: jsreportAlternativePort,
      certificate: {
        key: '../certificates/jsreport.net.key',
        cert: '../certificates/jsreport.net.cert'
      }
    }).use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(jsreportPort)
    jsreport.express.redirectServer.address().port.should.be.eql(jsreportAlternativePort)
  })

  it('should listen PORT env when specified', async () => {
    process.env.PORT = jsreportPort
    jsreport = JsReport().use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(jsreportPort)
  })

  it('should prefer httpPort over PORT env', async () => {
    process.env.PORT = jsreportPort
    jsreport = JsReport({ httpPort: 8000 }).use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(8000)
  })

  it('should prefer httpsPort over PORT env', async () => {
    process.env.PORT = jsreportPort
    jsreport = JsReport({
      httpsPort: 8000,
      certificate: {
        key: '../certificates/jsreport.net.key',
        cert: '../certificates/jsreport.net.cert'
      }
    }).use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(8000)
  })

  it('should prefer httpsPort over PORT env', async () => {
    process.env.PORT = jsreportPort
    jsreport = JsReport({
      httpsPort: 8000,
      certificate: {
        key: '../certificates/jsreport.net.key',
        cert: '../certificates/jsreport.net.cert'
      }
    }).use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(8000)
  })

  it('should use 5488 port when no port specified', async () => {
    jsreport = JsReport().use(require('../')())

    await jsreport.init()
    jsreport.express.server.address().port.should.be.eql(5488)
  })
})

describe('express with disabled cors', () => {
  let jsreport
  beforeEach(() => {
    jsreport = JsReport({
      extensions: {
        express: {
          cors: {
            enabled: false
          }
        }
      }
    })
      .use(require('../')())

    return jsreport.init()
  })

  afterEach(async () => {
    await jsreport.close()
  })

  it('should return no access-control headers', async () => {
    const r = await supertest(jsreport.express.server)
      .get('/api/version')

    r.headers.should.not.have.property('access-control-allow-origin')
    r.headers.should.not.have.property('access-control-allow-methods')
  })
})
