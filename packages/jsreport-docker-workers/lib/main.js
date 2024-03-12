const { pipeline } = require('stream')
const { FormData } = require('@jsreport/multipart')
const serializator = require('@jsreport/serializator')
const _sendToWorker = require('./sendToWorker')
const createDockerManager = require('./dockerManager')
const express = require('express')

module.exports = (reporter, definition) => {
  if (!definition.options.container.sharedTempRewriteRootPathTo) {
    definition.options.container.sharedTempRewriteRootPathTo = definition.options.container.sharedTempHostBindMountRootPath
  }

  if (definition.options.container.sharedTempHostBindMountRootPath.endsWith('/')) {
    definition.options.container.sharedTempHostBindMountRootPath = definition.options.container.sharedTempHostBindMountRootPath.slice(0, -1)
  }

  if (definition.options.container.sharedTempRewriteRootPathTo.endsWith('/')) {
    definition.options.container.sharedTempRewriteRootPathTo = definition.options.container.sharedTempRewriteRootPathTo.slice(0, -1)
  }

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
    reporter.express.app.post('/api/worker-docker-manager', async (req, res, next) => {
      try {
        const reqBody = typeof req.body === 'string' ? serializator.parse(req.body) : req.body
        const result = await reporter.dockerManager.executeWorker(reqBody)
        await reporter.dockerManager.handleRemoteHttpResponse(reqBody, result, res)
      } catch (e) {
        next(e)
      }
    })
  })

  reporter.on('after-express-static-configure', () => {
    if (!reporter.authentication) {
      return reporter.express.app.post('/api/worker-docker-manager', express.text(), async (req, res, next) => {
        try {
          const reqBody = serializator.parse(req.body)
          const result = await reporter.dockerManager.executeWorker(reqBody)
          await reporter.dockerManager.handleRemoteHttpResponse(reqBody, result, res)
        } catch (e) {
          next(e)
        }
      })
    }
  })

  const workerRequestMap = new Map()

  reporter.registerWorkersManagerFactory((options, systemOptions) => {
    reporter.dockerManager = createDockerManager(reporter, definition.options, options, systemOptions)

    reporter.dockerManager.getWorkerHttpOptions = function ({ remote }) {
      if (remote && reporter.authentication) {
        const authOptions = reporter.options.extensions.authentication

        return {
          auth: {
            username: authOptions.admin.username,
            password: authOptions.admin.password
          }
        }
      }
    }

    reporter.dockerManager.handleRemoteHttpResponse = async function handleRemoteHttpResponse (reqBody, workerResult, res) {
      if (reqBody.actionName === 'render') {
        // sending local response serialized as multipart to the original remote server
        // the response output can be buffer or stream, but we always send it as stream output
        const renderR = reporter.Response(reqBody.req.context.id)
        await renderR.parse(workerResult)

        const form = new FormData()

        const serializedMeta = serializator.serialize(workerResult.meta)

        res.status(201).setHeader('Content-Type', form.getDefaultContentType())

        pipeline(form, res, (err) => {
          if (err) {
            res.destroy()
          }
        })

        form.append('meta', serializedMeta, { contentType: 'application/json' })

        const responseSize = await renderR.output.getSize()
        const responseFileStream = await renderR.output.getStream()

        form.append('content', responseFileStream, { contentLength: responseSize })
        form.end()
        return
      }

      res.status(201).send(serializator.serialize(workerResult))
    }

    reporter.dockerManager.executeWorker = async function executeWorker (payload) {
      const { systemAction } = payload

      if (systemAction === 'allocate') {
        const { req, timeout } = payload

        const worker = await reporter.dockerManager.allocate({
          context: req.context
        }, {
          timeout
        })

        workerRequestMap.set(req.context.rootId, worker)
        return {}
      }

      if (systemAction === 'release') {
        const { req } = payload

        const worker = workerRequestMap.get(req.context.rootId)
        try {
          await worker.release()
        } finally {
          workerRequestMap.delete(req.context.rootId)
        }

        return {}
      }

      if (systemAction === 'execute') {
        const { req, originUrl, timeout } = payload

        const sendToWorker = _sendToWorker(reporter, { remote: true })

        const worker = workerRequestMap.get(req.context.rootId)
        const result = await worker.execute(payload, {
          executeMain: async (data) => {
            const result = await reporter._invokeMainAction(data, req)

            if (data.actionName === 'profile') {
              // send the profile data to the server which received the request.
              // it will make sure to store the profile data and stream it to the studio
              await sendToWorker(originUrl, {
                req: {
                  context: {
                    rootId: req.context.rootId
                  }
                },
                data
              }, {
                systemAction: 'profile',
                timeout
              })
            }

            return result
          },
          timeout: timeout + definition.options.reportTimeoutMargin
        })

        return result
      }

      if (systemAction === 'profile') {
        const { req, data } = payload

        // we make sure that we don't duplicate the logs
        // the logging is done in the remote server, here
        // on the origin server we just care about the profile saving
        data.data = {
          events: data.data,
          log: false
        }

        return reporter._invokeMainAction(data, req)
      }

      throw reporter.createError(`Unknown worker action ${systemAction}`)
    }

    reporter.closeListeners.add('docker-workers', reporter.dockerManager.close)
    return reporter.dockerManager
  })
}
