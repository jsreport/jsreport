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
const { Issuer, Strategy: OpenIdStrategy, custom: openidCustom } = require('openid-client')
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
  const supportsAuthorizationServer = (authorizationServerAuth !== false)

  if (supportsAuthorizationServer) {
    reporter.logger.info('Authentication against custom authorization server is enabled')

    openidCustom.setHttpOptionsDefaults({
      timeout: authorizationServerAuth.timeout
    })
  }

  const cookieOpts = definition.options.cookieSession && definition.options.cookieSession.cookie ? definition.options.cookieSession.cookie : undefined

  app.use(sessions({
    cookieName: 'session',
    cookie: cookieOpts,
    secret: definition.options.cookieSession.secret,
    duration: 1000 * 60 * 60 * 24 * 365 * 10 // forever
  }))

  // https://github.com/jaredhanson/passport/issues/904
  // middleware that completes the session manager implementation
  // expected by passport to exists, it requires that session has some
  // extra methods (.regenerate, .save) defined
  app.use((req, res, next) => {
    const addSessionMethods = (session) => {
      session.regenerate = (cb) => {
        // call the method on client-sessions that regenerates the session
        req.session.reset()
        // apply the methods again because they got lost after .reset()
        addSessionMethods(req.session)
        cb()
      }

      // we don't need to do anything here, since client-sessions basically stores
      // session data on the client, the session is saved automatically when writing
      // headers to the http response and it is transferred as a cookie to the browser.
      session.save = (cb) => { cb() }
    }

    addSessionMethods(req.session)

    next()
  })

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

  if (supportsAuthorizationServer) {
    const authServerIssuer = new Issuer({
      issuer: authorizationServerAuth.issuer,
      authorization_endpoint: authorizationServerAuth.endpoints.authorization,
      token_endpoint: authorizationServerAuth.endpoints.token,
      jwks_uri: authorizationServerAuth.endpoints.jwks,
      userinfo_endpoint: authorizationServerAuth.endpoints.userinfo,
      introspection_endpoint: authorizationServerAuth.endpoints.introspection
    })

    let studioClientAuthType = 'client_secret_basic'

    if (authorizationServerAuth.studioClient.authType === 'post') {
      studioClientAuthType = 'client_secret_post'
    } else if (authorizationServerAuth.studioClient.authType === 'basic') {
      studioClientAuthType = 'client_secret_basic'
    }

    const studioClient = new authServerIssuer.Client({
      client_id: authorizationServerAuth.studioClient.clientId,
      client_secret: authorizationServerAuth.studioClient.clientSecret,
      token_endpoint_auth_method: studioClientAuthType,
      response_types: ['code']
    })

    let apiResourceClientAuthType = 'client_secret_basic'

    if (authorizationServerAuth.apiResource.authType === 'post') {
      apiResourceClientAuthType = 'client_secret_post'
    } else if (authorizationServerAuth.apiResource.authType === 'basic') {
      apiResourceClientAuthType = 'client_secret_basic'
    }

    const apiResourceClient = new authServerIssuer.Client({
      client_id: authorizationServerAuth.apiResource.clientId,
      client_secret: authorizationServerAuth.apiResource.clientSecret,
      token_endpoint_auth_method: apiResourceClientAuthType
    })

    passport.use(new BearerStrategy(
      { passReqToCallback: true },
      authenticateToken({
        authorizationServerAuth,
        client: apiResourceClient,
        documentStore: reporter.documentStore,
        logger: reporter.logger,
        usersRepository: reporter.authentication.usersRepository,
        admin
      })
    ))

    const scopesForAuthorize = [...authorizationServerAuth.authorizationRequest.scope]

    if (!scopesForAuthorize.includes('openid')) {
      scopesForAuthorize.push('openid')
    }

    passport.use('oidc', new OpenIdStrategy({
      client: studioClient,
      usePKCE: false,
      params: {
        scope: scopesForAuthorize.join(' ')
      }
    }, (tokenset, userinfo, done) => {
      let mode = 'user'

      if (authorizationServerAuth.groupField != null && userinfo[authorizationServerAuth.groupField] != null) {
        mode = 'group'
      }

      if (mode === 'group') {
        const groupName = userinfo[authorizationServerAuth.groupField]

        reporter.documentStore.collection('usersGroups').findOne({ name: groupName })
          .then((g) => {
            if (g == null) {
              throw new Error(`No jsreport user group "${groupName}" found linked to this authenticated session`)
            }

            let usernameForGroup = `:group/${g.name}`

            if (authorizationServerAuth.usernameField != null && userinfo[authorizationServerAuth.usernameField] != null) {
              usernameForGroup += `/${userinfo[authorizationServerAuth.usernameField]}`
            }

            done(null, { name: usernameForGroup })
          })
          .catch((err) => {
            done(new Error(`Error while verifying user (group). Authentication cancelled. Reason: ${err.message}`))
          })
      } else {
        if (authorizationServerAuth.usernameField == null) {
          return done(new Error('authorizationServer.usernameField is not configured'))
        }

        const username = userinfo[authorizationServerAuth.usernameField]

        if (username == null) {
          done(new Error(`Information returned by the authorization server does not contain "${authorizationServerAuth.usernameField}" field. Authentication cancelled`))
        } else {
          if (username === admin.name) {
            return done(null, { name: username })
          }

          reporter.authentication.usersRepository.find(username)
            .then((u) => {
              if (u == null) {
                throw new Error(`No jsreport user "${username}" found linked to this authenticated session`)
              }

              done(null, { name: username })
            })
            .catch((err) => {
              done(new Error(`Error while verifying user. Authentication cancelled. Reason: ${err.message}`))
            })
        }
      }
    }))
  }

  passport.serializeUser((user, done) => {
    done(null, user.name)
  })

  passport.deserializeUser((username, done) => {
    if (username === admin.name) {
      return done(null, admin)
    }

    const groupPrefix = ':group/'
    const isGroup = username.startsWith(groupPrefix)

    if (isGroup) {
      const input = username.slice(groupPrefix.length)
      const parts = input.split('/')
      const groupName = parts[0]

      let customName

      if (parts[1] != null) {
        customName = parts[1]
      }

      reporter.documentStore.collection('usersGroups').findOne({ name: groupName })
        .then((g) => {
          return done(null, {
            _id: g._id,
            name: customName != null ? customName : g.name,
            isGroup: true
          })
        })
        .catch(done)
    } else {
      reporter.authentication.usersRepository.find(username)
        .then((u) => done(null, u))
        .catch(done)
    }
  })

  app.use((req, res, next) => {
    req.context.user = req.user
    next()
  })

  if (reporter.studio) {
    app.get('/login', (req, res, next) => {
      if (!req.context.user) {
        const viewModel = Object.assign({}, req.session.viewModel || {})
        req.session.viewModel = null
        return res.render(path.join(viewsPath, 'login.html'), {
          viewModel: viewModel,
          authServer: supportsAuthorizationServer
            ? { name: authorizationServerAuth.name, autoConnect: req.query.authServerConnect != null }
            : null,
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
          reporter.logger.info(`Logging in user ${user.name}`)

          return res.redirect(decodeURIComponent(req.query.returnUrl) || reporter.options.appPath)
        })
      })(req, res, next)
    })

    app.post('/logout', (req, res, next) => {
      req.logout((err) => {
        if (err) {
          return next(err)
        }

        res.redirect(reporter.options.appPath)
      })
    })
  }

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

    if (supportsAuthorizationServer) {
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
          } else if (supportsAuthorizationServer && hasBearerSchema(info)) {
            // when user auth fails, passport pass information about the Bearer strategy in `info`
            authSchema = 'Bearer'
            req.authSchema = authSchema
          }
        }

        if (req.url.indexOf('/api') > -1 || req.url.indexOf('/odata') > -1) {
          if (req.isPublic) {
            return next()
          }

          const authorizationError = reporter.createError(authInfo?.message != null ? authInfo.message : 'Unauthorized', {
            statusCode: authInfo?.status != null ? authInfo.status : 401,
            code: 'UNAUTHORIZED',
            authorizationMessage: authInfo?.message
          })

          return next(authorizationError)
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

  if (supportsAuthorizationServer) {
    app.get('/auth-server/login', (req, res, next) => {
      if (req.query.returnUrl && absoluteUrlReg.test(req.query.returnUrl)) {
        return res.status(400).end('Unsecure returnUrl')
      }

      const baseLink = `${req.protocol}://${req.headers.host}`

      if (req.query.returnUrl != null && req.query.returnUrl !== '') {
        try {
          const returnUrlParsed = new URL(req.query.returnUrl, baseLink)

          if (returnUrlParsed.searchParams.has('authServerConnect')) {
            returnUrlParsed.searchParams.delete('authServerConnect')
          }

          req.session.authServerReturnUrl = `${returnUrlParsed.pathname}${returnUrlParsed.search}`
        } catch (urlParseError) {
          return next(new Error('Invalid returnUrl query'))
        }
      }

      const callbackLink = baseLink + new URL(req.originalUrl, baseLink).pathname.replace('/auth-server/login', '/auth-server/callback')

      passport.authenticate('oidc', {
        redirect_uri: callbackLink
      })(req, res, next)
    })

    app.get('/auth-server/callback', (req, res, next) => {
      let returnUrl

      if (req.session.authServerReturnUrl != null) {
        returnUrl = req.session.authServerReturnUrl
        delete req.session.authServerReturnUrl
      }

      const baseLink = `${req.protocol}://${req.headers.host}`
      const callbackLink = baseLink + new URL(req.originalUrl, baseLink).pathname.replace('/auth-server/login', '/auth-server/callback')

      passport.authenticate('oidc', {
        redirect_uri: callbackLink
      }, (err, user, challenge) => {
        if (err || !user) {
          let errFound

          if (err == null) {
            let challengeErr

            if (challenge != null && challenge.message != null) {
              challengeErr = new Error(`${challenge.message}${challenge.jwt != null ? ` (jwt: "${challenge.jwt}")` : ''}`)

              if (challenge.stack != null) {
                challengeErr.stack = challenge.stack
              }
            }

            errFound = challengeErr || new Error('Unknown reason')
          } else {
            errFound = err
          }

          return next(reporter.createError('Authentication with authorization server failed', {
            original: errFound
          }))
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr)
          }

          req.context.user = req.user = user
          return res.redirect(returnUrl || reporter.options.appPath)
        })
      })(req, res, next)
    })

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
  const authorizationServerAuth = shouldDelegateTokenAuth(definition)
  const supportsAuthorizationServer = (authorizationServerAuth !== false)

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
    if (!reporter.studio) {
      return next(reporter.createError('Unauthorized', {
        code: 'UNAUTHORIZED'
      }))
    }

    const viewModel = Object.assign({}, req.session.viewModel || {})
    req.session.viewModel = null

    return res.render(path.join(viewsPath, 'login.html'), {
      viewModel: viewModel,
      authServer: supportsAuthorizationServer
        ? { name: authorizationServerAuth.name, autoConnect: req.query.authServerConnect != null }
        : null,
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

      if (!reporter.studio || (req.url.indexOf('/api') > -1 || req.url.indexOf('/odata') > -1)) {
        return next(reporter.authorization.createAuthorizationError('Unauthorized'))
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

  this.isUserAdmin = async function isUserAdmin (userInfo, req) {
    if (userInfo == null) {
      return false
    }

    // render from scheduling does not pass .name
    if (userInfo.isSuperAdmin) {
      return true
    }

    const validPropsForSearch = userInfo.isGroup ? ['_id'] : ['_id', 'shortid', 'name']
    let currentProp

    for (const targetProp of validPropsForSearch) {
      if (userInfo[targetProp] == null || userInfo[targetProp] === '') {
        continue
      }

      currentProp = targetProp
      break
    }

    if (currentProp == null) {
      const propsLabel = validPropsForSearch.map((p) => '.' + p).join(', ')
      throw new Error(`reporter.authentication.isUserAdmin needs to have one of these ${propsLabel} properties on the user info param`)
    }

    const getCacheKey = (p) => `${p}:${userInfo[p]}`

    const cacheKeyForCurrentProp = getCacheKey(currentProp)

    if (req?.context?.isAdminCache && Object.hasOwn(req.context.isAdminCache, cacheKeyForCurrentProp)) {
      return req.context.isAdminCache[cacheKeyForCurrentProp]
    }

    const { isAdmin, entityInStore } = await resolveIsAdmin(userInfo, currentProp)

    if (entityInStore == null) {
      return isAdmin
    }

    if (req?.context) {
      req.context.isAdminCache = req.context.isAdminCache || Object.create(null)

      for (const targetProp of validPropsForSearch) {
        if (entityInStore[targetProp] == null || entityInStore[targetProp] === '') {
          continue
        }

        const cacheKey = getCacheKey(targetProp)
        req.context.isAdminCache[cacheKey] = isAdmin
      }
    }

    return isAdmin
  }

  async function resolveIsAdmin (userInfo, currentProp) {
    const query = { [currentProp]: userInfo[currentProp] }
    const result = {}

    if (userInfo.isGroup) {
      result.isGroup = true

      const groupInStore = await reporter.documentStore.collection('usersGroups').findOne(query)

      result.entityInStore = groupInStore

      if (groupInStore == null) {
        result.isAdmin = false
      } else {
        result.isAdmin = groupInStore.isAdmin === true
      }
    } else {
      const userInStore = await reporter.documentStore.collection('users').findOne(query)

      result.entityInStore = userInStore

      if (userInStore == null) {
        result.isAdmin = false
      } else if (userInStore.isAdmin) {
        result.isAdmin = true
      } else {
        const groupCol = reporter.documentStore.collection('usersGroups')

        if (groupCol == null) {
          result.isAdmin = false
        } else {
          const adminGroupsForUser = await groupCol.find({
            isAdmin: true,
            users: {
              shortid: userInStore.shortid
            }
          }, { name: 1 })

          result.isAdmin = adminGroupsForUser.length > 0
        }
      }
    }

    return result
  }
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
  definition.options.admin.isSuperAdmin = true

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
