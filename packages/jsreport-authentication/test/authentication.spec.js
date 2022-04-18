process.env.debug = 'jsreport'
require('should')
const request = require('supertest')
const should = require('should')
const jsreport = require('@jsreport/jsreport-core')

const CUSTOM_USER = { username: 'jsreport', password: 'jsreport' }

describe('authentication', () => {
  let reporter

  beforeEach(async () => {
    reporter = jsreport({
      extensions: {
        authentication: {
          cookieSession: {
            secret: 'foo',
            cookie: { domain: 'local.net' }
          },
          admin: { username: 'admin', password: 'password' }
        }
      }
    })
    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-express')())
    reporter.use(require('@jsreport/jsreport-studio')())

    await reporter.init()

    await reporter.documentStore.collection('users').insert({ ...CUSTOM_USER })
  })

  afterEach(() => reporter.close())

  it('should alias username to name during insert', async () => {
    await reporter.documentStore.collection('users').insert({
      username: 'foo',
      password: 'password'
    })
    const user = await reporter.documentStore.collection('users').findOne({ username: 'foo' })
    user.name.should.be.eql('foo')
  })

  it('should alias username to name during update', async () => {
    await reporter.documentStore.collection('users').insert({
      username: 'foo',
      password: 'password'
    })
    await reporter.documentStore.collection('users').update({ username: 'foo' }, { $set: { username: 'change' } })

    const user = await reporter.documentStore.collection('users').findOne({ username: 'change' })
    user.name.should.be.eql('change')
  })

  it('should alias name during insert', async () => {
    await reporter.documentStore.collection('users').insert({
      name: 'foo',
      password: 'password'
    })
    const user = await reporter.documentStore.collection('users').findOne({ name: 'foo' })
    user.username.should.be.eql('foo')
  })

  it('should alias name during update', async () => {
    await reporter.documentStore.collection('users').insert({
      name: 'foo',
      password: 'password'
    })
    await reporter.documentStore.collection('users').update({ name: 'foo' }, { $set: { name: 'change' } })

    const user = await reporter.documentStore.collection('users').findOne({ name: 'change' })
    user.username.should.be.eql('change')
  })

  it('should respond with login without cookie', () => {
    return request(reporter.express.app)
      .get('/')
      .expect(/<h1>jsreport<\/h1>/)
  })

  it('should pass with auth cookie', async () => {
    const res = await request(reporter.express.app).post('/login')
      .type('form')
      .send({ username: 'admin', password: 'password' })

    return request(reporter.express.app).get('/api/version')
      .set('cookie', res.headers['set-cookie'])
      .expect(200)
  })

  it('should 401 when calling api without auth header', () => {
    return request(reporter.express.app).get('/api/version')
      .expect(401)
  })

  it('should 200 when calling api with auth header', () => {
    return request(reporter.express.app).get('/api/version')
      .set('Authorization', 'Basic ' + Buffer.from('admin:password').toString('base64'))
      .expect(200)
  })

  it('should 400 when returnUrl is absolute', () => {
    return request(reporter.express.app).post('/login?returnUrl=https://jsreport.net')
      .type('form')
      .send({ username: 'admin', password: 'password' })
      .expect(400)
  })

  it('should add the req.context.user', () => {
    return new Promise((resolve, reject) => {
      reporter.documentStore.collection('templates').beforeFindListeners.add('test', this, (q, proj, req) => {
        if (!req.context.user || !req.context.user.username) {
          return reject(new Error('req.context.user not set'))
        }
        resolve()
      })

      request(reporter.express.app).get('/odata/templates')
        .set('Authorization', 'Basic ' + Buffer.from('admin:password').toString('base64'))
        .expect(200).catch(reject)
    })
  })

  describe('login block', () => {
    const tryLogin = (user) => {
      let cookie

      return async function (useCorrectCredentials) {
        let req = request(reporter.express.app).post('/login')

        if (cookie) {
          req = req.set('cookie', cookie)
        }

        let res = (
          await req.type('form')
            .send({ username: user.username, password: useCorrectCredentials ? user.password : 'nonvalid' })
            .expect(302)
        )

        cookie = res.headers['set-cookie']

        res = await request(reporter.express.app).get('/login').set('cookie', cookie)

        cookie = res.headers['set-cookie']

        return res
      }
    }

    const tryApiLogin = (user) => {
      return async function (useCorrectCredentials) {
        const res = (
          await request(reporter.express.app)
            .get('/api/version')
            .set('Authorization', 'Basic ' + Buffer.from(`${user.username}:${useCorrectCredentials ? user.password : 'nonvalid'}`).toString('base64'))
        )

        return res
      }
    }

    function common (user) {
      it('should block login attempts after reaching limit', async () => {
        const login = tryLogin(user)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login()

          if (i >= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.text).containEql('password or user does not exist')
          }
        }
      })

      it('should block successful login after reaching limit', async () => {
        const login = tryLogin(user)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login(i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1)

          if (i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.text).containEql('password or user does not exist')
          }
        }
      })

      it('should block login attempts after reaching limit (http api)', async () => {
        const login = tryApiLogin(user)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login()

          if (i >= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.statusCode).be.eql(403)
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.statusCode).be.eql(401)
            should(res.text).containEql('password or user does not exist')
          }
        }
      })

      it('should block successful login after reaching limit (http api)', async () => {
        const login = tryApiLogin(user)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login(i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1)

          if (i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.statusCode).be.eql(403)
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.statusCode).be.eql(401)
            should(res.text).containEql('password or user does not exist')
          }
        }
      })
    }

    describe('admin user', () => {
      common({ username: 'admin', password: 'password' })
    })

    describe('custom user', () => {
      it('failed login should increase failed login count', async () => {
        const login = tryLogin(CUSTOM_USER)
        let res = await login()

        should(res.text).containEql('password or user does not exist')

        let currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)

        res = await login()

        should(res.text).containEql('password or user does not exist')

        currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(2)
      })

      it('successful login should not increase failed login count', async () => {
        const login = tryLogin(CUSTOM_USER)
        let res = await login()

        should(res.text).containEql('password or user does not exist')

        let currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)

        res = await login(true)

        // login page should be not found after successfully login
        should(res.statusCode).be.eql(404)

        currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)
      })

      it('failed login should increase failed login count', async () => {
        const login = tryLogin(CUSTOM_USER)
        let res = await login()

        should(res.text).containEql('password or user does not exist')

        let currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)

        res = await login()

        should(res.text).containEql('password or user does not exist')

        currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(2)
      })

      it('successful login should not increase failed login count (http api)', async () => {
        const login = tryApiLogin(CUSTOM_USER)
        let res = await login()

        should(res.statusCode).be.eql(401)
        should(res.text).containEql('password or user does not exist')

        let currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)

        res = await login(true)

        should(res.statusCode).be.eql(200)

        currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)
      })

      it('failed login should increase failed login count (http api)', async () => {
        const login = tryApiLogin(CUSTOM_USER)
        let res = await login()

        should(res.statusCode).be.eql(401)
        should(res.text).containEql('password or user does not exist')

        let currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)

        res = await login()

        should(res.statusCode).be.eql(401)
        should(res.text).containEql('password or user does not exist')

        currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(2)
      })

      common(CUSTOM_USER)

      it('should allow login after the block time has passed', async () => {
        const login = tryLogin(CUSTOM_USER)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login()

          if (i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.text).containEql('password or user does not exist')
          }
        }

        await reporter.documentStore.collection('users').update({
          username: CUSTOM_USER.username
        }, {
          $set: {
            // 10 mins ago
            failedLoginAttemptsStart: new Date(new Date().getTime() - (10 * 60 * 1000))
          }
        })

        const res = await login(true)

        // login page should be not found after successfull login
        should(res.statusCode).be.eql(404)
      })

      it('should reset stored failed attempts to 0 after block time has passed', async () => {
        const login = tryLogin(CUSTOM_USER)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login()

          if (i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.text).containEql('password or user does not exist')
          }
        }

        await reporter.documentStore.collection('users').update({
          username: CUSTOM_USER.username
        }, {
          $set: {
            // 10 mins ago
            failedLoginAttemptsStart: new Date(new Date().getTime() - (10 * 60 * 1000))
          }
        })

        const res = await login(true)

        // login page should be not found after successfully login
        should(res.statusCode).be.eql(404)

        const currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(0)
      })

      it('should reset stored failed attempts to 1 after block time has passed', async () => {
        const login = tryLogin(CUSTOM_USER)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login()

          if (i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.text).containEql('password or user does not exist')
          }
        }

        await reporter.documentStore.collection('users').update({
          username: CUSTOM_USER.username
        }, {
          $set: {
            // 10 mins ago
            failedLoginAttemptsStart: new Date(new Date().getTime() - (10 * 60 * 1000))
          }
        })

        const res = await login()

        should(res.text).containEql('password or user does not exist')

        const currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)
      })

      it('should allow login after the block time has passed (http api)', async () => {
        const login = tryApiLogin(CUSTOM_USER)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login()

          if (i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.statusCode).be.eql(403)
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.statusCode).be.eql(401)
            should(res.text).containEql('password or user does not exist')
          }
        }

        await reporter.documentStore.collection('users').update({
          username: CUSTOM_USER.username
        }, {
          $set: {
            // 10 mins ago
            failedLoginAttemptsStart: new Date(new Date().getTime() - (10 * 60 * 1000))
          }
        })

        const res = await login(true)

        should(res.statusCode).be.eql(200)
      })

      it('should reset stored failed attempts to 0 after block time has passed (http api)', async () => {
        const login = tryApiLogin(CUSTOM_USER)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login()

          if (i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.statusCode).be.eql(403)
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.statusCode).be.eql(401)
            should(res.text).containEql('password or user does not exist')
          }
        }

        await reporter.documentStore.collection('users').update({
          username: CUSTOM_USER.username
        }, {
          $set: {
            // 10 mins ago
            failedLoginAttemptsStart: new Date(new Date().getTime() - (10 * 60 * 1000))
          }
        })

        const res = await login(true)

        should(res.statusCode).be.eql(200)

        const currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(0)
      })

      it('should reset stored failed attempts to 1 after block time has passed', async () => {
        const login = tryApiLogin(CUSTOM_USER)

        for (let i = 1; i <= reporter.authentication.usersRepository.maxFailedLoginAttempts + 1; i++) {
          const res = await login()

          if (i === reporter.authentication.usersRepository.maxFailedLoginAttempts + 1) {
            should(res.statusCode).be.eql(403)
            should(res.text).containEql('Max attempts to login has been reached')
          } else {
            should(res.statusCode).be.eql(401)
            should(res.text).containEql('password or user does not exist')
          }
        }

        await reporter.documentStore.collection('users').update({
          username: CUSTOM_USER.username
        }, {
          $set: {
            // 10 mins ago
            failedLoginAttemptsStart: new Date(new Date().getTime() - (10 * 60 * 1000))
          }
        })

        const res = await login()

        should(res.statusCode).be.eql(401)
        should(res.text).containEql('password or user does not exist')

        const currentUser = await reporter.documentStore.collection('users').findOne({
          username: CUSTOM_USER.username
        })

        should(currentUser.failedLoginAttemptsCount).be.eql(1)
      })
    })
  })
})

describe('authentication with external authorization server', () => {
  let reporter

  beforeEach(async () => {
    reporter = jsreport({
      extensions: {
        authentication: {
          cookieSession: {
            secret: 'foo'
          },
          admin: { username: 'admin', password: 'password' },
          authorizationServer: {}
        }
      }
    })
    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-express')())
  })

  afterEach(() => reporter && reporter.close())

  it('should throw when not configuring minimum options', () => {
    return reporter.init().should.be.rejectedWith(Error)
  })
})
