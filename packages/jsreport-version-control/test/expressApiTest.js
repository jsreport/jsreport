const JsReport = require('@jsreport/jsreport-core')
const request = require('supertest')
require('should')

describe('version control http API', () => {
  const adminUser = { username: 'admin', password: 'test' }
  let jsreport

  afterEach(() => jsreport.close())

  describe('without authentication', () => {
    beforeEach(async () => {
      jsreport = JsReport()
      jsreport.use(require('@jsreport/jsreport-express')({ httpPort: 5002 }))
      jsreport.use(require('../')())
      await jsreport.init()
    })

    commonAPI()
  })

  describe('with authentication enabled', () => {
    const demoUser = { username: 'demo', password: 'demo' }

    beforeEach(async () => {
      jsreport = JsReport()
      jsreport.use(require('@jsreport/jsreport-express')({ httpPort: 5002 }))
      jsreport.use(require('@jsreport/jsreport-authentication')({
        cookieSession: {
          secret: 'secret'
        },
        admin: { ...adminUser },
        enabled: true
      }))
      jsreport.use(require('../')())

      await jsreport.init()

      await jsreport.documentStore.collection('users').insert({
        ...demoUser
      })
    })

    it('should fail when user is not admin', async () => {
      await request(jsreport.express.app)
        .get('/api/version-control/history')
        .auth(demoUser.username, demoUser.password)
        .expect(401)
    })

    commonAPI(true)
  })

  function commonAPI (authEnabled) {
    function getRequest (app, { method, url }) {
      if (authEnabled) {
        return request(app)[method](url).auth(adminUser.username, adminUser.password)
      }

      return request(app)[method](url)
    }

    it('GET /api/version-control/history', async () => {
      const req = jsreport.Request({})
      await jsreport.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })
      await jsreport.versionControl.commit('foo', undefined, req)

      const res = await getRequest(jsreport.express.app, {
        method: 'get',
        url: '/api/version-control/history'
      }).expect(200)

      res.body.should.have.length(1)
    })

    it('POST /api/version-control/commit', async () => {
      await jsreport.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })

      await getRequest(jsreport.express.app, {
        method: 'post',
        url: '/api/version-control/commit'
      }).send({ message: 'foo' })
        .type('form')
        .expect(200)

      const req = jsreport.Request({})
      const history = await jsreport.versionControl.history(req)
      history.should.have.length(1)
    })

    it('POST /api/version-control/revert', async () => {
      await jsreport.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })

      await getRequest(jsreport.express.app, {
        method: 'post',
        url: '/api/version-control/revert'
      }).expect(200)

      const templates = await jsreport.documentStore.collection('templates').find({})
      templates.should.have.length(0)
    })
  }
})
