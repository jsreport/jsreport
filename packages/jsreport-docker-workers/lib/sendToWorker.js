const axios = require('axios')
const serializator = require('serializator')
const { setTimeout } = require('timers/promises')

module.exports = (reporter, { originUrl, reportTimeoutMargin, remote = false } = {}) => {
  return function sendToWorker (url, data, _options = {}) {
    const options = { ..._options }

    const customHttpOptions = reporter.dockerManager.getWorkerHttpOptions({ remote })

    const newHttpOptions = {
      ...options.httpOptions,
      ...customHttpOptions,
      headers: Object.assign({}, options.httpOptions?.headers, customHttpOptions?.headers)
    }

    if (originUrl != null) {
      options.originUrl = originUrl
    }

    options.httpOptions = newHttpOptions

    if (options.timeout != null && reportTimeoutMargin != null) {
      options.timeout = options.timeout + reportTimeoutMargin
    }

    return _sendToWorker(url, data, options)
  }
}

async function _sendToWorker (url, _data, { executeMain, timeout, originUrl, systemAction, httpOptions = {}, signal }) {
  let data = { ..._data, timeout, systemAction }

  if (originUrl != null) {
    data.originUrl = originUrl
  }

  let isDone = false

  async function run () {
    while (true && !isDone) {
      if (signal?.aborted) {
        const e = new Error('Worker aborted')
        e.code = 'WORKER_ABORTED'
        throw e
      }
      const stringBody = serializator.serialize(data)
      let res

      try {
        const requestConfig = {
          method: 'POST',
          url,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          responseType: 'text',
          transformResponse: [data => data],
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(stringBody),
            ...httpOptions.headers
          },
          data: stringBody,
          timeout: timeout
        }

        if (httpOptions.auth) {
          requestConfig.auth = httpOptions.auth
        }

        res = await axios(requestConfig)
      } catch (err) {
        if (isDone) {
          return
        }
        isDone = true
        if (!err.response?.data) {
          const error = new Error('Error when communicating with worker: ' + err.message)
          error.needRestart = true
          throw error
        }

        let workerError = null
        try {
          const errorData = JSON.parse(err.response.data)
          workerError = new Error(errorData.message)
          Object.assign(workerError, errorData)
        } catch (e) {
          const error = new Error('Error when communicating with worker: ' + err.response.data)
          error.needRestart = true
          throw error
        }

        throw workerError
      }

      if (isDone) {
        return
      }

      if (res.status === 201) {
        isDone = true
        return serializator.parse(res.data)
      }

      if (res.status !== 200) {
        isDone = true
        const e = new Error('Unexpected response from worker: ' + res.data)
        e.needRestart = true
        throw e
      }

      let mainDataResponse = {}

      try {
        mainDataResponse = await executeMain(serializator.parse(res.data))
      } catch (err) {
        mainDataResponse.error = {
          ...err,
          message: err.message,
          stack: err.stack
        }
      }

      data = {
        systemAction: 'callback-response',
        // we need just the request identification in the worker
        req: { context: { rootId: data.req.context.rootId } },
        data: mainDataResponse
      }
    }
  }

  let timeoutController

  if (timeout) {
    // eslint-disable-next-line
    timeoutController = new AbortController()
  }

  if (!timeout) {
    return run()
  }

  // we handle the timeout using promises to avoid loosing stack in case of error
  // mixing new Promise with async await leads to loosing it. we ensure that when run ends
  // we clean the timeout to avoid keeping handlers in memory longer than needed and allow
  // the node.js process to not have the timeout process pending
  return Promise.race([
    run().then((result) => {
      timeoutController?.abort()
      return result
    }, (err) => {
      timeoutController?.abort()
      throw err
    }),
    setTimeout(timeout, undefined, { signal: timeoutController.signal }).then(() => {
      isDone = true
      const e = new Error('Timeout when communicating with worker')
      e.needRestart = true
      throw e
    })
  ])
}
