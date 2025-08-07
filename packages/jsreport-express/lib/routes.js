const { pipeline } = require('stream')
const omit = require('lodash.omit')
const serveStatic = require('serve-static')
const { FormData } = require('@jsreport/multipart')
const handleError = require('./handleError')
const odata = require('./odata')
const EventEmitter = require('events')
const archiver = require('archiver')
const { unzipFiles, parseMultipart } = require('./helpers')
const oneMonth = 31 * 86400000
const Multer = require('multer')
let multer

module.exports = (app, reporter, exposedOptions) => {
  reporter.emit('export-public-route', '/api/ping')
  multer = Multer({ dest: reporter.options.tempAutoCleanupDirectory })

  const handleErrorMiddleware = handleError(reporter)

  app.use((req, res, next) => {
    res.error = (err) => handleErrorMiddleware(req, res, err)
    next()
  })

  reporter.emit('after-express-static-configure', app)
  reporter.emit('express-before-odata', app)

  const odataServer = odata(reporter)
  app.use('/odata', (req, res) => odataServer.handle(req, res))

  reporter.extensionsManager.extensions.forEach((e) => app.use('/extension/' + e.name, serveStatic(e.directory, { maxAge: oneMonth })))

  function httpRender (renderRequestContent, req, res, stream, next) {
    res.setHeader('X-XSS-Protection', 0)

    const renderRequest = typeof renderRequestContent === 'string'
      ? {
          rawContent: renderRequestContent,
          context: req.context
        }
      : {
          ...renderRequestContent,
          context: req.context
        }

    let form
    let profiler
    if (stream) {
      form = new FormData()
      res.setHeader('Content-Type', form.getDefaultContentType())

      profiler = reporter.attachProfiler(renderRequest, req.query.profilerMode)

      profiler.on('profile', (m) => {
        form.append(m.type, JSON.stringify(m), { contentType: 'application/json' })
      })

      pipeline(form, res, (err) => {
        if (err) {
          res.destroy()
        }
      })
    }

    const abortEmitter = new EventEmitter()

    const onReqClose = () => {
      abortEmitter.emit('abort')
    }

    req.socket.once('close', onReqClose)

    const onReqReady = (req) => {
      res.setTimeout((reporter.getReportTimeout(req) + reporter.options.reportTimeoutMargin) * 1.2)
    }

    const cleanupAfterRender = () => {
      // clear the res.setTimeout, this internally remove listener from res
      res.setTimeout(0)
      req.socket.removeListener('close', onReqClose)
    }

    reporter.render(renderRequest, { abortEmitter, onReqReady }).then((renderResponse) => {
      cleanupAfterRender()

      return Promise.all([renderResponse.output.getStream(), renderResponse.output.getSize()]).then(([resStream, resSize]) => ({
        stream: resStream,
        size: resSize,
        meta: renderResponse.meta
      }))
    }).then((renderResponse) => {
      if (stream) {
        form.append('report', renderResponse.stream, {
          filename: `${renderResponse.meta.reportName}.${renderResponse.meta.fileExtension}`,
          contentLength: renderResponse.size,
          header: {
            'Content-Type': renderResponse.meta.headers['Content-Type'],
            'Content-Disposition': renderResponse.meta.headers['Content-Disposition']
          }
        })

        form.end()
      } else {
        for (const key in renderResponse.meta.headers) {
          res.setHeader(key, renderResponse.meta.headers[key])
        }

        pipeline(renderResponse.stream, res, (pipeErr) => {
          if (pipeErr) {
            reporter.logger.warn('Error while streaming the response:', pipeErr)
            res.destroy()
            return
          }

          next()
        })
      }
    }).catch((renderErr) => {
      cleanupAfterRender()

      if (!stream) {
        next(renderErr)
      } else {
        form.end()
      }
    })
  }

  reporter.express.streamRender = (renderRequest, req, res, next) => {
    return httpRender(renderRequest, req, res, true, next)
  }

  reporter.express.render = (renderRequest, req, res, next) => {
    return httpRender(renderRequest, req, res, false, next)
  }

  /**
   * Route for rendering template by shortid
   */
  app.get('/templates/:shortid', (req, res, next) => reporter.express.render({ template: { shortid: req.params.shortid } }, req, res, next))

  /**
   * Main entry point for invoking report rendering
   */
  app.post('/api/report/:name?', (req, res, next) => {
    const executeRender = () => {
      if (req.query.profilerMode === 'standard' || req.query.profilerMode === 'full') {
        reporter.express.streamRender(req.body, req, res, next)
      } else {
        // support for browser client sending renderRequestContent in form element
        reporter.express.render(req.body.renderRequestContent || req.body, req, res, next)
      }
    }

    executeRender()
  })

  app.get('/api/version', (req, res, next) => res.send(reporter.version))

  app.get('/api/settings', async (req, res, next) => {
    try {
      const data = {
        tenant: omit(req.user, 'password')
      }

      if (reporter.authentication) {
        const isAdmin = await reporter.authentication.isUserAdmin(req.user, req)

        if (isAdmin) {
          data.isTenantAdmin = isAdmin
        }
      }

      res.send(data)
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/recipe', (req, res, next) => res.json(reporter.extensionsManager.recipes.map((r) => r.name)))

  app.get('/api/engine', (req, res, next) => res.json(reporter.extensionsManager.engines.map((r) => r.name)))

  app.get('/api/extensions', (req, res, next) => {
    const extensions = reporter.extensionsManager.extensions.map((extension) => {
      let publicOptions = {}

      if (exposedOptions[extension.name] != null) {
        publicOptions = exposedOptions[extension.name]
      }

      return {
        name: extension.name,
        main: extension.main,
        source: extension.source,
        version: extension.version,
        dependencies: extension.dependencies,
        options: publicOptions
      }
    })

    res.json(extensions)
  })

  app.get('/api/ping', (req, res, next) => {
    if (!reporter._initialized) {
      return res.status(403).send('Not yet initialized.')
    }
    res.send('pong')
  })

  app.get('/api/schema/:entitySet', (req, res, next) => {
    const normalizedEntityTypeName = reporter.documentStore.model.entitySets[req.params.entitySet]?.normalizedEntityTypeName
    const schema = normalizedEntityTypeName != null ? reporter.entityTypeValidator.getSchema(normalizedEntityTypeName) : undefined

    if (schema == null) {
      return res.status(404).send(`There is no schema for "${req.params.entitySet}"`)
    }

    res.json(schema)
  })

  app.get('/api/profile/:id', async (req, res, next) => {
    try {
      let profile = await reporter.documentStore.collection('profiles').findOne({ _id: req.params.id }, req)

      if (!profile) {
        throw reporter.createError(`Profile ${req.params.id} not found`, {
          statusCode: 404
        })
      }

      // try to wait until the events are fully flushed
      if (profile.state !== 'success' && profile.state !== 'error') {
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          profile = await reporter.documentStore.collection('profiles').findOne({ _id: req.params.id }, req)
          if (profile.state === 'success' || profile.state === 'error') {
            break
          }
        }

        if (profile.state !== 'success' && profile.state !== 'error') {
          throw reporter.createError('Timeout when waiting for profile blob to be fully persisted')
        }
      }

      const blobContentBuf = await reporter.blobStorage.read(profile.blobName)

      const archive = archiver('zip')
      archive.append(JSON.stringify(profile, null, 2), { name: 'profile.json' })
      archive.append(blobContentBuf, { name: 'events.log' })
      archive.append(JSON.stringify({
        reporterVersion: reporter.version,
        createdAt: new Date().getTime()
      }, null, 2), { name: 'metadata.json' })

      res.type('application/zip')

      archive.finalize()

      pipeline(archive, res, (pipeErr) => {
        if (pipeErr) {
          next(pipeErr)
        }
      })
    } catch (e) {
      next(e)
    }
  })

  app.get('/api/profile/:id/events', async (req, res, next) => {
    try {
      let profile = await reporter.documentStore.collection('profiles').findOne({ _id: req.params.id }, req)

      if (!profile) {
        throw reporter.createError(`Profile ${req.params.id} not found`, {
          statusCode: 404
        })
      }

      // try to wait until the events are fully flushed
      if (profile.state !== 'success' && profile.state !== 'error') {
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          profile = await reporter.documentStore.collection('profiles').findOne({ _id: req.params.id }, req)
          if (profile.state === 'success' || profile.state === 'error') {
            break
          }
        }

        if (!profile.blobName || (profile.state !== 'success' && profile.state !== 'error')) {
          throw reporter.createError('Timeout when waiting for profile blob to be fully persisted')
        }
      }

      const blobContentBuf = await reporter.blobStorage.read(profile.blobName)
      res.send(blobContentBuf.toString())
    } catch (e) {
      next(e)
    }
  })

  app.post('/api/profile/events', async (req, res, next) => {
    try {
      const content = await parseMultipart(multer)(req, res)
      const entries = await unzipFiles(content)
      res.send(entries['events.log'])
    } catch (e) {
      next(reporter.createError('Unable to parse jsrprofile file', {
        original: e
      }))
    }
  })
}
