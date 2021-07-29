/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension used for authenticating user. When the extension is enabled user needs to specify
 * credentials before the jsreport will serve the request.
 *
 * Browser requests are authenticated using cookie.
 * API requests are authenticated using basic auth.
 */

const ejs = require('ejs')
const path = require('path')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const BasicStrategy = require('passport-http').BasicStrategy
const BearerStrategy = require('passport-http-bearer').Strategy
const sessions = require('client-sessions')
const url = require('url')
const bodyParser = require('body-parser')
const UsersRepository = require('./usersRepository')
const { shouldDelegateTokenAuth, hasBearerSchema, authenticateToken } = require('./externalAuthentication.js')
const viewsPath = path.join(__dirname, '../public/views')
const basicSchemaReg = /Basic/i
const bearerSchemaReg = /Bearer/i
// eslint-disable-next-line
const absoluteUrlReg = new RegExp('^(?:[a-z]+:)?//', 'i')

function addPassport (reporter, app, admin, definition) {
  if (app.isAuthenticated) {
    return
  }

  const authorizationServerAuth = shouldDelegateTokenAuth(definition)
  const supportsTokenAuth = (authorizationServerAuth !== false)

  if (supportsTokenAuth) {
    reporter.logger.info('Token based authentication against custom authorization server is enabled')
  }

  const cookieOpts = definition.options.cookieSession && definition.options.cookieSession.cookie ? definition.options.cookieSession.cookie : undefined

  app.use(sessions({
    cookieName: 'session',
    cookie: cookieOpts,
    secret: definition.options.cookieSession.secret,
    duration: 1000 * 60 * 60 * 24 * 365 * 10 // forever
  }))

  app.use(passport.initialize())
  app.use(passport.session())

  function authenticate (username, password, done) {
    function createAuthError (authInfo) {
      const err = new Error('Authentication error')
      err.authInfo = authInfo
      return err
    }

    reporter.authentication.usersRepository.authenticate(username, password).then(r => {
      if (r.valid) {
        return done(null, r.user)
      }
      done(createAuthError({ message: r.message, status: r.status }, false))
    }).catch(e => done(createAuthError({ message: e.message }), false))
  }

  passport.use(new LocalStrategy(authenticate))

  passport.use(new BasicStrategy(authenticate))

  if (supportsTokenAuth) {
    passport.use(new BearerStrategy(
      { passReqToCallback: true },
      authenticateToken({
        authorizationServerAuth,
        logger: reporter.logger,
        usersRepository: reporter.authentication.usersRepository,
        admin
      })
    ))
  }

  passport.serializeUser((user, done) => done(null, user.name))
  passport.deserializeUser((id, done) => {
    if (id === admin.name) {
      return done(null, admin)
    }

    reporter.authentication.usersRepository.find(id)
      .then((u) => done(null, u))
      .catch(done)
  })

  app.use((req, res, next) => {
    req.context.user = req.user
    next()
  })

  app.get('/login', (req, res, next) => {
    if (!req.context.user) {
      const viewModel = Object.assign({}, req.session.viewModel || {})
      req.session.viewModel = null
      return res.render(path.join(viewsPath, 'login.html'), {
        viewModel: viewModel,
        options: reporter.options
      })
    } else {
      next()
    }
  })

  app.post('/login', bodyParser.urlencoded({ extended: true, limit: '2mb' }), (req, res, next) => {
    if (req.query.returnUrl && absoluteUrlReg.test(req.query.returnUrl)) {
      return res.status(400).end('Unsecure returnUrl')
    }
    req.session.viewModel = req.session.viewModel || {}

    passport.authenticate('local', (err, user) => {
      if (err && !err.authInfo) {
        return next(err)
      }

      if (err || !user) {
        const info = (err ? err.authInfo : undefined) || {}
        req.session.viewModel.login = info.message
        return res.redirect(reporter.options.appPath + '?returnUrl=' + encodeURIComponent(req.query.returnUrl || '/'))
      }

      req.session.viewModel = {}

      req.logIn(user, (err) => {
        if (err) {
          return next(err)
        }

        req.context.user = req.user = user
        reporter.logger.info('Logging in user ' + user.name)

        return res.redirect(decodeURIComponent(req.query.returnUrl) || '/')
      })
    })(req, res, next)
  })

  app.post('/logout', (req, res) => {
    req.logout()
    res.redirect(reporter.options.appPath)
  })

  app.use((req, res, next) => {
    const apiAuthStrategies = ['basic']
    // api authentication strategies must be stateless "{ session: false }"
    const apiAuthStrategiesOpts = {
      session: false
    }

    if (req.isAuthenticated()) {
      req.context.user = req.user
      return next()
    }

    if (supportsTokenAuth) {
      apiAuthStrategies.push('bearer')
    }

    passport.authenticate(apiAuthStrategies, apiAuthStrategiesOpts, (err, user, info) => {
      let authSchema = 'Basic'

      if (err && !err.authInfo) {
        return next(err)
      }

      if (err || !user) {
        const authInfo = err ? err.authInfo : undefined

        if (!req.headers.authorization) {
          // if no authorization header was sent, defaults to ask for "Basic" auth
          authSchema = 'Basic'
        } else {
          if (
            basicSchemaReg.test(req.headers.authorization) ||
            (!basicSchemaReg.test(req.headers.authorization) && !bearerSchemaReg.test(req.headers.authorization))
          ) {
            // if authorization header is "Basic" or if it is a unknown schema, defaults to ask for "Basic" auth
            authSchema = 'Basic'
          } else if (supportsTokenAuth && hasBearerSchema(info)) {
            // when user auth fails, passport pass information about the Bearer strategy in `info`
            authSchema = 'Bearer'
            req.authSchema = authSchema
          }
        }

        if (req.url.indexOf('/api') > -1 || req.url.indexOf('/odata') > -1) {
          if (req.isPublic) {
            return next()
          }

          res.setHeader('WWW-Authenticate', authSchema + ' realm=\'realm\'')

          if (authInfo) {
            return res.status(authInfo.status ? authInfo.status : 401).end(authInfo.message)
          }

          return res.status(401).end()
        }

        return next()
      }

      // when using a custom callback in `passport.authenticate` we have the
      // responsibility of login the user, in the case of API auth we want to
      // be stateless so we disable saving the session of the user
      // (passing `apiAuthStrategiesOpts`)
      req.logIn(user, apiAuthStrategiesOpts, () => {
        req.context.user = user
        reporter.logger.debug('API logging in user ' + user.name)
        next()
      })
    })(req, res, next)
  })

  if (supportsTokenAuth) {
    app.post('/api/auth-server/token', (req, res) => {
      reporter.logger.debug('Request for token information (returned from auth server)')

      if (!req.authServerTokenValidationResponse) {
        return res.status(204).end()
      }

      res.status(200).json(req.authServerTokenValidationResponse)
    })
  }
}

