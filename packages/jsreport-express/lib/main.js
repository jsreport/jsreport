/*!
 * Copyright(c) 2018 Jan Blaha
 */
const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const fs = require('fs')
const http = require('http')
const https = require('https')
const cors = require('cors')
const handleError = require('./handleError')
const express = require('express')
const routes = require('./routes.js')

const startAsync = function (reporter, server, port) {
  return new Promise((resolve, reject) => {
    server.on('error', (e) => {
      reporter.logger.error('Error when starting http server on port ' + port + ' ' + e.stack)
      reject(e)
    })

    server.listen(port, reporter.options.hostname, () => resolve())
  })
}

const prepareStartExpressApp = function (reporter, app, config) {
  const steps = []

  if (process.env.PORT && !config.httpPort && !config.httpsPort) {
    if (process.env.PORT === '443') {
      config.httpPort = null
      config.httpsPort = 443
    } else {
      config.httpPort = process.env.PORT
      config.httpsPort = null
    }
  }

  // use 5488 if no port specified
  if (config.httpPort == null && config.httpsPort == null) {
    config.httpPort = 5488
  }

  // just http port is specified, lets start server on http
  if (!config.httpsPort) {
    reporter.express.localhostUrl = `http://localhost:${config.httpPort}${reporter.options.appPath}`.replace(/\/$/, '')
    reporter.express.server = http.createServer(app)

    steps.push(() => {
      return startAsync(reporter, reporter.express.server, config.httpPort)
    })
  } else {
    // http and https port specified
    // fist start http => https redirector
    if (config.httpPort) {
      reporter.express.redirectServer = http.createServer((req, res) => {
        const host = req.headers.host || ''
        res.writeHead(302, {
          Location: 'https://' + host.split(':')[0] + ':' + config.httpsPort + req.url
        })

        res.end()
      })

      steps.push(() => {
        return new Promise((resolve, reject) => {
          reporter.express.redirectServer.listen(config.httpPort, reporter.options.hostname, () => resolve())
            .on('error', (e) => {
              e.message = `Error when starting http redirect server on port ${config.httpPort}. ${e.message}`
              reject(e)
            })
        })
      })
    }

    // second start https server

    // support cert and relative path to rootdir
    if (config.certificate.cert && fs.existsSync(path.join(reporter.options.rootDirectory, config.certificate.cert))) {
      config.certificate.cert = path.join(reporter.options.rootDirectory, config.certificate.cert)
    }

    // no certificate, use default one
    if (!config.certificate || (config.certificate.cert && !fs.existsSync(config.certificate.key))) {
      config.certificate.key = path.join(__dirname, '../', 'certificates', 'jsreport.net.key')
      config.certificate.cert = path.join(__dirname, '../', 'certificates', 'jsreport.net.cert')
    }

    let credentials = {}

    if (config.certificate.cert) {
      reporter.logger.debug('Reading ssl certificate from ' + config.certificate.cert)
      credentials = {
        key: fs.readFileSync(config.certificate.key, 'utf8'),
        cert: fs.readFileSync(config.certificate.cert, 'utf8'),
        rejectUnauthorized: false // support invalid certificates
      }
    }

    // support pfx certificates through relative or absolute path
    if (config.certificate.pfx) {
      if (fs.existsSync(path.join(reporter.options.rootDirectory, config.certificate.pfx))) {
        config.certificate.pfx = path.join(reporter.options.rootDirectory, config.certificate.pfx)
      }

      reporter.logger.debug('Reading ssl certificate from ' + config.certificate.pfx)

      credentials = {
        pfx: fs.readFileSync(config.certificate.pfx),
        passphrase: config.certificate.passphrase,
        rejectUnauthorized: false // support invalid certificates
      }
    }

    reporter.express.localhostUrl = `https://localhost:${config.httpsPort}${reporter.options.appPath}`.replace(/\/$/, '')
    reporter.express.server = https.createServer(credentials, app)

    steps.push(() => {
      return startAsync(reporter, reporter.express.server, config.httpsPort)
    })
  }

  return async () => {
    for (const fn of steps) {
      await fn()
    }
  }
}

