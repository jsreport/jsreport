const path = require('path')
const { Readable } = require('stream')
const mime = require('mime-types')
const MultiStream = require('./multistream')

const LINE_BREAK = '\r\n'
const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

class FormData extends MultiStream {
  constructor (options = {}) {
    let factoryCallback

    const factory = (cb) => {
      if (!factoryCallback) {
        factoryCallback = cb
      } else {
        this._multiStreamFactoryCallback = cb
      }
    }

    super(factory, { ...options, autoEnd: false })

    this._fields = []
    this._queue = []
    this._ended = false
    this._multiStreamFactoryCallback = factoryCallback
  }

  getDefaultContentType () {
    return `multipart/mixed; boundary=${this.getBoundary()}`
  }

  getBoundary () {
    if (!this._boundary) {
      this._boundary = generateBoundary()
    }

    return this._boundary
  }

  setBoundary (boundary) {
    this._boundary = boundary
  }

  append (field, value, options = {}) {
    if (this._ended) {
      return
    }

    // allow filename as single option
    if (typeof options === 'string') {
      options = { filename: options }
    }

    // all that streamy business can't handle numbers
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'undefined' ||
      value === null
    ) {
      value = '' + value
    }

    if (Array.isArray(value)) {
      // Please convert your array into string
      // the way web server expects it
      this._emitError(new Error('Arrays are not supported.'))
      return
    }

    if (typeof value === 'string' || Buffer.isBuffer(value)) {
      options.contentLength = new TextEncoder().encode(value).length
    }

    if (this._queue.length === 0) {
      // if the queue was empty we queue a flush, so we can flush the new items appended here
      this._nextFlushTimerRef = setImmediate(() => {
        this._flushQueue()
      })
    }

    if (this._fields.length === 0) {
      this._addToReadableQueue(FormData.LINE_BREAK)
    }

    this._fields.push(field)

    const header = this._multiPartHeader(field, value, options)
    const footer = this._multiPartFooter()

    this._addToReadableQueue(header)
    this._addToReadableQueue(value)
    this._addToReadableQueue(footer)
  }

  end () {
    // add the last boundary
    this._ended = true
    this._addToReadableQueue(this._lastBoundary())

    // if a flush was queued, cancel it, because we want the bellow flush to be the last
    clearImmediate(this._nextFlushTimerRef)

    this._flushQueue(() => {
      this.push(null)
      this.destroy()
    })
  }

  toString () {
    return '[object FormData]'
  }

  _multiPartHeader (field, value, options) {
    // custom header specified (as string)?
    // it becomes responsible for boundary
    // (e.g. to handle extra CRLFs on .NET servers)
    if (typeof options.header === 'string') {
      return options.header
    }

    const contentDisposition = getContentDisposition(value, options)
    const contentType = getContentType(value, options)

    let contents = ''

    const headers = {
      // add custom disposition as third element or keep it two elements if not
      'Content-Disposition': ['form-data', 'name="' + field + '"'].concat(contentDisposition || []),
      // if no content type. allow it to be empty array
      'Content-Type': [].concat(contentType || [])
    }

    if (options.contentLength != null) {
      headers['Content-Length'] = options.contentLength
    }

    // allow custom headers.
    if (typeof options.header === 'object') {
      populate(headers, options.header)
    }

    let header

    for (const prop in headers) {
      if (!Object.prototype.hasOwnProperty.call(headers, prop)) {
        continue
      }

      header = headers[prop]

      // skip nullish headers.
      if (header == null) {
        continue
      }

      // convert all headers to arrays.
      if (!Array.isArray(header)) {
        header = [header]
      }

      // add non-empty headers.
      if (header.length) {
        contents += prop + ': ' + header.join('; ') + FormData.LINE_BREAK
      }
    }

    return `--${this.getBoundary()}${FormData.LINE_BREAK}${contents}${FormData.LINE_BREAK}`
  }

  _multiPartFooter () {
    return FormData.LINE_BREAK
  }

  _lastBoundary () {
    return `--${this.getBoundary()}--${FormData.LINE_BREAK}`
  }

  _flushQueue (endCb) {
    // if there is stream still processing
    if (this._current != null) {
      // and the end signal has not been received
      // then we just skip this flush, the flushing will continue
      // and check as normal when the current stream finishes
      if (!this._ended) {
        return
      }

      // if the end signal has been received
      // then this should be the last flush,
      // so we schedule a new flush in the next timer tick
      // this will continue to be called until the current stream
      // processing ends
      this._current.once('end', () => {
        setImmediate(() => this._flushQueue(endCb))
      })

      return
    }

    const streams = []

    while (this._queue.length > 0) {
      const item = this._queue.shift()

      if (typeof item === 'function') {
        streams.push(item)
      } else {
        streams.push(() => {
          item.resume()
          return item
        })
      }
    }

    if (streams.length > 0) {
      const combined = new MultiStream(streams)

      combined.once('end', () => {
        if (endCb) {
          endCb()
        } else if (!this._ended) {
          // when the current stream ends, and the end signal has not been received
          // we queue a flush
          setImmediate(() => this._flushQueue())
        }
      })

      this._multiStreamFactoryCallback(null, combined)
    } else {
      if (endCb) {
        endCb()
      }
    }
  }

  _addToReadableQueue (value) {
    let stream

    if (typeof value === 'string' || Buffer.isBuffer(value)) {
      stream = Readable.from(typeof value === 'string' ? [value] : value, {
        objectMode: false
      })
    } else {
      stream = value
    }

    if (typeof value !== 'function') {
      stream.pause()
    }

    this._queue.push(stream)
  }

  _emitError (err) {
    if (!this._error) {
      this._error = err
      this.pause()
      this.emit('error', err)
    }
  }
}

