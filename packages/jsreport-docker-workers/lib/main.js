const createDockerManager = require('./dockerManager')
const serializator = require('serializator')
const express = require('express')

module.exports = (reporter, definition) => {
  reporter.documentStore.registerEntityType('ServerType', {
    ip: { type: 'Edm.String', key: true },
    stack: { type: 'Edm.String' },
    ping: { type: 'Edm.DateTimeOffset' }
  })

  reporter.documentStore.registerEntitySet('servers', {
    entityType: 'jsreport.ServerType',
    humanReadableKey: 'ip',
    internal: true
  })

  reporter.documentStore.registerEntityType('TenantWorkers', {
    _id: { type: 'Edm.String', key: true },
    ip: { type: 'Edm.String' },
    port: { type: 'Edm.Int32' },
    stack: { type: 'Edm.String' },
    tenant: { type: 'Edm.String' },
    updateAt: { type: 'Edm.DateTimeOffset' }
  })

  reporter.documentStore.registerEntitySet('tenantWorkers', {
    entityType: 'jsreport.TenantWorkers',
    humanReadableKey: '_id',
    internal: true
  })

  reporter.on('after-authentication-express-routes', () => {
    reporter.express.app.post('/api/worker-docker-manager', reporter.dockerManager.executeWorker.bind(reporter.dockerManager))
  })

  const workerRequestMap = new Map()
  reporter.on('after-express-static-configure', () => {
    if (!reporter.authentication) {
      return reporter.express.app.post('/api/worker-docker-manager', express.text(), async (req, res, next) => {
        try {
          const reqBody = serializator.parse(req.body)

          if (reqBody.systemAction === 'allocate') {
            const worker = await reporter.dockerManager.allocate({
              context: reqBody.req.context,
              timeout: reqBody.timeout
            })
            workerRequestMap.set(reqBody.req.context.rootId, worker)
            res.status(201).send('{}')
            return
          }

          if (reqBody.systemAction === 'release') {
            const worker = workerRequestMap.get(reqBody.req.context.rootId)
            try {
              await worker.release()
            } finally {
              workerRequestMap.delete(reqBody.req.context.rootId)
            }
            res.status(201).send('{}')
            return
          }

          if (reqBody.systemAction === 'execute') {
            const worker = workerRequestMap.get(reqBody.req.context.rootId)
            const result = await worker.execute(reqBody, {
              executeMain: async (data) => {
                return reporter._invokeMainAction(data, reqBody.req)
              },
              timeout: reqBody.timeout
            })
            res.status(201).send(serializator.serialize(result))
            return
          }

          throw reporter.createError('Unknown worker action ' + reqBody.systemAction)
        } catch (e) {
          next(e)
        }
      })
    }
  })

  reporter.registerWorkersManagerFactory((options, systemOptions) => {
    reporter.dockerManager = createDockerManager(reporter, definition.options, options, systemOptions)
    reporter.closeListeners.add('docker-workers', reporter.dockerManager.close)
    return reporter.dockerManager
  })
}
