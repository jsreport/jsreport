const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const axios = require('axios')
const serializator = require('@jsreport/serializator')
const { setTimeout } = require('timers/promises')
const { parseMultipartStream } = require('@jsreport/multipart')

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
    
    options.timeoutWithMargin = options.timeout
    if (options.timeout != null && reportTimeoutMargin != null) {
      options.timeoutWithMargin = options.timeout + reportTimeoutMargin
    }    

    options.remote = remote
    options.reporter = reporter

    return _sendToWorker(url, data, options)
  }
}

async function _sendToWorker (url, _data, { executeMain, reporter, timeout, timeoutWithMargin, originUrl, containerId, systemAction, httpOptions = {}, remote, signal }) {  
  const sharedTempRewriteRootPathTo = reporter.options.extensions['docker-workers'].container.sharedTempRewriteRootPathTo

  let data = { ..._data, timeout, systemAction }

  if (originUrl != null) {
    data.originUrl = originUrl
  }

  let isDone = false

  const originalActionName = data.actionName

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
          responseType: 'stream',
          transformResponse: [data => data],
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(stringBody),
            ...httpOptions.headers
          },
          data: stringBody,
          timeout: timeoutWithMargin
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

        let errorResponseData
        try {
          errorResponseData = await readStringFromStream(err.response.data)
        } catch (e) {
          const error = new Error('Error when communicating with worker (unable to read error data): ' + err.message + '(' + e.message + ')')
          error.needRestart = true
          throw error
        }

        let workerError = null
        try {
          const errorData = JSON.parse(errorResponseData)
          workerError = new Error(errorData.message)
          Object.assign(workerError, errorData)
        } catch (e) {
          const error = new Error('Error when communicating with worker (unable to parse error data): ' + err.message + '(' + errorResponseData + ')')
          error.needRestart = true
          throw error
        }

        throw workerError
      }

      if (isDone) {
        return
      }

      let responseData

      try {
        if (remote && originalActionName === 'render') {
          // parsing response from the remote server and changing the output to what expects reporter.Response
          let parsedContentStream

          const { pathToFile: pathToTempFile, stream: tempOutputStream } = await reporter.writeTempFileStream((uuid) => `docker-workers-send-${uuid}`)

          await parseMultipartStream({
            contentType: res.headers['content-type'],
            stream: Readable.toWeb(res.data)
          }, (fileInfo) => {
            if (fileInfo.name === 'content') {
              parsedContentStream = fileInfo.rawData
            } else {
              const value = serializator.parse(new TextDecoder().decode(fileInfo.rawData))
              responseData = responseData || {}
              responseData[fileInfo.name] = value
            }
          }, { streamFiles: ['content'] })

          if (parsedContentStream) {
            await pipeline(Readable.fromWeb(parsedContentStream), tempOutputStream)
            responseData.output = { filePath: pathToTempFile, type: 'stream' }
          }
        } else {
          responseData = await readStringFromStream(res.data)
        }
      } catch (err) {
        const error = new Error('Error when communicating with worker (unable to read data): ' + err.message)
        error.needRestart = true
        throw error
      }

      if (res.status === 201) {
        isDone = true

        if (originalActionName === 'render') {
          if (remote) {
            // the responseData.output.filePath is already local file
            return responseData
          }

          const parsedResponseData = serializator.parse(responseData)
          if (parsedResponseData.output.type === 'stream') {
            // change from container path to the host path
            parsedResponseData.output.filePath = parsedResponseData.output.filePath.replace('/tmp/jsreport', `${sharedTempRewriteRootPathTo}/${containerId}/`)
          }

          return parsedResponseData
        }

        return serializator.parse(responseData)
      }

      if (res.status !== 200) {
        isDone = true
        const e = new Error('Unexpected response from worker: ' + responseData)
        e.needRestart = true
        throw e
      }

      let mainDataResponse = {}

      try {
        mainDataResponse = await executeMain(serializator.parse(responseData))
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

async function readStringFromStream (stream) {
  const bufs = []

  for await (const chunk of stream) {
    bufs.push(chunk)
  }

  return Buffer.concat(bufs).toString()
}
