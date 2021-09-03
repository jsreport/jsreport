const createContainersPool = require('./docker/containersPool')
const createBusyQueue = require('./busyQueue')

module.exports = ({
  hostIp,
  network,
  subnet,
  numberOfWorkers,
  container,
  busyQueueWaitingTimeout,
  logger,
  tempDirectory,
  containerParallelRequestsLimit,
  customContainersPoolFactory,
  initData
}) => {
  const warmupPolicy = container.warmupPolicy
  const containersPool = (customContainersPoolFactory || createContainersPool)({
    hostIp,
    network,
    subnet,
    logger,
    container,
    tempDirectory,
    numberOfWorkers,
    initData
  })

  let onRecycle = () => {}

  const busyQueue = createBusyQueue({
    run: (item) => {
      logger.debug(`Continuing queued work and trying to get a worker (discriminator: ${item.tenant})`)

      return allocate(item)
    },
    waitingTimeout: busyQueueWaitingTimeout,
    logger: logger
  })

  const waitForContainerRestart = async (container, tenant, logger) => {
    try {
      logger.debug(`Waiting until docker container's restart finish ${container.id} (${container.url}) (discriminator: ${tenant})`)
      await container.restartPromise
      logger.debug(`Docker container's restart was ok ${container.id} (${container.url}) (discriminator: ${tenant})`)
    } catch (e) {
      logger.error(`Docker container's restart failed ${container.id} (${container.url}) (discriminator: ${tenant}): ${e.stack}`)
      throw new Error('Could not get a healthy container for this operation (container restart failed), please try again')
    }
  }

  async function allocate ({ req, tenant }) {
    let container = containersPool.containers.find((c) => c.tenant != null && c.tenant === tenant)

    if (container) {
      if (containerParallelRequestsLimit != null && container.numberOfRequests >= containerParallelRequestsLimit) {
        logger.debug(`Container max parallel request limit reached, queuing ${container.id} (${container.url}) (discriminator: ${tenant})`)
        return new Promise((resolve, reject) => {
          busyQueue.push({
            tenant,
            req
          }, resolve, reject)
        })
      }

      logger.debug(`Reusing existing docker container ${container.id} (${container.url}) (discriminator: ${tenant})`)

      if (container.restartPromise) {
        await waitForContainerRestart(container, tenant, logger)
      }

      container.tenant = tenant
      container.lastUsed = new Date()
      container.numberOfRequests++

      return container
    }

    logger.debug(`No docker container previously assigned, searching by LRU (discriminator: ${tenant})`)

    // make sure we get the first container for brand new containers
    container = containersPool.containers.reduce((prev, current) =>
      (prev.lastUsed < current.lastUsed || (!prev.lastUsed && !current.lastUsed)) ? prev : current)

    logger.debug(`LRU container is ${container.id} (discriminator: ${tenant})`)

    if (container.numberOfRequests > 0) {
      logger.debug(`All docker containers are busy, queuing work and waiting for a worker to be available (discriminator: ${tenant})`)

      return new Promise((resolve, reject) => {
        busyQueue.push({
          tenant,
          req
        }, resolve, reject)
      })
    }

    if (container.restartPromise) {
      await waitForContainerRestart(container, tenant, logger)
    }

    const originalTenant = container.tenant

    container.tenant = tenant
    container.lastUsed = new Date()

    if (!originalTenant) {
      container.numberOfRequests++

      logger.debug(`No need to restart unassigned docker container ${container.id} (discriminator: ${tenant})`)
      return container
    }

    logger.debug(`Restarting and unregistering previous assigned docker container ${container.id} (discriminator: ${tenant})`)

    await recycle({
      container,
      originalTenant,
      onRestart: (c) => {
        logger.debug(`Restoring information for new work after unregistering previous assigned docker container ${container.id} (discriminator: ${tenant})`)

        // after recycle tenant is unset, so we set it again
        c.tenant = tenant
        // after recycle we set new last used date
        c.lastUsed = new Date()
        c.numberOfRequests = 1
      }
    })

    return container
  }

  async function warmupNextOldContainer () {
    if (warmupPolicy === false) {
      return
    }

    const container = containersPool.containers.reduce((prev, current) => (prev.lastUsed < current.lastUsed) ? prev : current)

    if (!container || container.numberOfRequests > 0 || !container.tenant) {
      return
    }

    logger.debug(`Warming up docker container ${container.id} (${container.url})`)

    const originalTenant = container.tenant

    container.tenant = undefined

    return recycle({
      container,
      originalTenant
    })
  }

  async function recycle ({ container, originalTenant, onRestart }) {
    if (container.restartPromise) {
      return container.restartPromise
    }

    // no one should use this container now
    container.numberOfRequests = 1
    container.tenant = undefined
    container.numberOfRestarts++

    container.restartPromise = Promise.resolve(onRecycle({ container, originalTenant })).then(async () => {
      while (true) {
        try {
          await container.restart()
          return container
        } catch (e) {
          logger.error(`Restarting container ${container.id} (${container.url}) (failed) ${e.stack}`)
        }
      }
    }).then(() => {
      logger.debug(`Restarting container ${container.id} (${container.url}) (done)`)
      container.numberOfRequests = 0
      container.restartPromise = null

      // it is important to call the callback fn before flushing the work queue,
      // so the caller have a chance to react before processing something else
      if (onRestart) {
        onRestart(container)
      }

      busyQueue.flush()

      return container
    })

    return container.restartPromise
  }

  async function release (container) {
    container.numberOfRequests--
    busyQueue.flush()

    warmupNextOldContainer().catch((err) => {
      logger.error(`Error while trying to warm up next old container: ${err.stack}`)
    })
  }

  return {
    containersPool,
    busyQueue: busyQueue,
    async start () {
      await containersPool.start()
      containersPool.containers.forEach((c) => {
        c.numberOfRequests = 0
        c.numberOfRestarts = 0
      })
    },
    close () {
      return containersPool.remove()
    },
    allocate,
    recycle,
    release,
    onRecycle (fn) {
      onRecycle = fn
    }
  }
}
