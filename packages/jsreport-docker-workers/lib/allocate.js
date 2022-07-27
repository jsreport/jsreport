const get = require('lodash.get')
const _sendToWorker = require('./sendToWorker')

module.exports = ({ reporter, containersManager, ip, stack, serversChecker, discriminatorPath, reportTimeoutMargin }) => {
  containersManager.onRecycle(({ container, originalTenant }) => {
    return reporter.documentStore.internalCollection('tenantWorkers').remove({
      ip,
      stack,
      tenant: originalTenant
    })
  })

  async function allocateContainer ({
    discriminator,
    req
  }) {
    reporter.logger.debug(`Allocating worker discriminator: ${discriminator}`)
    const serverPort = reporter.express ? reporter.express.server.address().port : null

    const currentTenantWorker = await reporter.documentStore.internalCollection('tenantWorkers').findOne({
      stack,
      tenant: discriminator
    })

    if (
      currentTenantWorker &&
      (currentTenantWorker.ip !== ip ||
      (currentTenantWorker.ip === ip && currentTenantWorker.port !== serverPort))
    ) {
      reporter.logger.debug(`Found previous remote worker assigned ${currentTenantWorker.ip} (port: ${currentTenantWorker.port}, discriminator: ${discriminator}), checking status`)

      if (serversChecker.status(currentTenantWorker.ip)) {
        const remoteUrl = `http://${currentTenantWorker.ip}:${currentTenantWorker.port}/api/worker-docker-manager`

        reporter.logger.debug(`Delegating request to external worker ${currentTenantWorker.ip} (${remoteUrl}), discriminator: ${discriminator}`)

        return {
          remote: true,
          url: remoteUrl
        }
      }

      reporter.logger.debug(`Remote worker ${currentTenantWorker.ip} (port: ${currentTenantWorker.port}, discriminator: ${discriminator}) is not healthy, continuing request in local`)
    }

    await reporter.documentStore.internalCollection('tenantWorkers').update({
      stack,
      tenant: discriminator
    }, { $set: { ip, port: serverPort, stack, tenant: discriminator, updateAt: new Date() } }, { upsert: true })

    reporter.logger.debug(`Executing in local worker, port: ${serverPort}, discriminator: ${discriminator}`)

    try {
      const container = await containersManager.allocate({ req, tenant: discriminator })
      reporter.logger.debug(`Container ${container.id} at ${container.url} ready (discriminator: ${discriminator})`)

      return container
    } catch (e) {
      e.message = `Error while trying to prepare docker container for render request (discriminator: ${discriminator}). ${e.message}`
      throw e
    }
  }

  return async (req, opts = {}) => {
    const serverPort = reporter.express ? reporter.express.server.address().port : null
    const discriminator = get(req, discriminatorPath)

    if (discriminator == null) {
      throw reporter.createError(`No value found in request using discriminator "${discriminatorPath}", not possible to delegate requests to docker workers`)
    }

    const container = await allocateContainer({
      discriminator,
      req
    })

    const sendToWorkerOpts = {
      remote: container.remote === true,
      reportTimeoutMargin
    }

    if (sendToWorkerOpts.remote) {
      sendToWorkerOpts.originUrl = `http://${ip}:${serverPort}/api/worker-docker-manager`
    }

    const sendToWorker = _sendToWorker(reporter, sendToWorkerOpts)

    try {
      await sendToWorker(container.url, {
        req: {
          context: req.context
        }
      }, {
        systemAction: 'allocate',
        timeout: container.remote ? opts.timeout * 1.2 : opts.timeout
      })
    } catch (e) {
      await containersManager.release(container)
      reporter.logger.warn(`Error while trying to allocate worker in container${container.remote ? '' : ` ${container.id}`} (${container.url}): ${e.stack}`)
      throw reporter.createError('Unable to allocate worker', { ...e })
    }

    return {
      rootId: req.context.rootId,
      async execute (userData, options) {
        try {
          return await sendToWorker(container.url, userData, {
            ...options,
            systemAction: 'execute'
          })
        } catch (e) {
          // the weak is normally set in the reporter, but that is here too late
          if (e.code === 'WORKER_ABORTED' || e.code === 'WORKER_TIMEOUT') {
            e.weak = true
          }

          if (!e.weak) {
            container.needRestart = true
          }
          throw e
        }
      },

      async release () {
        let releaseError
        try {
          await sendToWorker(container.url, {
            req: {
              context: {
                rootId: this.rootId
              }
            }
          }, {
            systemAction: 'release',
            timeout: req.timeout
          })
        } catch (e) {
          releaseError = e
        }

        if (container.remote === true) {
          reporter.logger.debug(`Release of used docker container was handled in remote worker (${container.url}) (discriminator: ${discriminator})`)
          return
        }

        if (container.needRestart || releaseError) {
          container.needRestart = false
          reporter.logger.debug(`Releasing (with hard error), restart of container ${container.id} (${container.url}`)
          containersManager.recycle({ container, originalTenant: discriminator }).catch((err) => {
            reporter.logger.error(`Error while trying to recycle container ${container.id} (${container.url}): ${err.stack}`)
          })
        } else {
          reporter.logger.debug(`Releasing container ${container.id} (${container.url})`)
          await containersManager.release(container)
        }
      }
    }
  }
}
