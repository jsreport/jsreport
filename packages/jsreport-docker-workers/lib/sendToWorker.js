const axios = require('axios')
const serializator = require('serializator')

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

async function _sendToWorker (url, _data, { executeMain, timeout, originUrl, systemAction, httpOptions = {} }) {
  let data = { ..._data, timeout, systemAction }

  if (originUrl != null) {
    data.originUrl = originUrl
  }

  return new Promise((resolve, reject) => {
    let isDone = false

    if (timeout) {
      setTimeout(() => {
        if (isDone) {
          return
        }

        isDone = true
        reject(new Error('Timeout when communicating with worker'))
      }, timeout)
    }

    ;(async () => {
      while (true && !isDone) {
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
          isDone = true
          if (!err.response?.data) {
            const error = new Error('Error when communicating with worker: ' + err.message)
            Object.assign(error, { ...err })
            return reject(error)
          }

          try {
            const errorData = JSON.parse(err.response.data)
            const workerError = new Error(errorData.message)
            Object.assign(workerError, errorData)
            return reject(workerError)
          } catch (e) {
            const error = new Error('Error when communicating with worker: ' + err.response.data)
            Object.assign(error, { ...e })
            return reject(error)
          }
        }

        if (res.status === 201) {
          isDone = true
          return resolve(serializator.parse(res.data))
        }

        if (res.status !== 200) {
          isDone = true
          return reject(new Error('Unexpected response from worker: ' + res.data))
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
    })().catch((e) => {
      isDone = true
      reject(e)
    })
  })
}
