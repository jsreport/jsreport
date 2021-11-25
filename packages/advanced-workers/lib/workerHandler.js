const { parentPort, workerData } = require('worker_threads')
const callbackQueue = require('./callbacksQueue')()
const convertUint8ArrayToBuffer = require('./convertUint8ArrayToBuffer')
const serializator = require('serializator')
// eslint-disable-next-line
const domain = require('domain')

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
  }
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
    // the errors are tricky and may contain unserializable props, we should probably omit these somehow but still keep ours
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
  return runInDomain(() => workerModule.execute(m.userData))
}

parentPort.on('message', (m) => {
  if (m.systemAction === 'init') {
    return processAndResponse(m, init)
  }
  if (m.systemAction === 'close') {
    workerModule.close()
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
    } else {
      const error = new Error(m.errorData.message)
      error.stack = m.errorData.stack
      Object.assign(error, m.errorData)
      currentCallbackResponseAwaiter.reject(error)
    }
  }
})

async function runInDomain (fn) {
  // NOTE: we're using domains here intentionally,
  // we have tried to avoid its usage but unfortunately there is no other way to
  // ensure that we are handling all kind of errors that can occur in an external script,
  // but everything is ok because node.js will only remove domains when they found an alternative
  // and when that time comes, we just need to migrate to that alternative.
  const d = domain.create()

  return new Promise((resolve, reject) => {
    d.on('error', (err) => {
      reject(err)
    })

    d.run(async () => {
      try {
        const r = await fn()
        resolve(r)
      } catch (e) {
        reject(e)
      }
    })
  })
}
