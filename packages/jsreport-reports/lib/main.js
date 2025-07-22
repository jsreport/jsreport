/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Reports extension allows to store rendering output into storage for later use.
 */
const _omit = require('lodash.omit')
const extend = require('node.extend.without.arrays')

class Reports {
  constructor (reporter, definition) {
    this.reporter = reporter
    this.definition = definition
    this.cleaning = false

    this.reporter.on('express-configure', this.configureExpress.bind(this))

    this._defineEntities()

    this.reporter.initializeListeners.add(definition.name, () => {
      // this should be before profiler, so we dont keep pending things in maps until the rendering starts
      this.reporter.beforeRenderWorkerAllocatedListeners.insert({ after: 'express' }, 'reports', this._handleBeforeRenderWorkerAllocate.bind(this))

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
      this.reporter.logger.info(`reports extension has enabled old reports cleanup with interval ${definition.options.cleanInterval}ms, threshold ${definition.options.cleanThreshold}ms and ${definition.options.cleanParallelLimit} report(s) deletion per run`)
      this.cleanInterval = setInterval(() => this.clean(), definition.options.cleanInterval)
      this.cleanInterval.unref()

      this.reporter.closeListeners.add('reports', () => {
        this.cleaning = false
        clearInterval(this.cleanInterval)
      })
    }

    this.reporter.beforeRenderListeners.add('reports', this._handleBeforeRender.bind(this))
    this.reporter.renderErrorListeners.add('reports', this._handleRenderError.bind(this))
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

        if (report.meta) {
          const headers = JSON.parse(report.meta).headers
          for (const key in headers) {
            res.setHeader(key, headers[key])
          }
        }

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

        if (report.meta) {
          const headers = JSON.parse(report.meta).headers
          for (const key in headers) {
            res.setHeader(key, headers[key])
          }
        }

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

        if (report.meta) {
          const headers = JSON.parse(report.meta).headers
          for (const key in headers) {
            res.setHeader(key, headers[key])
          }
        }

        res.setHeader('Content-Disposition', `attachment; filename="${report.reportName}.${report.fileExtension}"`)
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
      this.cleaning = true
      this.reporter.logger.debug('Cleaning up old reports')
      const removeOlderDate = new Date(Date.now() - this.definition.options.cleanThreshold)
      let removedReports = 0

      while (true) {
        const reportsToRemove = await this.reporter.documentStore.collection('reports').find({ creationDate: { $lt: removeOlderDate } }).limit(this.definition.options.cleanParallelLimit).toArray()
        await Promise.all(reportsToRemove.map((r) => this.reporter.documentStore.collection('reports').remove({ _id: r._id })))
        removedReports += reportsToRemove.length
        if (reportsToRemove.length === 0) {
          this.reporter.logger.debug(`Cleaned ${removedReports} old reports`)
          return
        }
      }
    } catch (e) {
      this.reporter.logger.error('Failed to clean up old reports', e)
    } finally {
      this.cleaning = false
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
      error: { type: 'Edm.String' },
      meta: { type: 'Edm.String' }
    })