function configureRoutes (reporter, app, admin, definition) {
  app.use((req, res, next) => {
    const publicRoute = reporter.authentication.publicRoutes.find((r) => req.url.startsWith(r))
    const pathname = new url.URL(req.url, `${req.protocol}://${req.hostname}`).pathname
    req.isPublic = publicRoute || pathname.endsWith('.js') || pathname.endsWith('.css')
    next()
  })

  addPassport(reporter, app, admin, definition)

  app.use((req, res, next) => {
    if (req.isAuthenticated() || req.isPublic) {
      return next()
    }

    const viewModel = Object.assign({}, req.session.viewModel || {})
    req.session.viewModel = null

    return res.render(path.join(viewsPath, 'login.html'), {
      viewModel: viewModel,
      options: reporter.options
    })
  })

  app.use((req, res, next) => {
    if (!reporter.authorization || req.isPublic) {
      return next()
    }

    reporter.authorization.authorizeRequest(req, res).then((result) => {
      if (result) {
        return next()
      }

      if (req.url.indexOf('/api') > -1 || req.url.indexOf('/odata') > -1) {
        res.setHeader('WWW-Authenticate', (req.authSchema || 'Basic') + ' realm=\'realm\'')
        return res.status(401).end()
      }

      return res.redirect('/login')
    }).catch(function (e) {
      next(e)
    })
  })

  app.post('/api/users/:shortid/password', (req, res, next) => {
    reporter.authentication.usersRepository.changePassword(req.user, req.params.shortid, req.body.oldPassword, req.body.newPassword).then(function (user) {
      res.send({ result: 'ok' })
    }).catch(function (e) {
      next(e)
    })
  })

  app.get('/api/current-user', function (req, res, next) {
    res.send({ username: req.user.name })
  })
}

function Authentication (reporter, admin) {
  this.publicRoutes = [
    '/?studio=embed', '/css', '/img', '/js', '/lib', '/html-templates',
    '/api/recipe', '/api/engine', '/api/settings', '/favicon.ico']

  this.usersRepository = UsersRepository(reporter, admin)
}

module.exports = function (reporter, definition) {
  if (!definition.options.admin) {
    definition.options.enabled = false
    return
  }

  if (
    definition.options.admin &&
    (
      !definition.options.cookieSession ||
      (definition.options.cookieSession && !definition.options.cookieSession.secret)
    )
  ) {
    throw new Error('A secret is needed for authentication cookie session, fill "extensions.authentication.cookieSession.secret" option in config')
  }

  definition.options.admin.name = definition.options.admin.username
  definition.options.admin.isAdmin = true

  reporter.authentication = new Authentication(reporter, definition.options.admin)

  reporter.on('export-public-route', (route) => reporter.authentication.publicRoutes.push(route))

  reporter.on('after-express-static-configure', (app) => {
    app.engine('html', ejs.renderFile)

    reporter.emit('before-authentication-express-routes', app)
    configureRoutes(reporter, app, definition.options.admin, definition)
    // avoid exposing secrets and admin password through /api/extensions
    definition.options = {}
    reporter.emit('after-authentication-express-routes', app)
  })
}
