/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * nodejs client for remote jsreport server
 * able to render reports or do crud using jaydata context.
 */

const path = require('path')
const https = require('https')
const axios = require('axios')
const concat = require('concat-stream')
const mimicResponse = require('mimic-response')
const { PassThrough } = require('stream')

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

    const optionsToUse = Object.assign({
      method: 'post',
      url: new URL(path.posix.join(baseUrl.pathname, 'api/report'), baseUrl).toString(),
      data: JSON.stringify(req),
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      responseType: 'stream',
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    }, options)

    if (username) {
      optionsToUse.auth = {
        username,
        password
      }
    }

    let response

    try {
      response = await axios(optionsToUse)
    } catch (err) {
      if (err.response) {
        response = err.response
      } else {
        const error = new Error('Error while executing request to remote server')
        const errorProps = { ...err }

        Object.assign(error, errorProps)

        if (error.response) {
          error.response.statusCode = error.response.status
        }

        addStack(error, err.stack, {
          stackPrefix: 'Request Error stack: '
        })

        error.message = `${error.message}. ${err.message}`

        throw error
      }
    }

    const responseStream = response.data

    let bodyData

    response.statusCode = response.status

    if (response.status !== 200) {
      bodyData = await responseToBuffer(responseStream)
      let error

      try {
        const errorMessage = JSON.parse(bodyData.toString())
        error = new Error(errorMessage.message)

        addStack(error, errorMessage.stack, {
          stripMessage: true,
          stackPrefix: 'Remote stack: '
        })

        error.remoteStack = errorMessage.stack
      } catch (e) {
        error = new Error(`Error while executing request to remote server: Unknown error, status code ${response.status}`)

        addStack(error, e.stack, {
          stackPrefix: 'Parsing Error stack: '
        })

        error.response = response
      }

      throw error
    }

    // when working with streams and promises we should be extra-careful,
    // promises resolves in next ticks so there is a chance that a stream
    // can loose some data because consumer does not took the chance to process
    // the data when it was ready.
    // to solve this we create a transform stream that starts paused (any stream starts paused)
    // and flow the data from response to it, since the stream is paused it won't loose data
    // and will start emiting it when consumer calls `.body()` or any other stream method like `.pipe`
    const newResponseStream = new PassThrough()

    mimicResponse(responseStream, newResponseStream)

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
