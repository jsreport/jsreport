const { parentPort, workerData } = require('worker_threads')
const callbackQueue = require('./callbacksQueue')()
const convertUint8ArrayToBuffer = require('./convertUint8ArrayToBuffer')
const serializator = require('@jsreport/serializator')

function asyncAwaiter () {
  const awaiter = {}
  awaiter.promise = new Promise((resolve, reject) => {
    awaiter.resolve = resolve
    awaiter.reject = reject
  })
  return awaiter
}

let currentCallbackResponseAwaiter

const workerModule = require(workerData.systemData.workerModule)(workerData.userData, {
  convertUint8ArrayToBuffer,
  executeMain: (userData) => {
    if (processing === false) {
      return
    }
    return callbackQueue.push(() => {
      currentCallbackResponseAwaiter = asyncAwaiter()
      parentPort.postMessage({
        type: 'callback',
        userData: serializator.serialize(userData)
      })
      return currentCallbackResponseAwaiter.promise
    })
  },
  workerId: workerData.systemData.workerId
})

let processing = false
async function processAndResponse (m, fn) {
  processing = true
  let message
  try {
    message = {
      type: 'response',
      userData: await fn(m)
    }
  } catch (e) {
    message = {
      type: 'response',
      errorData: {
        message: e.message,
        stack: e.stack,
        ...e
      }
    }
  }
  processing = false

  try {
    await callbackQueue.waitForAllSettled()
  } catch (e) {
    // skip failures on pending callbacks
  }

  try {
    parentPort.postMessage(message)
  } catch (e) {
    // the errors are tricky and may contain un-serializable props, we should probably omit these somehow but still keep ours
    if (message.errorData) {
      parentPort.postMessage({
        type: 'response',
        errorData: {
          message: message.errorData.message,
          stack: message.errorData.stack
        }
      })
    } else {
      parentPort.postMessage({
        type: 'response',
        errorData: {
          message: e.message,
          stack: e.stack,
          ...e
        }
      })
    }
  }
}

function init () {
  return workerModule.init()
}

function execute (m) {
  return workerModule.execute(m.userData)
}

parentPort.on('message', (m) => {
  if (m.systemAction === 'init') {
    return processAndResponse(m, init)
  }
  if (m.systemAction === 'close') {
    const closePromise = typeof workerModule.close === 'function' ? workerModule.close() : Promise.resolve()

    closePromise
      .finally(() => {
        // it seems it is important to exit on next tick
        // otherwise the node.js crash with FATAL ERROR
        // on some cases
        process.nextTick(() => {
          process.exit()
        })
      })
  }
  if (m.systemAction === 'execute') {
    return processAndResponse(m, execute)
  }
  if (m.systemAction === 'callback-response') {
    if (!m.errorData) {
      currentCallbackResponseAwaiter.resolve(m.userData)
      // cleanup to avoid a hanging promise
      currentCallbackResponseAwaiter = null
    } else {
      const error = new Error(m.errorData.message)
      error.stack = m.errorData.stack
      Object.assign(error, m.errorData)
      currentCallbackResponseAwaiter.reject(error)
      // cleanup to avoid a hanging promise
      currentCallbackResponseAwaiter = null
    }
  }
})
