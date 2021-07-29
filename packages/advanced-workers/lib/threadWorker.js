const serializator = require('serializator')

function asyncAwaiter (id) {
  const awaiter = {
    isResolved: false
  }
  awaiter.promise = new Promise((resolve, reject) => {
    awaiter.resolve = (v) => {
      awaiter.isSettled = true
      resolve(v)
    }
    awaiter.reject = (e) => {
      awaiter.isSettled = true
      reject(e)
    }
  })
  return awaiter
}

module.exports = ({
  worker,
  generalTimeout,
  closeTimeout = 5000,
  initTimeout = 15000
}) => {
  let currentAsyncAwaiter

  worker.on('message', (m) => {
    currentAsyncAwaiter.resolve(m)
  })

  function postAndWait (m, { executeMain, timeout }) {
    worker.ref()
    // eslint-disable-next-line
    return new Promise(async (resolve, reject) => {
      let isDone = false
      if (timeout) {
        setTimeout(() => {
          if (!isDone) {
            isDone = true
            const e = new Error(`Timeout occurred when waiting for the worker${m.systemAction != null ? ` action "${m.systemAction}"` : ''}`)
            e.code = 'WORKER_TIMEOUT'
            worker.unref()
            reject(e)
          }
        }, timeout).unref()
      }

      while (!isDone) {
        currentAsyncAwaiter = asyncAwaiter()
        worker.postMessage(m)
        const workerResponse = await currentAsyncAwaiter.promise

        if (workerResponse.workerCrashed) {
          isDone = true
          worker.unref()
          return reject(workerResponse.err)
        }

        if (isDone) {
          return
        }

        if (workerResponse.type === 'response') {
          isDone = true
          if (workerResponse.errorData) {
            const error = new Error(workerResponse.errorData.message)
            error.stack = workerResponse.errorData.stack
            Object.assign(error, workerResponse.errorData)
            worker.unref()
            return reject(error)
          }
          worker.unref()
          return resolve(workerResponse.userData)
        }

        if (workerResponse.type === 'callback') {
          try {
            const callbackResponse = await executeMain(serializator.parse(workerResponse.userData))
            m = {
              systemAction: 'callback-response',
              userData: callbackResponse
            }
          } catch (e) {
            m = {
              systemAction: 'callback-response',
              errorData: {
                message: e.message,
                stack: e.stack,
                ...e
              }
            }
          }
        }
      }
    })
  }

  let closingAwaiter
  let exited = false
  worker.on('exit', (exitCode) => {
    exited = true
    if (closingAwaiter && !closingAwaiter.isSettled) {
      closingAwaiter.resolve()
    }
    worker.unref()
  })

  worker.on('error', (err) => {
    err.code = 'WORKER_CRASHED'
    currentAsyncAwaiter.resolve({
      workerCrashed: true,
      err
    })
    worker.unref()
  })

  worker.unref()

  return {
    init: () => {
      return postAndWait({
        systemAction: 'init'
      }, { timeout: initTimeout })
    },
    execute: (userData, { executeMain, timeout }) => {
      return postAndWait({
        systemAction: 'execute',
        userData
      }, { executeMain, timeout })
    },
    close: () => {
      if (exited) {
        return
      }

      if (currentAsyncAwaiter && !currentAsyncAwaiter.isSettled) {
        const err = new Error('Worker aborted')
        err.code = 'WORKER_ABORTED'
        currentAsyncAwaiter.resolve({
          workerCrashed: true,
          err
        })
        worker.unref()
      }

      setTimeout(() => {
        if (!exited && !closingAwaiter.isSettled) {
          worker.terminate()
          closingAwaiter.resolve()
          worker.unref()
        }
      }, closeTimeout).unref()

      closingAwaiter = asyncAwaiter()
      worker.ref()
      worker.postMessage({
        systemAction: 'close'
      })
      return closingAwaiter.promise
    }
  }
}
