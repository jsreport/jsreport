import superagent from 'superagent'
import parse from './parseJSON.js'
import resolveUrl from './resolveUrl'
import { values as configuration } from '../lib/configuration'

export const methods = ['get', 'post', 'put', 'patch', 'del']

const requestHandler = {}

const createError = (err, body) => {
  try {
    const parsed = JSON.parse(body)
    body = parsed
  } catch (e) {

  }

  if (body && body.error) {
    const e = new Error(body.error.message)

    Object.assign(e, body)

    if (body.error.stack) {
      e.stack = body.error.stack
    }

    return e
  }

  if (body && body.message) {
    const e = new Error(body.message)

    Object.assign(e, body)

    if (body.stack) {
      e.stack = body.stack
    }

    return e
  }

  if (body && typeof body === 'string') {
    return new Error(body.substring(0, 1000) + '...')
  }

  return err || new Error('API call failed')
}

methods.forEach((m) => {
  requestHandler[m] = (path, { params, headers, data, attach, parseJSON, responseType } = {}) => new Promise((resolve, reject) => {
    const request = superagent[m](resolveUrl(path))

    Object.keys(configuration.apiHeaders).forEach((k) => request.set(k, configuration.apiHeaders[k]))

    if (headers) {
      Object.keys(headers).forEach((k) => request.set(k, headers[k]))
    }

    request.set('X-Requested-With', 'XMLHttpRequest')
    request.set('X-WWW-Authenticate', 'none')
    request.set('Expires', '-1')
    request.set('Cache-Control', 'no-cache,no-store,must-revalidate,max-age=-1,private')

    if (params) {
      request.query(params)
    }

    if (responseType) {
      request.responseType(responseType)
    }

    if (attach) {
      request.attach(attach.filename, attach.file)
    }

    if (data) {
      request.send(data)
    }

    request.end((err, res) => {
      if (err) {
        return reject(createError(err, res ? res.text : null))
      }

      if (parseJSON === false) {
        return resolve(res.text)
      }

      if (responseType) {
        return resolve(res.xhr.response)
      }

      resolve(parse(res.text))
    })
  })
})

export default requestHandler

const stubHandler = {}
methods.forEach((m) => {
  stubHandler[m] = (stub) => (requestHandler[m] = stub)
})

export const stub = stubHandler
