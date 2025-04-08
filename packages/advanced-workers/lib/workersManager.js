const { Worker } = require('worker_threads')
const path = require('path')
const ThreadWorker = require('./threadWorker')
const convertUint8ArrayToBuffer = require('./convertUint8ArrayToBuffer')
const pool = require('./pool')

module.exports = (userOptions, {
  workerModule,
  numberOfWorkers,
  resourceLimits,
  initTimeout
}) => {
  function createWorker (id) {
    const worker = new Worker(path.join(__dirname, 'workerHandler.js'), {
      workerData: {
        systemData: {
          workerModule,
          workerId: id
        },
        userData: userOptions
      },
      resourceLimits
    })

    return ThreadWorker({
      worker,
      initTimeout
    })
  }

  return {
    async init () {
      this.pool = pool({
        createWorker: (id) => createWorker(id),
        numberOfWorkers,
        initTimeout
      })
      return this.pool.init()
    },

    async allocate (data, opts) {
      return this.pool.allocate(data, opts)
    },

    close () {
      if (this.closed) {
        return
      }

      this.closed = true
      return this.pool.close()
    },

    convertUint8ArrayToBuffer
  }
}
