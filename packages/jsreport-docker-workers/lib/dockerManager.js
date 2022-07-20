const createContainersManager = require('./containersManager')
const createServersChecker = require('./serversChecker')
const Allocate = require('./allocate')
const ip = require('ip')

module.exports = (reporter, {
  discriminatorPath,
  containerParallelRequestsLimit,
  pingServersInterval,
  pingHealthyInterval,
  container,
  subnet,
  network,
  reportTimeoutMargin,
  busyQueueWaitingTimeout,
  numberOfWorkers,
  customContainersPoolFactory
}, workerOptions, workerSystemOptions) => {
  reporter.options.ip = reporter.options.ip || ip.address()

  const serversChecker = createServersChecker(reporter, {
    ip: reporter.options.ip,
    stack: reporter.options.stack,
    pingInterval: pingServersInterval,
    healthyInterval: pingHealthyInterval
  })

  const containersManager = createContainersManager({
    hostIp: reporter.options.ip,
    network,
    subnet,
    numberOfWorkers,
    container,
    busyQueueWaitingTimeout,
    logger: reporter.logger,
    tempDirectory: reporter.options.tempDirectory,
    containerParallelRequestsLimit,
    customContainersPoolFactory,
    initData: {
      workerOptions,
      workerSystemOptions
    }
  })

  const allocate = Allocate({
    reporter,
    containersManager,
    ip: reporter.options.ip,
    stack: reporter.options.stack,
    serversChecker,
    discriminatorPath,
    reportTimeoutMargin
  })

  function onSIGTERM () {
    reporter.logger.debug(`Quiting worker, unsetting tenants with in worker ${reporter.options.ip} ${reporter.options.stack}`)

    function exit () {
      process.exit()
    }

    reporter.documentStore.internalCollection('tenantWorkers').remove({
      ip: reporter.options.ip,
      stack: reporter.options.stack
    }).then(exit, exit)
  }

  process.on('SIGTERM', onSIGTERM)

  return {
    serversChecker,
    containersManager,
    allocate,
    convertUint8ArrayToBuffer: () => {},
    async init () {
      await serversChecker.startPingInterval()
      await serversChecker.startStatusInterval()
      await containersManager.start()
      reporter.logger.debug('docker manager initialized correctly')
    },
    async close () {
      try {
        process.removeListener('SIGTERM', onSIGTERM)
        serversChecker.stopPingInterval()
        serversChecker.stopStatusInterval()
        await containersManager.close()
      } catch (e) {
        reporter.logger.error(`Error while trying to remove containers: ${e.message}`)
      }
    },
    workerOptions,
    workerSystemOptions
  }
}
