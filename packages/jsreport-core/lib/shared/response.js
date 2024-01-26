const path = require('path')
const { Readable, Writable } = require('stream')
const { pipeline } = require('stream/promises')
const Decoder = require('string_decoder').StringDecoder
const fs = require('fs/promises')
const isArrayBufferView = require('util').types.isArrayBufferView
const extend = require('node.extend.without.arrays')

module.exports = async (reporter, requestId, obj) => {
  const isJsreportResponse = obj.__isJsreportResponse__ === true
  const responseFilename = `response-${requestId}.raw-content`

  const getResponseFilePath = () => {
    return reporter.getTempFilePath(responseFilename).pathToFile
  }
  const streamResponse = reporter.options.streamResponse

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
  let inMemoryContent

  if (isJsreportResponse) {
    hasContent = true
  }

  const createSourceStream = () => {
    let sourceStream

    if (!streamResponse) {
      sourceStream = Readable.from(inMemoryContent == null ? Buffer.from([]) : inMemoryContent)
    } else {
      sourceStream = reporter.readTempFileStream(responseFilename).stream
    }

    return sourceStream
  }

  const createTargetInfoStream = async () => {
    let info

    if (!streamResponse) {
      const buffers = []

      info = {
        stream: new Writable({
          write (chunk, encoding, callback) {
            buffers.push(chunk)
            callback()
          },
          final: (callback) => {
            inMemoryContent = Buffer.concat(buffers)
            callback()
          }
        })
      }
    } else {
      // we need to save the transformation to new file to avoid reading and writing to same file (source: response file, target: response file)
      const { pathToFile: tmpFilePath, stream: tmpFileStream } = await reporter.writeTempFileStream((uuid) => `transform-response-${requestId}-${uuid}.raw-content`)

      info = {
        pathToFile: tmpFilePath,
        stream: tmpFileStream
      }
    }

    return info
  }

  const executeTransformsAndSave = createExecuteTransforms(createSourceStream, createTargetInfoStream, async (targetInfo) => {
    if (streamResponse) {
      // we replace the response file with the new content
      await reporter.copyFileToTempFile(targetInfo.pathToFile, responseFilename)
    }
  })

  // NOTE: this property is temporary until we deprecate access to res.content, res.stream
  Object.defineProperty(response, 'content', {
    get () {
      if (!hasContent) {
        return Buffer.from([])
      }

      if (!streamResponse) {
        return inMemoryContent
      }

      const result = reporter.readTempFileSync(responseFilename)

      return result.content
    },
    set (newContent) {
      if (sealed) {
        throw new Error('Can not set res.content when render is completed')
      }

      if (!streamResponse) {
        inMemoryContent = newContent
      }

      if (newContent == null) {
        // no need to return something here, it is always going to return was is passed
        // no matter if we return something here
        hasContent = false
        return
      }

      if (streamResponse) {
        reporter.writeTempFileSync(responseFilename, newContent)
      }

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
        return Buffer.from([])
      }

      if (!streamResponse) {
        return inMemoryContent
      }

      const result = await reporter.readTempFile(responseFilename)

      return result.content
    },
    getStream: async () => {
      if (!hasContent) {
        return Readable.from(Buffer.from([]))
      }

      if (!streamResponse) {
        return Readable.from(inMemoryContent)
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
        return 0
      }

      if (!streamResponse) {
        return inMemoryContent.length
      }

      const stat = await fs.stat(getResponseFilePath())

      return stat.size
    },
    toFile: async (destFilePath) => {
      if (!path.isAbsolute(destFilePath)) {
        throw new Error('Invalid parameter passed to res.output.toFile, destFilePath must be an absolute path to a file')
      }

      if (!streamResponse) {
        await fs.writeFile(destFilePath, inMemoryContent == null ? Buffer.from([]) : inMemoryContent)
        return
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
        if (!streamResponse) {
          inMemoryContent = newContent
        } else {
          await reporter.writeTempFile(responseFilename, newContent)
        }
      } else if (typeof newContent === 'string') {
        if (!path.isAbsolute(newContent)) {
          throw new Error('Invalid content passed to res.output.save, when content is string it must be an absolute path')
        }

        if (!streamResponse) {
          inMemoryContent = await fs.readFile(newContent)
        } else {
          const isSameFile = newContent === getResponseFilePath()

          if (!isSameFile) {
            await reporter.copyFileToTempFile(newContent, responseFilename)
          }
        }
      } else if (isReadableStream(newContent)) {
        if (!streamResponse) {
          const buffers = []

          for await (const data of newContent) {
            buffers.push(data)
          }

          inMemoryContent = Buffer.concat(buffers)
        } else {
          const { stream: responseFileStream } = await reporter.writeTempFileStream(responseFilename)
          await pipeline(newContent, responseFileStream)
        }
      } else if (newContent != null && typeof newContent === 'object' && typeof newContent.transform === 'function') {
        const input = { transforms: [newContent.transform] }

        if (typeof newContent.end === 'function') {
          input.end = [newContent.end]
        }

        await executeTransformsAndSave(input)
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
          return Readable.from(Buffer.from([]))
        }

        if (cachedStream == null) {
          if (!streamResponse) {
            cachedStream = Readable.from(inMemoryContent)
          } else {
            const result = reporter.readTempFileStream(responseFilename)
            cachedStream = result.stream
          }
        }

        return cachedStream
      },
      enumerable: true,
      configurable: false
    })

    sealed = true
  }

  // ensure the file exists from the beginning if it is new response
  if (!isJsreportResponse && streamResponse) {
    await reporter.writeTempFile(responseFilename, Buffer.from([]))
  }

  const result = { response, sealResponse }

  if (streamResponse) {
    result.getResponseFilePath = getResponseFilePath
  }

  return result
}

function createExecuteTransforms (createSourceStream, createTargetInfoStream, onTransformsExecuted) {
  return async (queue) => {
    const transformQueue = queue.transforms || []

    if (transformQueue.length === 0) {
      throw new Error('Invalid call, there are no transforms to execute')
    }

    const transformQueueCount = transformQueue.length

    const targetInfo = await createTargetInfoStream()

    // it is important to create the read stream as the last before doing the pipeline,
    // otherwise if there is some async task in the middle and the file does not exists
    // we get uncaught exception because the file is trying to be opened in next tick
    const sourceStream = createSourceStream()
    const decoder = new Decoder('utf8')
    const originalTransformSequence = transformQueue.map((_, idx) => idx)
    let nextTransformSequence = originalTransformSequence

    const lastTransformSequencePerChunk = {
      executed: [],
      pending: []
    }

    let remaining

    await pipeline(
      sourceStream,
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
      targetInfo.stream
    )

    if (onTransformsExecuted) {
      await onTransformsExecuted(targetInfo)
    }

    const endQueue = queue.end || []

    for (const fn of endQueue) {
      await fn()
    }
  }
}

async function runTransform (transformFn, chunk) {
  const result = await transformFn(chunk)

  if (
    result == null ||
    (result.content == null)
  ) {
    throw new Error('Invalid transform function, it must return a value')
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
