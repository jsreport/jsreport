const { Readable } = require('stream')

function toStreams2Obj (s) {
  return toStreams2(s, { objectMode: true, highWaterMark: 16 })
}

function toStreams2Buf (s) {
  return toStreams2(s)
}

function toStreams2 (s, opts) {
  if (!s || typeof s === 'function' || s._readableState) return s

  const wrap = new Readable(opts).wrap(s)

  if (s.destroy) {
    wrap.destroy = s.destroy.bind(s)
  }

  return wrap
}

class MultiStream extends Readable {
  constructor (streams, opts) {
    super(opts)

    this.destroyed = false

    this._drained = false
    this._forwarding = false
    this._current = null
    this._toStreams2 = (opts && opts.objectMode) ? toStreams2Obj : toStreams2Buf

    this._autoEnd = opts != null && opts.autoEnd != null ? opts.autoEnd : true
    this._ended = false

    if (typeof streams === 'function') {
      this._queue = streams
    } else {
      this._queue = streams.map(this._toStreams2)
      this._queue.forEach(stream => {
        if (typeof stream !== 'function') this._attachErrorListener(stream)
      })
    }

    this._next()
  }

  _read () {
    this._drained = true
    this._forward()
  }

  _forward () {
    if (this._forwarding || !this._drained || !this._current) return
    this._forwarding = true

    let chunk

    while (this._drained) {
      chunk = this._current.read()

      if (chunk == null) {
        break
      }

      this._drained = this.push(chunk)
    }

    this._forwarding = false
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true

    if (this._current && this._current.destroy) this._current.destroy()
    if (typeof this._queue !== 'function') {
      this._queue.forEach(stream => {
        if (stream.destroy) stream.destroy()
      })
    }

    if (err) this.emit('error', err)
    this.emit('close')
  }

  _next () {
    // don't try to pull next stream if the current one have
    // not finished
    if (this._current != null) {
      return
    }

    this._current = null

    if (typeof this._queue === 'function') {
      this._queue((err, stream) => {
        if (err) return this.destroy(err)
        stream = this._toStreams2(stream)
        this._attachErrorListener(stream)
        this._gotNextStream(stream)
      })
    } else {
      let stream = this._queue.shift()

      if (typeof stream === 'function') {
        stream = this._toStreams2(stream())
        this._attachErrorListener(stream)
      }

      if (!stream && !this._autoEnd) {
        return
      }

      this._gotNextStream(stream)
    }
  }

  _gotNextStream (stream) {
    if (!stream && this._autoEnd === true) {
      this.push(null)
      this.destroy()
      return
    }

    this._current = stream
    this._forward()

    const onReadable = () => {
      this._forward()
    }

    const onClose = () => {
      if (!stream._readableState.ended) {
        this.destroy()
      }
    }

    const onEnd = () => {
      this._current = null
      stream.removeListener('readable', onReadable)
      stream.removeListener('end', onEnd)
      stream.removeListener('close', onClose)
      this._next()
    }

    stream.on('readable', onReadable)
    stream.once('end', onEnd)
    stream.once('close', onClose)
  }

  _attachErrorListener (stream) {
    if (!stream) return

    const onError = (err) => {
      stream.removeListener('error', onError)
      this.destroy(err)
    }

    stream.once('error', onError)
  }
}

MultiStream.obj = streams => (
  new MultiStream(streams, { objectMode: true, highWaterMark: 16 })
)

module.exports = MultiStream
