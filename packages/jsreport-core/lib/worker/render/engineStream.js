const bytes = require('bytes')
const { Readable } = require('stream')
/*
This adds jsreport.templatingEngines.createStream to the helpers proxy allowing to write giant texts to output
which would otherwise hit nodejs max string size limit.

Example usage
===================
async function myEach(items, options) {
    const stream = await jsreport.templatingEngines.createStream()
    for (let i = 0; i < items.length; i++) {
        await stream.write(options.fn())
    }
    return await stream.toResult()
}
*/

module.exports = (reporter) => {
  reporter.afterTemplatingEnginesExecutedListeners.add('streamedEach', async (req, res) => {
    if (req.context.engineStreamEnabled !== true) {
      return
    }

    const content = (await res.output.getBuffer()).toString()

    const matches = [...content.matchAll(/{#stream ([^{}]{0,500})}/g)]

    async function * transform () {
      if (matches.length) {
        yield content.substring(0, matches[0].index)

        for (let i = 0; i < matches.length; i++) {
          const { stream } = reporter.readTempFileStream(matches[i][1])

          for await (const content of stream) {
            yield content
          }

          if (i < matches.length - 1) {
            yield content.substring(matches[i].index + matches[i][0].length, matches[i + 1].index)
          } else {
            yield content.substring(matches[i].index + matches[i][0].length)
          }
        }
      } else {
        yield content
      }
    }

    await res.output.update(Readable.from(transform()))
  })

  reporter.extendProxy((proxy, req, {
    runInSandbox,
    context,
    getTopLevelFunctions
  }) => {
    if (proxy.templatingEngines) {
      proxy.templatingEngines.createStream = async (opts = {}) => {
        // limiting the number of temp files to avoid breaking server, otherwise I see no reason why having more than 1000 calls per req should be valid usecase
        const counter = reporter.reqStorage.get('engine-stream-counter', req) || 0
        if (counter > 1000) {
          throw reporter.createError('Reached maximum limit of templatingEngine.createStream calls', {
            weak: true,
            statusCode: 400
          })
        }
        reporter.reqStorage.set('engine-stream-counter', counter + 1, req)

        req.context.engineStreamEnabled = true

        const bufferSize = bytes(opts.bufferSize || '10mb')
        let buf = ''

        const { fileHandle, filename } = await reporter.openTempFile((uuid) => `${uuid}.stream`, 'a')
        proxy.templatingEngines.addFinishListener(() => fileHandle.close().catch((e) => reporter.logger.error('Failed to close temp file handle', e, req)))

        return {
          write: async (text) => {
            const realText = await proxy.templatingEngines.waitForAsyncHelper(text)

            buf += realText

            if (buf.length > bufferSize) {
              await fileHandle.appendFile(buf)
              buf = ''
            }
          },
          toResult: async () => {
            await fileHandle.appendFile(buf)
            return `{#stream ${filename}}`
          }
        }
      }
    }
  })
}