    this.reporter.documentStore.registerEntitySet('reports', {
      entityType: 'jsreport.ReportType',
      exportable: false
    })
  }

  // user that has permissions to the template should be able to read all the reports that are based on it
  async _reportsFiltering (collection, query, req) {
    if (collection.name !== 'reports') {
      return
    }

    if (query.templateShortid) {
      const templates = await this.reporter.documentStore.collection('templates').find({ shortid: query.templateShortid })
      if (templates.length !== 1) {
        return
      }

      delete query.readPermissions
      delete query.inheritedReadPermissions
    }

    const templates = await this.reporter.documentStore.collection('templates').find({}, { shortid: 1 }, req)
    delete query.readPermissions
    query.$or = [{
      templateShortid: {
        $in: templates.map(function (t) {
          return t.shortid
        })
      }
    }, { readPermissions: req.context.user._id.toString() }, { inheritedReadPermissions: req.context.user._id.toString() }]
  }

  async _handleRenderError (request, response, e) {
    if (request.options?.reports != null) {
      await this.reporter.documentStore.collection('reports').update({
        _id: request.options.reports._id
      }, {
        $set: {
          state: 'error',
          error: e.stack
        }
      }, request)
    }
  }

  async _handleBeforeRender (request, response) {
    if (request.context.reports) {
      request.options.reports = request.options.reports || {}
      Object.assign(request.options.reports, request.context.reports)
      delete request.context.reports
      return
    }

    if (request.options.reports == null || request.options.reports.async !== true) {
      return
    }

    const r = await this.reporter.documentStore.collection('reports').insert({
      reportName: response.meta.reportName,
      state: 'planned',
      public: request.options.reports != null ? request.options.reports.public : false
    }, request)

    const clientNotification = request.context.clientNotification = this.reporter.Response(request.context.id, response)

    clientNotification.meta.contentType = 'text/html'
    clientNotification.meta.fileExtension = 'html'

    if (request.context.http) {
      if (request.options.reports && request.options.reports.public) {
        clientNotification.meta.headers.Location = `${request.context.http.baseUrl}/reports/public/${r._id}/status`
      } else {
        clientNotification.meta.headers.Location = `${request.context.http.baseUrl}/reports/${r._id}/status`
      }
      await clientNotification.output.update(Buffer.from(`Async rendering in progress. Use Location response header to check the current status. Check it <a href='${clientNotification.meta.headers.Location}'>here</a>`))
    } else {
      await clientNotification.output.update(Buffer.from('Async rendering in progress.'))
    }

    this.reporter.logger.info('Responding with async report location and continue with async report generation', request)

    request.options.reports.save = true
    request.options.reports.async = false
    request.options.reports._id = r._id
  }

  async _handleBeforeRenderWorkerAllocate (request, response) {
    if (request.context.http?.headers?.['jsreport-options-reports-async'] !== 'true') {
      return
    }

    // we disable profiler in this request, so we don't have hanging tasks in map
    request.context.profiling = { enabled: false }

    delete request.context.http?.headers?.['jsreport-options-reports-async']

    const isPublic = request.context.http?.headers?.['jsreport-options-reports-public'] === 'true'
    delete request.context.http?.headers?.['jsreport-options-reports-public']

    const r = await this.reporter.documentStore.collection('reports').insert({
      reportName: 'unresolved',
      state: 'planned',
      public: isPublic
    }, request)

    const clientNotification = request.context.clientNotification = this.reporter.Response(request.context.id, response)

    clientNotification.meta.contentType = 'text/html'
    clientNotification.meta.fileExtension = 'html'

    if (request.context.http) {
      if (isPublic) {
        clientNotification.meta.headers.Location = `${request.context.http.baseUrl}/reports/public/${r._id}/status`
      } else {
        clientNotification.meta.headers.Location = `${request.context.http.baseUrl}/reports/${r._id}/status`
      }
      await clientNotification.output.update(Buffer.from(`Async rendering in progress. Use Location response header to check the current status. Check it <a href='${clientNotification.meta.headers.Location}'>here</a>`))
    } else {
      await clientNotification.output.update(Buffer.from('Async rendering in progress.'))
    }

    this.reporter.logger.info('Responding with async report location and continue with async report generation', request)

    const asyncRequest = extend(true, {}, _omit(request, 'data'))
    asyncRequest.data = request.data

    // start a fresh context so we don't inherit logs, etc
    asyncRequest.context = extend(true, {}, _omit(asyncRequest.context, 'logs', 'clientNotification', 'profiling'))
    asyncRequest.context.reports = {
      async: false,
      save: true,
      _id: r._id,
      public: isPublic
    }

    process.nextTick(() => {
      this.reporter.logger.info(`Async report is starting to render ${asyncRequest.context.reports._id}`)

      this.reporter.render(asyncRequest).then(() => {
        this.reporter.logger.info(`Async report render finished ${asyncRequest.context.reports._id}`)
      }).catch((e) => {
        this.reporter.logger.error(`Async report render failed ${asyncRequest.context.reports._id}: ${e.stack}`)
      })
    })
  }
}

module.exports = function (reporter, definition) {
  reporter[definition.name] = new Reports(reporter, definition)
}
