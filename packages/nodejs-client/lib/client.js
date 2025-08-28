/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * nodejs client for remote jsreport server
 * able to render reports or do crud using jaydata context.
 */

const path = require('path')
const concat = require('concat-stream')
const { PassThrough, Readable } = require('stream')

class Client {
  constructor (url, username, password) {
    this.url = url
    this.username = username
    this.password = password
  }

  /**
     * Render report in remote server and return response
     * @returns object containing header property with response headers and body property with response body
     */
  async render (req, options = {}) {
    const rootUrl = this.url
    const username = this.username
    const password = this.password

    const baseUrl = new URL(rootUrl)
    const urlToFetch = new URL(path.posix.join(baseUrl.pathname, 'api/report'), baseUrl).toString()

    const headers = Object.assign({
      'Content-Type': 'application/json'
    }, options.headers)

    if (username && !headers.Authorization) {
      headers.Authorization = 'Basic ' + Buffer.from(`${username}:${password || ''}`).toString('base64')
    }

    const controller = new AbortController()
    const { timeout } = options
    let timeoutId
    if (typeof timeout === 'number') {
      timeoutId = setTimeout(() => controller.abort(), timeout)
    }

    let res

    try {
      res = await fetch(urlToFetch, {
        method: (options.method || 'post').toUpperCase(), headers, body: JSON.stringify(req), signal: controller.signal
      })
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)

      const error = new Error('Error while executing request to remote server')
      const errorProps = { ...err }

      Object.assign(error, errorProps)

      addStack(error, err.stack, {
        stackPrefix: 'Request Error stack: '
      })

      error.message = `${error.message}. ${err.message}`

      throw error
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }

    // axios used to reject on non-2xx; here we emulate the old behavior (specifically 200 OK)
    if (res.status !== 200) {
      let bodyText = ''
      try {
        bodyText = await res.text()
      } catch (e) {
        // ignore body read errors
      }

      let error

      try {
        const errorMessage = JSON.parse(bodyText)
        error = new Error(errorMessage.message)

        addStack(error, errorMessage.stack, {
          stripMessage: true, stackPrefix: 'Remote stack: '
        })

        error.remoteStack = errorMessage.stack
      } catch (e) {
        error = new Error(`Error while executing request to remote server: Unknown error, status code ${res.status}`)

        addStack(error, e.stack, {
          stackPrefix: 'Parsing Error stack: '
        })

        error.response = {
          status: res.status, statusCode: res.status, headers: Object.fromEntries(res.headers.entries())
        }
      }

      throw error
    }

    // convert Fetch's Web ReadableStream to a Node stream
    const responseStream = res.body ? Readable.fromWeb(res.body) : Readable.from([])

    // when working with streams and promises we should be extra-careful,
    // promises resolves in next ticks so there is a chance that a stream
    // can loose some data because consumer does not took the chance to process
    // the data when it was ready.
    // to solve this we create a transform stream that starts paused (any stream starts paused)
    // and flow the data from response to it, since the stream is paused it won't loose data
    // and will start emiting it when consumer calls `.body()` or any other stream method like `.pipe`
    const newResponseStream = new PassThrough()

    // attach response-like metadata so callers depending on it keep working
    newResponseStream.statusCode = res.status
    newResponseStream.headers = Object.fromEntries(res.headers.entries())
    newResponseStream.body = () => responseToBuffer(newResponseStream)

    responseStream.pipe(newResponseStream)

    return newResponseStream
  }
}

module.exports = function (url, username, password) {
  return new Client(url, username, password)
}

function responseToBuffer (response, cb) {
  if (cb) {
    return extractDataFromResponse(response, cb)
  }

  return new Promise((resolve, reject) => {
    extractDataFromResponse(response, (err, data) => {
      if (err) {
        return reject(err)
      }

      resolve(data)
    })
  })
}

function extractDataFromResponse (response, cb) {
  const writeStream = concat((data) => cb(null, data))

  response.on('error', (err) => cb(err))
  response.pipe(writeStream)
}

function addStack (err, stack, { stackPrefix = '', stripMessage = false } = {}) {
  if (stack != null && stack !== '') {
    let newStack = stack
    let originalStack = ''

    if (err.stack != null && err.stack !== '') {
      originalStack = `${err.stack}\n`
    }

    if (stripMessage) {
      // to avoid duplicating message we strip the message
      // from the stack if it is equals to the message of error
      newStack = newStack.replace(/(\S+:) (.+)(\r?\n)/, (match, gLabel, gMessage, gRest) => {
        if (err.message === gMessage) {
          return `${gLabel}${gRest}`
        }

        return match
      })
    }

    err.stack = `${originalStack}${stackPrefix}${newStack}`
  }
}
