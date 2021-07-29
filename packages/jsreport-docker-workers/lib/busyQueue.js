
class BusyQueue {
  constructor ({ run, waitingTimeout, logger }) {
    this.run = run
    this.busyQueue = []
    this.logger = logger
    this.waitingTimeout = waitingTimeout
  }

  push (item, resolve, reject) {
    this.busyQueue.push({
      submittedOn: new Date().getTime(),
      item: item,
      resolve: resolve,
      reject: reject
    })
  }

  get length () {
    return this.busyQueue.length
  }

  flush () {
    this.logger.debug(`Busy queue is getting flush, total work: ${this.busyQueue.length}`)

    const item = this.busyQueue.shift()

    if (item) {
      if (item.submittedOn < (new Date().getTime() - this.waitingTimeout)) {
        this.logger.debug('Timeout when waiting for worker availability (busy queue)')

        item.reject(new Error('Timeout when waiting for worker availability (busy queue)'))

        return this.flush()
      }

      this.logger.debug(`Busy queue was flush, rest of work: ${this.busyQueue.length}`)

      this.run(item.item).then((res) => item.resolve(res)).catch(item.reject)
    }
  }
}

module.exports = ({ run, waitingTimeout, logger }) => new BusyQueue({ run, waitingTimeout, logger })
