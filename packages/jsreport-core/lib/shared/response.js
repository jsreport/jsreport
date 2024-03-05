const extend = require('node.extend.without.arrays')
const fs = require('fs/promises')
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')

module.exports = (reporter, requestId, obj) => {
  class Response {
    constructor (requestId, obj) {
      this.output = new BufferOutput()
      this.meta = extend(true, {}, (obj || {}).meta)
      this.requestId = requestId
    }

    /** back compatibility methdos **/
    get content () {
      return this.output.getBufferSync()
    }

    set content (v) {
      this.output.setBufferSync(Buffer.from(v))
    }

    get stream () {
      return this.output.getStream()
    }
    /** //// back compatibility methdos **/

    async switchToStream (stream) {
      this.output = new StreamOutput(this.requestId)
      await this.output.setStream(stream)
    }

    get isInStreamingMode () {
      return this.output instanceof StreamOutput
    }

    serialize () {
      return {
        meta: this.meta,
        output: this.output.serialize()
      }
    }

    async parseFrom (res) {
      Object.assign(this.meta, res.meta)
      if (res.output.type === 'buffer') {
        this.output = await BufferOutput.parse(res.output)
      } else {
        this.output = await StreamOutput.parse(this.requestId, res.output)
      }
    }

    get __isJsreportResponse__ () {
      return true
    }
  }

  class BufferOutput {
    constructor () {
      this.buffer = Buffer.from([])
    }

    static parse (output) {
      const instance = new BufferOutput()
      if (output?.content?.length) {
        instance.setBufferSync(Buffer.from(output?.content))
      }
      return instance
    }

    getBufferSync () {
      return this.buffer
    }

    setBufferSync (buf) {
      this.buffer = buf
    }

    getBuffer () {
      return this.buffer
    }

    setBuffer (buf) {
      this.buffer = buf
    }

    writeToTempFile (tmpNameFn) {
      return reporter.writeTempFile(tmpNameFn, this.buffer)
    }

    getSize () {
      return this.buffer.length
    }

    getStream () {
      return Readable.from(this.buffer)
    }

    serialize () {
      const sharedBuf = new SharedArrayBuffer(this.buffer.byteLength)
      const buf = Buffer.from(sharedBuf)

      this.buffer.copy(buf)

      return {
        type: 'buffer',
        content: buf
      }
    }
  }

  class StreamOutput {
    constructor (requestId) {
      this.filename = `response-${requestId}.raw-content`
      const { pathToFile } = reporter.getTempFilePath(this.filename)
      this.filePath = pathToFile
    }

    /** Output shared interface functions  **/

    static async parse (requestId, output) {
      const instance = new StreamOutput(requestId)

      if (output.filePath !== instance.filePath) {
        await reporter.copyFileToTempFile(output.filePath, instance.filePath)
      }
      return instance
    }

    getBufferSync () {
      const { content } = reporter.readTempFileSync(this.filename)
      return content
    }

    setBufferSync (buf) {
      reporter.writeTempFileSync(this.filename, buf)
    }

    async getBuffer () {
      const { content } = await reporter.readTempFile(this.filename)
      return content
    }

    setBuffer (buf) {
      return reporter.writeTempFile(this.filename, buf)
    }

    async getSize () {
      const stat = await fs.stat(this.filePath)

      return stat.size
    }

    async getStream () {
      const filename = this.filename

      async function * generateResponseContent () {
        const responseFileStream = reporter.readTempFileStream(filename).stream

        for await (const chunk of responseFileStream) {
          yield chunk
        }
      }

      return Readable.from(generateResponseContent())
    }

    writeToTempFile (tmpNameFn) {
      return reporter.copyFileToTempFile(this.filePath, tmpNameFn)
    }

    serialize () {
      return {
        type: 'stream',
        filePath: this.filePath
      }
    }

    /** //// Output shared interface functions  **/

    async setStream (stream) {
      const { stream: responseFileStream } = await reporter.writeTempFileStream(this.filename)
      await pipeline(stream, responseFileStream)
    }
  }

  return new Response(requestId, obj)
}