const configureExpressApp = (app, reporter, definition, exposedOptions) => {
  reporter.express.app = app

  if (definition.options.trustProxy !== false) {
    app.enable('trust proxy')

    // middleware to allow mozilla/node-client-sessions trust in proxies
    app.use((req, res, next) => {
      req.connection.proxySecure = true
      next()
    })
  }

  if (definition.options.cors?.enabled !== false) {
    app.options('*', (req, res) => {
      require('cors')({
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'MERGE'],
        origin: true
      })(req, res)
    })
  }

  app.use(cookieParser())
  app.use(bodyParser.urlencoded({ extended: true, limit: definition.options.inputRequestLimit || '50mb' }))
  app.use(/\/((?!api\/report).)*/, bodyParser.json({
    limit: definition.options.inputRequestLimit || '50mb'
  }))
  app.use('/api/report', bodyParser.text({
    limit: definition.options.inputRequestLimit || '50mb',
    type: '*/*'
  }))

  if (definition.options.cors?.enabled !== false) {
    app.use(cors())
  }

  app.use((req, res, next) => {
    if (definition.options.cors?.enabled !== false) {
      res.setHeader('Access-Control-Expose-Headers', '*')
    }

    if (definition.options.responseHeaders) {
      res.set(definition.options.responseHeaders)
    }

    Object.defineProperty(req, '__isJsreportRequest__', {
      value: true,
      writable: false,
      configurable: false,
      enumerable: false
    })

    req.context = req.context || {}

    let baseUrl

    if (req.context.http && req.context.http.baseUrl != null) {
      baseUrl = req.context.http.baseUrl
    } else {
      baseUrl = req.protocol + '://' + req.get('host') + reporter.options.appPath
    }

    req.context.http = Object.assign({}, req.context.http, {
      baseUrl: baseUrl.replace(/\/$/, ''),
      headers: req.headers,
      query: req.query
    })

    if (!reporter._initialized) {
      reporter.waitForInit().then(() => {
        next()
      }, (err) => next(err))
    } else {
      next()
    }
  })

  reporter.emit('before-express-configure', app)

  routes(app, reporter, exposedOptions)

  reporter.emit('express-configure', app)

  const handleErrorMiddleware = handleError(reporter)

  app.use((err, req, res, next) => handleErrorMiddleware(req, res, err))

  if (reporter.options.appPath && reporter.options.mountOnAppPath) {
    const wrapperApp = express()

    // removing "/" from the prefix to avoid any possible error with express strict route matching
    const mountPath = reporter.options.appPath.substr(-1) === '/' ? reporter.options.appPath.slice(0, -1) : reporter.options.appPath

    reporter.logger.info(`Mounting routes under appPath (${mountPath}).`)

    wrapperApp.use(mountPath, app)

    return wrapperApp
  }

  return app
}

module.exports = function (reporter, definition) {
  let customServer = false
  const optionsApp = definition.options.app
  const optionsServer = definition.options.server
  delete definition.options.app
  delete definition.options.server

  definition.options = Object.assign({
    hostname: reporter.options.hostname,
    httpPort: reporter.options.httpPort,
    httpsPort: reporter.options.httpsPort,
    certificate: reporter.options.certificate
  }, definition.options)

  reporter.options.hostname = definition.options.hostname
  reporter.options.httpPort = definition.options.httpPort
  reporter.options.httpsPort = definition.options.httpsPort
  reporter.options.certificate = definition.options.certificate

  reporter.options.express = definition.options

  reporter.options.appPath = reporter.options.appPath || '/'

  if (reporter.options.appPath.substr(-1) !== '/') {
    reporter.options.appPath += '/'
  }

  reporter.express = {}

  let app = optionsApp
  if (!app) {
    app = require('express')()
  }

  const exposedOptions = {}

  reporter.express.exposeOptionsToApi = (extensionName, options) => {
    exposedOptions[extensionName] = options
  }

  reporter.closeListeners.add('express', () => {
    if (reporter.express.server && !customServer) {
      reporter.express.server.close()
    }

    if (reporter.express.redirectServer) {
      reporter.express.redirectServer.close()
    }
  })

  reporter.initializeListeners.add(definition.name, this, async () => {
    reporter.beforeRenderWorkerAllocatedListeners.insert(0, 'express', (req, res) => {
      res.meta.headers = {}
    })

    reporter.afterRenderListeners.add('express', (req, res) => {
      if (res.meta.profileId) {
        res.meta.profileId = res.meta.headers['Profile-Id'] = res.meta.profileId
        if (req.context.http) {
          res.meta.headers['Profile-Location'] = `${req.context.http.baseUrl}/api/profile/${res.meta.profileId}`
        }
      }
    })

    function logStart () {
      if (reporter.options.httpsPort) {
        reporter.logger.info('jsreport server successfully started on https port: ' + reporter.options.httpsPort)
      }

      if (reporter.options.httpPort) {
        reporter.logger.info('jsreport server successfully started on http port: ' + reporter.options.httpPort)
      }

      if (!reporter.options.httpPort && !reporter.options.httpsPort && reporter.express.server) {
        reporter.logger.info('jsreport server successfully started on http port: ' + reporter.express.server.address().port)
      }
    }

    if (optionsApp) {
      reporter.logger.info('Configuring routes for existing express app.')
      configureExpressApp(app, reporter, definition, exposedOptions)

      if (optionsServer) {
        customServer = true
        reporter.logger.info('Using existing server instance.')
        reporter.express.server = optionsServer
      }

      return
    }

    reporter.logger.info('Creating default express app.')

    const rootApp = configureExpressApp(app, reporter, definition, exposedOptions)

    const startFn = await prepareStartExpressApp(reporter, rootApp, reporter.options, definition.options.start)

    reporter.express.start = startFn

    if (definition.options.start) {
      await reporter.express.start()
      logStart()
    } else {
      reporter.logger.info('Skiping starting jsreport server')
    }
  })
}
