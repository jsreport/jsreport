process.env.debug = 'jsreport'
const supertest = require('supertest')
const jsreport = require('@jsreport/jsreport-core')
require('should')

const authOptions = {
  cookieSession: {
    secret: 'dasd321as56d1sd5s61vdv32'
  },
  admin: {
    username: 'admin',
    password: 'password'
  }
}

describe('public-templates', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      extensions: {
        authentication: authOptions
      }
    })

    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-express')())
    reporter.use(require('@jsreport/jsreport-authentication')())
    reporter.use(require('@jsreport/jsreport-authorization')())

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('/public-templates?access_token=xxx should return 401 on wrong', async () => {
    return supertest(reporter.express.app)
      .get('/public-templates?access_token=foo')
      .expect(401)
  })

  it('/public-templates?access_token=xxx with valid token should render template', async () => {
    await reporter.documentStore.collection('templates').insert({
      name: 'foo',
      engine: 'none',
      recipe: 'html',
      content: 'foo',
      readSharingToken: 'xxx'
    })

    return supertest(reporter.express.app)
      .get('/public-templates?access_token=xxx')
      .expect(200)
      .expect('foo')
  })

  it('/api/templates/sharing/:shortid/access/:access should create sharing token on template', async () => {
    await reporter.documentStore.collection('templates').insert({
      name: 'foo',
      shortid: 'foo',
      engine: 'none',
      recipe: 'html',
      content: 'foo'
    })

    await supertest(reporter.express.app)
      .post('/api/templates/sharing/foo/access/read')
      .set('Authorization', 'Basic ' + Buffer.from('admin:password').toString('base64'))
      .expect(200)

    const templates = await reporter.documentStore.collection('templates').find({})
    templates[0].readSharingToken.should.be.ok()
  })
})
