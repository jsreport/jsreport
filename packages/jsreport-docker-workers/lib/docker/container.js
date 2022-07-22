const util = require('util')
const axios = require('axios')
const execAsync = util.promisify(require('child_process').exec)
const serializator = require('serializator')

module.exports = class Container {
  constructor ({
    hostIp,
    id,
    idx,
    port,
    debugPort,
    network,
    logger,
    container,
    tempDirectory,
    initData
  }) {
    this.initData = initData
    this.debuggingSession = container.debuggingSession
    this.port = port
    this.debugPort = debugPort
    this.image = container.image
    this.exposedPort = container.exposedPort
    this.customEnv = container.customEnv
    this.network = network
    this.startTimeout = container.startTimeout
    this.restartPolicy = container.restartPolicy
    this.id = id
    this.idx = idx
    this.logger = logger
    this.memory = container.memory
    this.memorySwap = container.memorySwap
    this.cpus = container.cpus
    this.logDriver = container.logDriver
    this.logOpt = container.logOpt || { 'max-size': '1m', 'max-file': '10' }
    this.tempDirectory = tempDirectory

    this.url = `http://${hostIp}:${port}`
  }

  async start () {
    try {
      // if container exists we remove it first before try to start it
      await execAsync(`docker container inspect ${this.id}`)

      this.logger.debug(`docker container with name ${this.id} already exists, removing it`)

      await execAsync(`docker rm -f ${this.id}`)
    } catch (e) {}

    let runCMD = `docker run -d -p ${this.port}:${this.exposedPort}`

    if (this.debuggingSession) {
      runCMD += ` --expose 9229 -p ${this.debugPort}:9229`
    }

    // the .config .local .cache are needed for unoconv, I wasn't able to find different way to configure libre office to use different location for temps
    runCMD += ` --network=${this.network} --tmpfs=/tmp --tmpfs=/root/.npm --tmpfs=/root/.config --tmpfs=/root/.local --tmpfs=/root/.cache --name ${this.id} --read-only`

    runCMD += ` --memory="${this.memory}" --memory-swap="${this.memorySwap}" --cpus="${this.cpus}"`

    runCMD += ` --log-driver=${this.logDriver} `
    runCMD += Object.entries(this.logOpt).map(e => `--log-opt ${e[0]}=${e[1]}`).join(' ')

    if (this.customEnv) {
      for (const key in this.customEnv) {
        runCMD += ` --env ${key}="${this.customEnv[key]}"`
      }
    }

    if (this.debuggingSession) {
      runCMD += ' --env workerDebuggingSession=true'
    }

    runCMD += ` ${this.image}`

    if (this.debuggingSession) {
      this.logger.debug(`docker run cmd: ${runCMD} debug port: ${this.debugPort}`)
    } else {
      this.logger.debug(`docker run cmd: ${runCMD}`)
    }

    await execAsync(runCMD)

    await this.waitForPing()
    await this._init()
  }

  async waitForPing () {
    let finished = false
    const start = new Date().getTime()

    while (!finished) {
      try {
        await axios.get(this.url)
        finished = true
      } catch (e) {
        await new Promise((resolve) => {
          setTimeout(resolve, 50)
        })
      }

      if (start + this.startTimeout < new Date().getTime()) {
        throw new Error(`Unable to ping docker container ${this.id} (${this.url}) after ${this.startTimeout}ms`)
      }
    }
  }

  async restart () {
    if (this.restartPolicy === false) {
      this.logger.debug('Restarting docker container was skipped because container restart policy is set to false')
      return Promise.resolve(this)
    }

    this.logger.debug(`Restarting docker container ${this.id} (${this.url}) (in progress)`)

    try {
      await execAsync(`docker restart -t 0 ${this.id}`, {
        timeout: this.restartTimeout
      })

      await this.waitForPing()
      await this._init()
    } catch (e) {
      e.message = `Error while re-starting docker container ${this.id} (${this.url}). ${e.message}`
      throw e
    }
  }

  async remove () {
    try {
      await execAsync(`docker rm -f ${this.id}`)
    } catch (e) {
      this.logger.warn(`Remove docker container ${this.id} (${this.url}) failed.`, e)
    }
  }

  async _init () {
    const serializedData = serializator.serialize(this.initData)
    try {
      await axios({
        method: 'POST',
        url: this.url,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: 'text',
        transformResponse: [data => data],
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(serializedData)
        },
        data: serializedData
      })
    } catch (err) {
      if (!err.response?.data) {
        throw new Error('Error when initializing worker ' + err.message)
      }

      let jsonError = null
      try {
        jsonError = JSON.parse(err.response.data)
        const workerError = new Error(jsonError.message)
        workerError.stack = jsonError.stack
        throw workerError
      } catch (e) {
        throw new Error(`Error when initializing worker ${err.response.data}`)
      }
    }
  }
}
