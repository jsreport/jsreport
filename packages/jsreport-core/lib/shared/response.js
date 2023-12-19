const path = require('path')
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const Decoder = require('string_decoder').StringDecoder
const fs = require('fs/promises')
const isArrayBufferView = require('util').types.isArrayBufferView
const extend = require('node.extend.without.arrays')

module.exports = (reporter, requestId, obj, supportsTransformQueue = false) => {
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

  const transformQueueState = {
    active: false,
    queue: {
      transforms: [],
      end: []
    },
    manager: null
  }

  if (supportsTransformQueue) {
    transformQueueState.manager = {
      start: () => {
        transformQueueState.active = true
      },
      execute: async () => {
        const current = transformQueueState.queue
        await executeTransformsAndSave(current)
      },
      end: () => {
        transformQueueState.active = false
        transformQueueState.queue = []
      }
    }
  }

  const runTransform = async (transformFn, chunk) => {
    const result = await transformFn(chunk)

    if (
      result == null ||
      (result.content == null)
    ) {
      throw new Error('Invalid transform function, it must return a value')
    }

    return result
  }

  const executeTransformsAndSave = async (queue) => {
    const transformQueue = queue.transforms || []

    if (transformQueue.length === 0) {
      throw new Error('Invalid call, there are no transforms to execute')
    }

    const transformQueueCount = transformQueue.length

    // we need to save the transformation to new file to avoid reading and writing to same file (source: response file, target: response file)
    const { pathToFile: tmpFilePath, stream: tmpFileStream } = await reporter.writeTempFileStream((uuid) => `transform-response-${requestId}-${uuid}.raw-content`)
    // it is important to create the read stream as the last before doing the pipeline,
    // otherwise if there is some async task in the middle and the file does not exists
    // we get uncaught exception because the file is trying to be opened in next tick
    const responseFileStream = reporter.readTempFileStream(responseFilename).stream
    const decoder = new Decoder('utf8')
    const originalTransformSequence = transformQueue.map((_, idx) => idx)
    let nextTransformSequence = originalTransformSequence

    const lastTransformSequencePerChunk = {
      executed: [],
      pending: []
    }

    let remaining

    const transformApi = {
      getString (buf) {
        return decoder.write(buf)
      }
    }

    await pipeline(
      responseFileStream,
      async function * (source) {
        for await (const chunk of source) {
          const chunkStr = decoder.write(chunk)
          let currentChunk = Buffer.from(chunkStr)

          const transformSequence = [...nextTransformSequence]

          lastTransformSequencePerChunk.executed = []
          lastTransformSequencePerChunk.pending = [...transformSequence]

          // this mean we have partial utf8 character in the chunk,
          // we need to wait for the next chunk
          if (decoder.lastNeed) {
            remaining = remaining != null ? Buffer.concat([remaining, currentChunk]) : currentChunk
            continue
          }

          // reset the decoder state we start clean for the next chunk
          decoder.end()

          if (remaining != null) {
            currentChunk = Buffer.concat([remaining, currentChunk])
            remaining = null
          }

          for (const currentTransformIdx of transformSequence) {
            lastTransformSequencePerChunk.pending.shift()
            lastTransformSequencePerChunk.executed.push(currentTransformIdx)

            const fn = transformQueue[currentTransformIdx]

            const result = await runTransform(fn, currentChunk)

            currentChunk = result.content

            if (result.concat === true) {
              remaining = currentChunk
              break
            }
          }

          if (remaining != null) {
            // continue the transforms for the next chunk from the last transform executed position
            nextTransformSequence = []

            const lastTransformExecutedIdx = lastTransformSequencePerChunk.executed[lastTransformSequencePerChunk.executed.length - 1]
            const maxTransformIdx = transformQueueCount - 1

            for (let idx = 0; idx < transformQueueCount; idx++) {
              let transformIdx = lastTransformExecutedIdx + idx

              if (transformIdx > maxTransformIdx) {
                transformIdx = transformIdx - maxTransformIdx
              }

              nextTransformSequence.push(transformIdx)
            }
          } else {
            nextTransformSequence = originalTransformSequence
          }

          yield currentChunk
        }

        // if we get here it means we have been buffering chunks that always had partial utf8 character
        // and here we need to capture the remaining text and process it
        if (decoder.lastNeed) {
          const lastChunk = Buffer.from(decoder.end())

          if (lastChunk.length > 0) {
            remaining = remaining != null ? Buffer.concat([remaining, lastChunk]) : lastChunk
          }
        }

        if (remaining != null) {
          let finalChunk = remaining

          // if we end with remaining and pending transforms we ensure to run them here
          const pendingTransforms = [...lastTransformSequencePerChunk.pending]

          for (const fn of pendingTransforms) {
            const result = await runTransform(fn, finalChunk)
            finalChunk = result.content
          }

          yield finalChunk
        }
      },
      tmpFileStream
    )

    // we replace the response file with the new content
    await reporter.copyFileToTempFile(tmpFilePath, responseFilename)

    const endQueue = queue.end || []

    for (const fn of endQueue) {
      await fn()
    }
  }

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

      async function * generateResponseContent () {
        const responseFileStream = reporter.readTempFileStream(responseFilename).stream

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
    toFile: async (destFilePath) => {
      if (!path.isAbsolute(destFilePath)) {
        throw new Error('Invalid parameter passed to res.output.toFile, destFilePath must be an absolute path to a file')
      }

      await reporter.copyFileToTempFile(getResponseFilePath(), destFilePath)
    },
    save: async (newContent) => {
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
      } else if (isReadableStream(newContent)) {
        const { stream: responseFileStream } = await reporter.writeTempFileStream(responseFilename)
        await pipeline(newContent, responseFileStream)
      } else if (newContent != null && typeof newContent === 'object' && typeof newContent.transform === 'function') {
        if (transformQueueState.active) {
          transformQueueState.queue.transforms.push(newContent.transform)

          if (typeof newContent.end === 'function') {
            transformQueueState.queue.end.push(newContent.end)
          }
        } else {
          const input = { transforms: [newContent.transform] }

          if (typeof newContent.end === 'function') {
            input.end = [newContent.end]
          }

          await executeTransformsAndSave(input)
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

  const result = { response, sealResponse, getResponseFilePath }

  if (supportsTransformQueue) {
    result.transformQueueManager = transformQueueState.manager
  }

  return result
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
