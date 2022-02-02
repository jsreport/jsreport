/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Reports extension allows to store rendering output into storage for later use.
 */

const extend = require('node.extend.without.arrays')
const _omit = require('lodash.omit')

class Reports {
  constructor (reporter, definition) {
    this.reporter = reporter
    this.definition = definition

    this.reporter.on('express-configure', this.configureExpress.bind(this))

    this._defineEntities()

    this.reporter.initializeListeners.add(definition.name, () => {
      if (this.reporter.authentication) {
        this.reporter.emit('export-public-route', '/reports/public')
      }

      if (this.reporter.authorization) {
        this.reporter.authorization.findPermissionFilteringListeners.add(definition.name, this._reportsFiltering.bind(this))
      }

      const col = reporter.documentStore.collection('reports')

      // this listener should run after the authorization check, so it is safe to remove
      // the blob attached to the report. ideally we should execute this remove in an "afterRemove"
      // event but since that does not exists we have to make sure that the listener executes after
      // the authorization check
      col.beforeRemoveListeners.add({ after: 'authorization-cascade-remove' }, definition.name, async (query, req) => {
        const result = await col.find({ _id: query._id }, req)

        if (result.length === 0) {
          throw reporter.createError(`Report ${query._id} not found`, {
            statusCode: 404
          })
        }

        if (!result[0].blobName) {
          return
        }
        await reporter.blobStorage.remove(result[0].blobName, req)
        reporter.logger.debug('Report ' + result[0].blobName + ' was removed from storage')
      })
    })

    if (definition.options.cleanInterval && definition.options.cleanThreshold) {
      this.reporter.logger.info(`reports extension has enabled old reports cleanup with interval ${definition.options.cleanInterval}ms and threshold ${definition.options.cleanThreshold}ms`)
      this.cleanInterval = setInterval(() => this.clean(), definition.options.cleanInterval)
      this.cleanInterval.unref()
      this.reporter.closeListeners.add('reports', () => clearInterval(this.cleanInterval))
    }

    this.reporter.beforeRenderListeners.insert(0, 'reports', this._handleBeforeRender.bind(this))
  }

  configureExpress (app) {
    const findReport = async (reportId, req) => {
      const report = await this.reporter.documentStore.collection('reports').findOne({ _id: reportId }, req)

      if (report == null) {
        throw this.reporter.createError(`Report ${req.params.id} not found`, {
          statusCode: 404
        })
      }

      if (!report.public && req.url.indexOf('reports/public') > -1) {
        throw this.reporter.createError('Unauthorized', {
          code: 'UNAUTHORIZED'
        })
      }

      if (report.state !== 'success') {
        let errMsg = `Report ${req.params.id} wasn't successful`

        if (req.context.http) {
          errMsg = `${errMsg}, check ${req.context.http.baseUrl}/reports/${report._id}/status for details`
        }

        throw this.reporter.createError(errMsg, {
          statusCode: 404
        })
      }

      return {
        report,
        content: await this.reporter.blobStorage.read(report.blobName)
      }
    }

    app.get('/reports/public/:id/content', async (req, res, next) => {
      try {
        const { report, content } = await findReport(req.params.id, req)
        res.setHeader('Content-Type', report.contentType)
        res.setHeader('File-Extension', report.fileExtension)
        res.send(content)
      } catch (e) {
        next(e)
      }
    })

    app.get('/reports/:id/content', async (req, res, next) => {
      try {
        const { report, content } = await findReport(req.params.id, req)
        res.setHeader('Content-Type', report.contentType)
        res.setHeader('File-Extension', report.fileExtension)
        res.send(content)
      } catch (e) {
        next(e)
      }
    })

    app.get('/reports/:id/attachment', async (req, res, next) => {
      try {
        const { report, content } = await findReport(req.params.id, req)
        res.setHeader('Content-Type', report.contentType)
        res.setHeader('File-Extension', report.fileExtension)
        res.setHeader('Content-Disposition', `attachment; filename="${report.name}.${report.fileExtension}"`)
        res.send(content)
      } catch (e) {
        next(e)
      }
    })

    app.get('/reports(/public)?/:id/status', async (req, res, next) => {
      try {
        const report = await this.reporter.documentStore.collection('reports').findOne({ _id: req.params.id }, req)

        if (report == null) {
          throw this.reporter.createError(`Report ${req.params.id} not found`, {
            statusCode: 404
          })
        }

        if (!report.public && req.url.indexOf('reports/public') > -1) {
          throw this.reporter.createError('Unauthorized', {
            code: 'UNAUTHORIZED'
          })
        }

        if (report.state === 'planned') {
          res.setHeader('Report-State', report.state)
          return res.send('Report is pending. Wait until 201 response status code')
        }

        if (report.state === 'error') {
          res.setHeader('Report-State', report.state)
          return res.send(`Report generation failed.${' ' + (report.error || '')}`)
        }

        const baseLink = `${req.protocol}://${req.headers.host}`
        const link = baseLink + new URL(req.originalUrl, baseLink).pathname.replace('/status', '/content')

        res.setHeader('Report-State', report.state)
        res.setHeader('Location', link)
        res.setHeader('Content-Type', 'text/html')
        res.status(201).send("Report is ready, check Location header or download it <a href='" + link + "'>here</a>")
      } catch (e) {
        next(e)
      }
    })
  }

