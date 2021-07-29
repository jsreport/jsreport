/* globals describe, it, beforeEach, afterEach */

const should = require('should')
const Jsreport = require('jsreport-core')
const jsreportJsrender = require('jsreport-jsrender')
const jsreportAuthentication = require('jsreport-authentication')
const jsreportExpress = require('jsreport-express')
const client = require('../lib/client.js')

describe('testing client', () => {
  const url = 'http://localhost:3000'
  let jsreport

  beforeEach(async () => {
    jsreport = Jsreport({ httpPort: 3000 })
    jsreport.use(jsreportJsrender())
    jsreport.use(jsreportExpress())
    await jsreport.init()
  })

  afterEach(async () => {
    await jsreport.close()
  })

  it('should be able to render html', async () => {
    const res = await client(url).render({
      template: { content: 'hello', recipe: 'html', engine: 'none' }
    })

    should.exist(res)

    const body = await res.body()
    body.toString().should.be.equal('hello')
  })

  it('should properly handle errors', async () => {
    return client(url).render({
      template: { content: 'hello{{for}}', recipe: 'html', engine: 'jsrender' }
    }).should.be.rejectedWith(/{{for}}/)
  })

  it('should work also with / at the end of url', async () => {
    const res = await client(url + '/').render({
      template: { content: 'hello', recipe: 'html', engine: 'jsrender' }
    })

    should.exist(res)

    const body = await res.body()

    body.toString().should.be.equal('hello')
  })

  it('should be able to do a complex render with data', async () => {
    const res = await client(url + '/').render({
      template: { content: '{{:a}}', recipe: 'html', engine: 'jsrender' },
      data: { a: 'hello' }
    })

    should.exist(res)

    const body = await res.body()

    body.toString().should.be.equal('hello')
  })

  it('should be able to set timeout', async () => {
    return client(url).render({
      template: {
        content: 'hello {{:~foo()}}',
        recipe: 'html',
        engine: 'jsrender',
        helpers: 'function foo() { while (true) { } }'
      }
    }, { timeout: 100 }).should.be.rejected()
  })

  it('should have infinite body size limit', async () => {
    const data = { foo: 'foo', people: [] }

    for (var i = 0; i < 2000000; i++) {
      data.people.push(i)
    }

    await client(url).render({
      template: {
        content: 'hello',
        recipe: 'html',
        engine: 'jsrender'
      },
      data
    })
  }).timeout(10000)
})

describe('testing client with authentication', () => {
  var url = 'http://localhost:3000'
  var jsreport

  beforeEach(async () => {
    jsreport = Jsreport({ httpPort: 3000 })
    jsreport.use(jsreportExpress())
    jsreport.use(jsreportAuthentication({
      'cookieSession': {
        'secret': 'dasd321as56d1sd5s61vdv32'
      },
      admin: {
        username: 'test',
        password: 'password'
      }
    }))
    await jsreport.init()
  })

  afterEach((done) => {
    jsreport.express.server.close(done)
  })

  it('should be able to render html', async () => {
    const res = await client(url, 'test', 'password').render({
      template: { content: 'hello', recipe: 'html', engine: 'none' }
    })

    should.exist(res)

    const body = await res.body()

    body.toString().should.be.equal('hello')
  })

  it('should response 401 without credentials', async () => {
    return client(url).render({
      template: { content: 'hello', recipe: 'html', engine: 'none' }
    }).should.be.rejectedWith(/401/)
  })
})

describe('testing client without connection', () => {
  it('should be able to render html', () => {
    return client('http://localhost:9849').render({
      template: { content: 'hello', recipe: 'html' }
    }).should.be.rejected()
  }).timeout(10000)
})
