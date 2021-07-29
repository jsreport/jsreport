
async function doPing (reporter, ip, stack) {
  return reporter.documentStore.internalCollection('servers').update({
    ip,
    stack
  }, {
    $set: {
      ip,
      ping: new Date(),
      stack
    }
  }, { upsert: true })
}

async function refreshServersCache (reporter, stack) {
  return reporter.documentStore.internalCollection('servers').find({ stack }).toArray()
}

module.exports = (reporter, { ip, stack, pingInterval, healthyInterval }) => {
  let cache = []
  let pingTimer
  let statusTimer

  return {
    healthyInterval,
    pingInterval,
    async startPingInterval () {
      pingTimer = setInterval(async () => {
        try {
          await doPing(reporter, ip, stack)
        } catch (e) {
          reporter.logger.error(`Error while doing ping (interval) to server ${ip} - ${stack}: ${e.message}`)
        }
      }, this.pingInterval)

      pingTimer.unref()

      try {
        await doPing(reporter, ip, stack)
      } catch (e) {
        reporter.logger.error(`Error at start ping to server ${ip} - ${stack}: ${e.message}`)
        throw e
      }
    },

    stopPingInterval () {
      if (pingTimer) {
        clearInterval(pingTimer)
      }
    },

    async startStatusInterval () {
      statusTimer = setInterval(async () => {
        try {
          cache = await refreshServersCache(reporter, stack)
        } catch (e) {
          reporter.logger.error(`Error while getting status (interval) of servers (${stack}): ${e.message}`)
        }
      }, this.pingInterval)

      statusTimer.unref()

      try {
        cache = await refreshServersCache(reporter, stack)
      } catch (e) {
        e.message += `Error at start of getting status of servers (${stack}): ${e.message}`
        throw e
      }
    },

    stopStatusInterval () {
      if (statusTimer) {
        clearInterval(statusTimer)
      }
    },

    async ping (workerIp, workerStack) {
      return doPing(reporter, workerIp, workerStack)
    },

    async refreshServersCache () {
      try {
        cache = await refreshServersCache(reporter, stack)
      } catch (e) {
        e.message += `Error when trying to refresh servers cache manually (${stack}): ${e.message}`
        throw e
      }
    },

    status (workerIp) {
      const server = cache.find((s) => s.ip === workerIp)

      return server && server.ping > new Date(Date.now() - this.healthyInterval)
    }
  }
}
