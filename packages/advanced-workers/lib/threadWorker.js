const serializator = require('@jsreport/serializator')

function asyncAwaiter (id) {
  const awaiter = {}
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
  let closingWhenWaitingForMainExecution

  worker.on('message', (m) => {
    if (currentAsyncAwaiter) {
      currentAsyncAwaiter.resolve(m)
    }
  })

  function postAndWait (m, { executeMain, timeout }) {
    let timeoutId
    worker.ref()
    // eslint-disable-next-line
    return new Promise(async (resolve, reject) => {
      let isDone = false
      if (timeout) {
        timeoutId = setTimeout(() => {
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

            if (closingWhenWaitingForMainExecution) {
              const err = new Error('Worker aborted')
              err.code = 'WORKER_ABORTED'
              worker.unref()
              return reject(err)
            }

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
    }).finally(() => {
      if (timeoutId != null) {
        clearTimeout(timeoutId)
      }

      // we only clear the awaiter here for the cases in which
      // we are sure there is not work pending (timeouts, top level errors on worker),
      // for the rest we let other logic to run and clear the awaiter
      // at specific places
      if (currentAsyncAwaiter && currentAsyncAwaiter.isSettled) {
        // cleanup to avoid a hanging promise
        currentAsyncAwaiter = null
      }
    })
  }

  let closingAwaiter
  let closingTimeoutId
  let exited = false

  worker.on('exit', (exitCode) => {
    exited = true
    if (closingAwaiter && !closingAwaiter.isSettled) {
      closingAwaiter.resolve()
      // cleanup to avoid a hanging promise
      closingAwaiter = null
      clearTimeout(closingTimeoutId)
      closingTimeoutId = null
    } else {
      if (currentAsyncAwaiter && !currentAsyncAwaiter.isSettled) {
        const err = new Error('Worker unexpectedly exited')
        err.code = 'WORKER_CRASHED'
        currentAsyncAwaiter.resolve({
          workerCrashed: true,
          err
        })
        // cleanup to avoid a hanging promise
        currentAsyncAwaiter = null
      }
    }
    worker.unref()
  })

  worker.on('error', (err) => {
    if (!currentAsyncAwaiter) {
      console.log('Worker crashed after the response was processed.', err)
      return
    }

    err.code = 'WORKER_CRASHED'
    currentAsyncAwaiter.resolve({
      workerCrashed: true,
      err
    })
    // cleanup to avoid a hanging promise
    currentAsyncAwaiter = null
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
        // cleanup to avoid a hanging promise
        currentAsyncAwaiter = null
        worker.unref()
      } else {
        closingWhenWaitingForMainExecution = true
      }

      closingTimeoutId = setTimeout(() => {
        if (!exited && closingAwaiter && !closingAwaiter.isSettled) {
          worker.terminate()
          closingAwaiter.resolve()
          // cleanup to avoid a hanging promise
          closingAwaiter = null
          worker.unref()
        }

        closingTimeoutId = null
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