  async clean () {
    try {
      this.reporter.logger.debug('Cleaning up old reports')
      const removeOlderDate = new Date(Date.now() - this.definition.options.cleanThreshold)
      const reportsToRemove = await this.reporter.documentStore.collection('reports').find({ creationDate: { $lt: removeOlderDate } })
      this.reporter.logger.debug(`Cleaning old reports with remove ${reportsToRemove.length} reports`)
      await Promise.all(reportsToRemove.map((r) => this.reporter.documentStore.collection('reports').remove({ _id: r._id })))
    } catch (e) {
      this.reporter.logger.error('Failed to clean up old reports', e)
    }
  }

  _defineEntities () {
    this.ReportType = this.reporter.documentStore.registerEntityType('ReportType', {
      recipe: { type: 'Edm.String' },
      blobName: { type: 'Edm.String' },
      contentType: { type: 'Edm.String' },
      reportName: { type: 'Edm.String' },
      fileExtension: { type: 'Edm.String' },
      public: { type: 'Edm.Boolean' },
      templateShortid: { type: 'Edm.String', referenceTo: 'templates' },
      state: { type: 'Edm.String' },
      error: { type: 'Edm.String' }
    })

    this.reporter.documentStore.registerEntitySet('reports', {
      entityType: 'jsreport.ReportType',
      exportable: false
    })
  }

  async _reportsFiltering (collection, query, req) {
    if (collection.name === 'reports') {
      if (query.templateShortid) {
        const templates = await this.reporter.documentStore.collection('templates').find({ shortid: query.templateShortid })
        if (templates.length !== 1) {
          return
        }

        delete query.readPermissions
      }

      const templates = await this.reporter.documentStore.collection('templates').find({}, req)
      delete query.readPermissions
      query.$or = [{
        templateShortid: {
          $in: templates.map(function (t) {
            return t.shortid
          })
        }
      }, { readPermissions: req.context.user._id.toString() }]
    }
  }

  async _handleBeforeRender (request, response, options) {
    if (request.options.reports == null || request.options.reports.async !== true) {
      return
    }

    const r = await this.reporter.documentStore.collection('reports').insert({
      reportName: response.meta.reportName,
      state: 'planned',
      public: request.options.reports != null ? request.options.reports.public : false
    }, request)

    if (request.context.http) {
      if (request.options.reports && request.options.reports.public) {
        response.meta.headers.Location = `${request.context.http.baseUrl}/reports/public/${r._id}/status`
      } else {
        response.meta.headers.Location = `${request.context.http.baseUrl}/reports/${r._id}/status`
      }
    }

    const asyncRequest = extend(true, {}, _omit(request, 'data'))
    if (request.context.parsedInWorker !== true) {
      asyncRequest.data = request.data
    }

    // start a fresh context so we don't inherit logs, etc
    asyncRequest.context = extend(true, {}, _omit(asyncRequest.context, 'logs'))
    asyncRequest.options.reports = extend(true, {}, request.options.reports)
    asyncRequest.options.reports.save = true

    asyncRequest.options.reports.async = false
    asyncRequest.options.reports._id = r._id

    request.options = {}

    // this request is now just returning status page, we don't want store blobs there
    delete response.meta.reportsOptions

    request.context.returnResponseAndKeepWorker = true
    response.content = Buffer.from("Async rendering in progress. Use Location response header to check the current status. Check it <a href='" + response.meta.headers.Location + "'>here</a>")
    response.meta.contentType = 'text/html'
    response.meta.fileExtension = 'html'

    this.reporter.logger.info('Rendering is queued for async report generation', request)

    process.nextTick(() => {
      this.reporter.logger.info(`Async report is starting to render ${asyncRequest.options.reports._id}`)

      this.reporter.render(asyncRequest, options).then(() => {
        this.reporter.logger.info(`Async report render finished ${asyncRequest.options.reports._id}`)
      }).catch((e) => {
        this.reporter.logger.error(`Async report render failed ${asyncRequest.options.reports._id}: ${e.stack}`)

        this.reporter.documentStore.collection('reports').update({
          _id: asyncRequest.options.reports._id
        }, {
          $set: {
            state: 'error',
            error: e.stack
          }
        }, request)
      })
    })
  }
}

module.exports = function (reporter, definition) {
  reporter[definition.name] = new Reports(reporter, definition)
}
