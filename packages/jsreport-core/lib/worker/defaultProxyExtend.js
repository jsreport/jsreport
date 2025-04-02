
module.exports = (reporter) => (proxy, req) => {
  proxy.req = req

  proxy.render = async (renderRequest) => {
    const res = await reporter.render({
      ...renderRequest,
      // new fresh context (user data and cycle control counter is inherit from originalReq during rendering).
      // this avoids that user can fake user identity by sending context
      // with information of another user and allows the original request to collect logs
      // from the render of proxy
      context: {}
    }, req)

    // expose the response api
    return res
  }

  proxy.documentStore = {
    collection: (name) => ({
      find: async (q) => {
        req.context.userFindCall = true
        const res = await reporter.documentStore.collection(name).find(q, req)
        return res
      },
      findOne: async (q) => {
        req.context.userFindCall = true

        const res = await reporter.documentStore.collection(name).findOne(q, req)

        return res
      }
    })
  }

  proxy.folders = {
    resolveEntityFromPath: (path, es, options) => {
      return reporter.folders.resolveEntityFromPath(path, es, options || {}, req)
    },
    resolveEntityPath: (entity, es) => {
      return reporter.folders.resolveEntityPath(entity, es, req)
    }
  }

  // expose tempfile functions
  const createTempFileFns = [
    'getTempFilePath', 'openTempFile', 'writeTempFileSync', 'writeTempFile',
    'writeTempFileStream', 'copyFileToTempFile'
  ]

  const restOfTempFileFns = [
    'readTempFileSync', 'readTempFile', 'readTempFileStream'
  ]

  const allFns = [
    ...createTempFileFns,
    ...restOfTempFileFns
  ]

  for (const fnName of allFns) {
    const shouldLimitCreation = createTempFileFns.includes(fnName)

    proxy[fnName] = (...args) => {
      if (shouldLimitCreation) {
        // limiting the number of temp files to avoid breaking server, otherwise I see no
        // reason why having more than 1000 calls per req should be valid usecase
        const counter = reporter.runningRequests.keyValueStore.get('tmp-file-counter', req) || 0

        if (counter > 1000) {
          throw reporter.createError('Reached maximum limit of tmp file calls in sandbox', {
            weak: true,
            statusCode: 400
          })
        }

        reporter.runningRequests.keyValueStore.set('tmp-file-counter', counter + 1, req)
      }

      return reporter[fnName](...args)
    }
  }
}
