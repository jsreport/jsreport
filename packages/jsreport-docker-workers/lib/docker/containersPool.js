const util = require('util')
const execAsync = util.promisify(require('child_process').exec)
const Container = require('./container')

module.exports = ({
  container,
  hostIp,
  network,
  subnet,
  numberOfWorkers,
  tempDirectory,
  logger,
  initData
}) => {
  const containers = []

  return {
    get containers () {
      return containers
    },

    async createNetworkForContainers () {
      logger.debug(`Preparing network ${network} with subnet ${subnet} for docker containers`)

      try {
        await execAsync(`docker network inspect ${network}`)
      } catch (e) {
        try {
          const networkCMD = `docker network create --driver bridge -o com.docker.network.bridge.enable_icc=false --subnet=${subnet} ${network}`

          logger.debug(`docker network cmd: ${networkCMD}`)

          await execAsync(networkCMD)
        } catch (e) {
          e.message = `Error while creating docker network ${network}: ${e.message}`
          throw e
        }
      }
    },

    async start () {
      await this.createNetworkForContainers()

      const operations = []

      for (let i = 0; i < numberOfWorkers; i++) {
        const c = new Container({
          container: container,
          hostIp,
          id: `${container.namePrefix}${i + 1}`,
          idx: i,
          port: container.basePublishPort + i,
          debugPort: container.baseDebugPort + i,
          network,
          logger,
          tempDirectory,
          initData
        })

        containers.push(c)

        logger.debug(`Starting new docker container ${c.id} (${c.url})`)

        operations.push(c.start())
      }

      try {
        await Promise.all(operations)
      } catch (e) {
        e.message = `Error while creating docker containers: ${e.message}`
        throw e
      }
    },

    async remove () {
      const operations = []

      containers.forEach((container) => {
        if (container.restartPromise) {
          operations.push(Promise.resolve(container.restartPromise).then(async () => {
            await execAsync(`docker rm -f ${container.id}`)
            logger.debug(`Removing container ${container.id} (${container.url})`)
          }))
        } else {
          operations.push(execAsync(`docker rm -f ${container.id}`).then(() => {
            logger.debug(`Removing container ${container.id} (${container.url})`)
          }))
        }
      })

      return Promise.all(operations)
    }
  }
}
