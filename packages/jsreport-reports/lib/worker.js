const _omit = require('lodash.omit')

module.exports = (reporter, definition) => {
  reporter.beforeRenderListeners.insert(0, definition.name, (req, res) => {
    if (req.options.reports == null || req.options.reports.save !== true) {
      return
    }

    // we don't want the report options to be applied in the nested requests, just in the end
    res.meta.reportsOptions = req.options.reports
    delete req.options.reports
  })

  reporter.initializeListeners.add(definition.name, () => {
    // we add here to be sure we are after scripts
    reporter.afterRenderListeners.add(definition.name, async (request, response) => {
      if (!response.meta.reportsOptions) {
        reporter.logger.debug('Skipping storing report.', request)
        return Promise.resolve()
      }

      const reportProfilerEvent = reporter.profiler.emit({
        type: 'operationStart',
        subtype: 'reports',
        name: 'persisting report',
        doDiffs: false
      }, request)

      const reportsOptions = response.meta.reportsOptions

      const report = Object.assign({}, reportsOptions.mergeProperties || {}, {
        recipe: request.template.recipe,
        reportName: response.meta.reportName,
        fileExtension: response.meta.fileExtension,
        templateShortid: request.template.shortid,
        creationDate: new Date(),
        contentType: response.meta.contentType,
        public: reportsOptions.public === true,
        meta: JSON.stringify(response.meta)
      })

      if (!reportsOptions._id) {
        report._id = await reporter.documentStore.collection('reports').insert({ reportName: response.meta.reportName }, request).then((r) => r._id)
      } else {
        report._id = reportsOptions._id
      }

      let reportBlobName = reportsOptions.blobName
      if (!reportBlobName) {
        if (request.template._id) {
          const templatePath = await reporter.folders.resolveEntityPath(request.template, 'templates', request)
          reportBlobName = `reports/${templatePath.substring(1)}/${report._id}`
        } else {
          reportBlobName = `reports/${report._id}`
        }
      }

      const responseContent = await response.output.getBuffer()

      report.blobName = await reporter.blobStorage.write(`${reportBlobName}.${report.fileExtension}`, responseContent, request, response)

      await reporter.documentStore.collection('reports').update({
        _id: report._id
      }, {
        $set: {
          ..._omit(report, '_id'),
          state: 'success'
        }
      }, request)

      response.meta.reportId = report._id
      response.meta.reportBlobName = report.blobName

      if (request.context.http) {
        response.meta.headers['Permanent-Link'] = `${request.context.http.baseUrl}/reports/${reportsOptions.public === true ? 'public/' : ''}${report._id}/content`
        response.meta.headers['Report-Id'] = response.meta.reportId
        response.meta.headers['Report-BlobName'] = response.meta.reportBlobName
      }

      reporter.logger.debug('Report stored as ' + report.blobName, request)
      reporter.profiler.emit({
        type: 'operationEnd',
        operationId: reportProfilerEvent.operationId,
        doDiffs: false
      }, request)
    })
  })

  reporter.renderErrorListeners.add(definition.name, async (req, res) => {
    if (res.meta.reportsOptions?._id == null) {
      return
    }

    await reporter.documentStore.collection('reports').update({
      _id: res.meta.reportsOptions?._id
    }, {
      $set: {
        reportName: res.meta.reportName
      }
    }, req)
  })
}
