const path = require('path')
const { Readable } = require('stream')
const fs = require('fs/promises')
const isArrayBufferView = require('util').types.isArrayBufferView
const extend = require('node.extend.without.arrays')

module.exports = (reporter, requestId, obj) => {
  const responseFilename = `response-${requestId}.raw-content`

  const getResponseFilePath = () => {
    return reporter.getTempFilePath(responseFilename).pathToFile
  }

  const response = Object.create({}, {
    __isJsreportResponse__: {
      value: true,
      writable: false,
      configurable: false,
      enumerable: false
    }
  })

  response.meta = extend(true, {}, obj.meta)

  let sealed = false
  let hasContent = false

  // NOTE: this property is temporary until we deprecate access to res.content, res.stream
  Object.defineProperty(response, 'content', {
    get () {
      if (!hasContent) {
        return
      }

      const result = reporter.readTempFileSync(responseFilename)

      return result.content
    },
    set (newContent) {
      if (sealed) {
        throw new Error('Can not set res.content when render is completed')
      }

      if (newContent == null) {
        hasContent = false
        return
      }

      reporter.writeTempFileSync(responseFilename, newContent)

      if (!hasContent) {
        hasContent = true
      }
    },
    enumerable: true,
    configurable: false
  })

  const output = {
    getBuffer: async () => {
      if (!hasContent) {
        return
      }

      const result = await reporter.readTempFile(responseFilename)

      return result.content
    },
    getStream: async () => {
      if (!hasContent) {
        return
      }

      const responseFileStream = reporter.readTempFileStream(responseFilename).stream

      async function * generateResponseContent () {
        for await (const chunk of responseFileStream) {
          yield chunk
        }
      }

      // we produce a new Readable stream to avoid exposing the file stream directly
      const responseStream = Readable.from(generateResponseContent())

      return responseStream
    },
    getSize: async () => {
      if (!hasContent) {
        return
      }

      const stat = await fs.stat(getResponseFilePath())

      return stat.size
    },
    save: async (newContent) => {
      // NOTE: do we care to expose the .save()?, if we don't want to delete the method we can mark
      // the response somehow as sealed, so any call done when it is sealed it throws error
      if (sealed) {
        throw new Error('Can not use res.output.save when render is completed')
      }

      if (newContent == null) {
        hasContent = false
        return
      }

      if (Buffer.isBuffer(newContent) || isArrayBufferView(newContent)) {
        await reporter.writeTempFile(responseFilename, newContent)
      } else if (typeof newContent === 'string') {
        if (!path.isAbsolute(newContent)) {
          throw new Error('Invalid content passed to res.output.save, when content is string it must be an absolute path')
        }

        const isSameFile = newContent === getResponseFilePath()

        if (!isSameFile) {
          await reporter.copyFileToTempFile(newContent, responseFilename)
        }
      } else {
        throw new Error('Invalid content passed to res.output.save')
      }

      if (!hasContent) {
        hasContent = true
      }
    }
  }

  Object.defineProperty(response, 'output', {
    value: output,
    writable: false,
    configurable: false,
    enumerable: false
  })

  const sealResponse = () => {
    if (sealed) {
      return
    }

    let cachedStream

    // NOTE: this property is temporary until we deprecate access to res.content, res.stream
    Object.defineProperty(response, 'stream', {
      get () {
        if (!hasContent) {
          return
        }

        if (cachedStream == null) {
          const result = reporter.readTempFileStream(responseFilename)
          cachedStream = result.stream
        }

        return cachedStream
      },
      enumerable: true,
      configurable: false
    })

    sealed = true
  }

  return { response, sealResponse, getResponseFilePath }
}
