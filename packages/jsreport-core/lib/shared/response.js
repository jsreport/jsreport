const extend = require('node.extend.without.arrays')
const fs = require('fs/promises')
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const path = require('path')

module.exports = (reporter, requestId, obj) => {
  class Response {
    constructor (requestId, obj) {
      this.output = new BufferOutput()
      this.meta = extend(true, {}, (obj || {}).meta)
      this.requestId = requestId
    }

    /** back compatibility methdos **/
    get content () {
      return this.output._getBufferSync()
    }

    set content (v) {
      this.output._setBufferSync(Buffer.from(v))
    }

    get stream () {
      return this.output.getStream()
    }
    /** //// back compatibility methdos **/

    async updateOutput (bufOrStreamOrPath) {
      if (Buffer.isBuffer(bufOrStreamOrPath)) {
        return this.output._setBuffer(bufOrStreamOrPath)
      }

      if (typeof bufOrStreamOrPath === 'string') {
        if (!path.isAbsolute(bufOrStreamOrPath)) {
          throw new Error('Invalid content passed to res.updateOutput, when content is string it must be an absolute path')
        }

        if (this.output instanceof BufferOutput) {
          this.output = new StreamOutput(this.requestId)
        }

        await reporter.copyFileToTempFile(bufOrStreamOrPath, this.output._filePath)
      }

      if (isReadableStream(bufOrStreamOrPath)) {
        if (this.output instanceof BufferOutput) {
          this.output = new StreamOutput(this.requestId)
        }

        return this.output._setStream(bufOrStreamOrPath)
      }
    }

    get isInStreamingMode () {
      return this.output instanceof StreamOutput
    }

    serialize () {
      return {
        meta: this.meta,
        output: this.output._serialize()
      }
    }

    async parseFrom (res) {
      Object.assign(this.meta, res.meta)
      if (res.output.type === 'buffer') {
        this.output = await BufferOutput._parse(res.output)
      } else {
        this.output = await StreamOutput._parse(this.requestId, res.output)
      }
    }

    get __isJsreportResponse__ () {
      return true
    }
  }

  class BufferOutput {
    constructor () {
      this._buffer = Buffer.from([])
    }

    getBuffer () {
      return this._buffer
    }

    writeToTempFile (tmpNameFn) {
      return reporter.writeTempFile(tmpNameFn, this._buffer)
    }

    getSize () {
      return this._buffer.length
    }

    getStream () {
      return Readable.from(this._buffer)
    }

    _serialize () {
      const sharedBuf = new SharedArrayBuffer(this._buffer.byteLength)
      const buf = Buffer.from(sharedBuf)

      this._buffer.copy(buf)

      return {
        type: 'buffer',
        content: buf
      }
    }

    static _parse (output) {
      const instance = new BufferOutput()
      if (output?.content?.length) {
        instance._setBufferSync(Buffer.from(output?.content))
      }
      return instance
    }

    _getBufferSync () {
      return this._buffer
    }

    _setBufferSync (buf) {
      this._buffer = buf
    }

    _setBuffer (buf) {
      this._buffer = buf
    }
  }

  class StreamOutput {
    constructor (requestId) {
      this._filename = `response-${requestId}.raw-content`
      const { pathToFile } = reporter.getTempFilePath(this._filename)
      this._filePath = pathToFile
    }

    async getBuffer () {
      const { content } = await reporter.readTempFile(this._filename)
      return content
    }

    async getSize () {
      const stat = await fs.stat(this._filePath)

      return stat.size
    }

    async getStream () {
      const filename = this._filename

      async function * generateResponseContent () {
        const responseFileStream = reporter.readTempFileStream(filename).stream

        for await (const chunk of responseFileStream) {
          yield chunk
        }
      }

      return Readable.from(generateResponseContent())
    }

    writeToTempFile (tmpNameFn) {
      return reporter.copyFileToTempFile(this._filePath, tmpNameFn)
    }

    static async _parse (requestId, output) {
      const instance = new StreamOutput(requestId)

      if (output.filePath !== instance._filePath) {
        await reporter.copyFileToTempFile(output.filePath, instance._filePath)
      }
      return instance
    }

    _getBufferSync () {
      const { content } = reporter.readTempFileSync(this._filename)
      return content
    }

    _setBufferSync (buf) {
      reporter.writeTempFileSync(this._filename, buf)
    }

    _setBuffer (buf) {
      return reporter.writeTempFile(this._filename, buf)
    }

    _serialize () {
      return {
        type: 'stream',
        filePath: this._filePath
      }
    }

    async _setStream (stream) {
      const { stream: responseFileStream } = await reporter.writeTempFileStream(this._filename)
      await pipeline(stream, responseFileStream)
    }
  }

  return new Response(requestId, obj)
}

// from https://github.com/sindresorhus/is-stream/blob/main/index.js
function isReadableStream (stream) {
  return (
    stream !== null &&
    typeof stream === 'object' &&
    typeof stream.pipe === 'function' &&
    stream.readable !== false && typeof stream._read === 'function' &&
    typeof stream._readableState === 'object'
  )
}
