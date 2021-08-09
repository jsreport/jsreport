module.exports = (reporter, definition) => {
  reporter.addRequestContextMetaConfig('sampleData', { sandboxReadOnly: true })

  reporter.beforeRenderListeners.insert({ after: 'templates' }, definition.name, this, async (request, response) => {
    if (
      request.context.originalInputDataIsEmpty === false ||
      // skip also if parent request data was empty but then later was set by data ref
      (request.context.originalInputDataIsEmpty === true && request.context.sampleData === true)
    ) {
      request.context.sampleData = false
      reporter.logger.debug('Inline data specified.', request)
      return
    }

    if (!request.template.data || (!request.template.data.shortid && !request.template.data.name)) {
      request.context.sampleData = false
      reporter.logger.debug('Data item not defined for this template.', request)
      return
    }

    const findDataItem = async () => {
      const query = {}
      if (request.template.data.shortid) {
        query.shortid = request.template.data.shortid
      }

      if (request.template.data.name) {
        query.name = request.template.data.name
      }

      const items = await reporter.documentStore.collection('data').find(query, request)

      if (items.length !== 1) {
        throw reporter.createError(`Data entry not found (${(request.template.data.shortid || request.template.data.name)})`, {
          statusCode: 404
        })
      }

      reporter.logger.debug('Adding sample data ' + (request.template.data.name || request.template.data.shortid), request)
      return items[0]
    }

    try {
      let di = await findDataItem()
      request.context.sampleData = true

      if (!di) {
        return
      }

      di = di.dataJson || di
      request.data = JSON.parse(di)
    } catch (e) {
      throw reporter.createError('Failed to parse data json', {
        weak: true,
        statusCode: 400,
        original: e
      })
    }
  })
}