FormData.LINE_BREAK = LINE_BREAK
FormData.DEFAULT_CONTENT_TYPE = DEFAULT_CONTENT_TYPE

module.exports = FormData

function populate (dst, src) {
  Object.keys(src).forEach((prop) => {
    dst[prop] = dst[prop] || src[prop]
  })

  return dst
}

function generateBoundary () {
  // This generates a 50 character boundary similar to those used by Firefox.
  // They are optimized for boyer-moore parsing.
  let boundary = '--------------------------'

  for (let i = 0; i < 24; i++) {
    boundary += Math.floor(Math.random() * 10).toString(16)
  }

  return boundary
}

function getContentDisposition (value, options) {
  let filename
  let contentDisposition

  if (typeof options.filepath === 'string') {
    // custom filepath for relative paths
    filename = path.normalize(options.filepath).replace(/\\/g, '/')
  } else if (options.filename || value.name || value.path) {
    // custom filename take precedence
    // formidable and the browser add a name property
    // fs- and request- streams have path property
    filename = path.basename(options.filename || value.name || value.path)
  } else if (value.readable && Object.prototype.hasOwnProperty.call(value, 'httpVersion')) {
    // or try http response
    filename = path.basename(value.client._httpMessage.path || '')
  }

  if (filename) {
    contentDisposition = `filename="${filename}"`
  }

  return contentDisposition
}

function getContentType (value, options) {
  // use custom content-type above all
  let contentType = options.contentType

  // or try `name` from formidable, browser
  if (!contentType && value.name) {
    contentType = mime.lookup(value.name)
  }

  // or try `path` from fs-, request- streams
  if (!contentType && value.path) {
    contentType = mime.lookup(value.path)
  }

  // or if it's http-response
  if (!contentType && value.readable && Object.prototype.hasOwnProperty.call(value, 'httpVersion')) {
    contentType = value.headers['content-type']
  }

  // or guess it from the filepath or filename
  if (!contentType && (options.filepath || options.filename)) {
    contentType = mime.lookup(options.filepath || options.filename)
  }

  // fallback to the default content type if `value` is not simple value
  if (!contentType && typeof value === 'object') {
    contentType = FormData.DEFAULT_CONTENT_TYPE
  }

  return contentType
}
