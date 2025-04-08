module.exports = ({
  createWorker,
  numberOfWorkers,
  initTimeout
}) => {
  return {
    init () {
      this.workers = []
      this.tasksQueue = []
      this._pendingInitializedWorkersToEventualyCleanup = []

      const workersCreateFn = []

      for (let i = 0; i < numberOfWorkers; i++) {
        workersCreateFn.push(async () => {
          const worker = createWorker(i)
          await worker.init()
          this.workers.push(worker)
        })
      }
      return Promise.all(workersCreateFn.map(fn => fn()))
    },

    async close () {
      for (const w of this.workers) {
        await w.close()
      }
    },

    async allocate (data, opts) {
      const notBusyWorkers = this.workers.filter(w => w.isBusy !== true)

      const worker = notBusyWorkers.sort((a, b) => {
        if (a.lastUsed == null) {
          return -1
        }
        if (b.lastUsed == null) {
          return 1
        }
        return a.lastUsed <= b.lastUsed ? -1 : 1
      })[0]

      if (worker) {
        worker.isBusy = true
        worker.lastUsed = new Date()
        return {
          release: async () => {
            if (worker.needRestart || worker.running) {
              this.workers = this.workers.filter(w => w !== worker)
              worker.close()
              const newWorker = createWorker(this.workers.length)
              newWorker.isBusy = true
              this.workers.push(newWorker)
              await newWorker.init({ timeout: initTimeout })
              newWorker.isBusy = false
            } else {
              worker.isBusy = false
            }
            this._flushTasksQueue()
          },

          execute: async (userData, options = {}) => {
            try {
              worker.running = true
              return await worker.execute(userData, options)
            } catch (e) {
              if (e.code === 'WORKER_TIMEOUT' && options.timeoutErrorMessage) {
                e.message = options.timeoutErrorMessage
              }

              if (e.code === 'WORKER_TIMEOUT' || e.code === 'WORKER_CRASHED') {
                worker.needRestart = true
              }
              throw e
            } finally {
              worker.running = false
            }
          }
        }
      }

      let timeoutId

      return new Promise((resolve, reject) => {
        const task = { resolve, reject }
        this.tasksQueue.push(task)
        if (opts && opts.timeout) {
          timeoutId = setTimeout(() => {
            const taskIndex = this.tasksQueue.indexOf(task)
            if (taskIndex !== -1) {
              this.tasksQueue.splice(taskIndex, 1)
              task.reject(new Error('Timeout when waiting for worker'))
            }
          }, opts.timeout).unref()
        }
      }).finally(() => {
        if (timeoutId != null) {
          clearTimeout(timeoutId)
        }
      })
    },

    _flushTasksQueue () {
      if (this.tasksQueue.length === 0) {
        return
      }

      const task = this.tasksQueue.shift()
      this.allocate().then(task.resolve).catch(task.reject)
    }
  }
}
