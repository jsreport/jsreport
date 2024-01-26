import parseMultipartStream from '@jsreport/multipart/parseMultipartStream'
import resolveUrl from './resolveUrl'
import processItemsInInterval from './processItemsInInterval'

export default async function (request, options) {
  delete request.template._id
  request.template.content = request.template.content || ' '

  request.options = request.options || {}
  request.options.preview = request.options.preview != null ? request.options.preview : true

  await streamRender(request, options)
}

async function streamRender (request, { signal, profilerMode = 'standard', onStart, onFiles } = {}) {
  const templateName = request.template.name

  let url = templateName ? resolveUrl(`/api/report/${encodeURIComponent(templateName)}`) : resolveUrl('/api/report')

  url = `${url}?profilerMode=${profilerMode}`

  try {
    const template = Object.keys(request.template).reduce((acu, templateProp) => {
      if (templateProp.indexOf('__') !== 0) {
        acu[templateProp] = request.template[templateProp]
      }

      return acu
    }, {})

    if (onStart) {
      try {
        onStart()
      } catch (e) {
        console.error('Error during onStart callback of render', e)
      }
    }

    const response = await window.fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template,
        options: request.options,
        data: request.data
      }),
      signal
    })

    let contentType = ''

    if (response.headers != null) {
      contentType = response.headers.get('Content-Type') || ''
    }

    if (response.status === 200) {
      if (contentType.indexOf('multipart/mixed') === -1) {
        throw new Error('Got invalid response content-type, expected multipart/mixed')
      }

      const files = []
      let parsing = true

      const filesProcessingPromise = processItemsInInterval({
        baseInterval: 16,
        queue: files,
        fulfilledCheck: () => {
          return parsing === false
        },
        handler: (pending, isFulfilled) => {
          const toProcess = []
          let nextInterval

          // if the report is already available we process it immediately
          if (pending[pending.length - 1].name === 'report') {
            const fileInfo = pending.pop()
            toProcess.push(fileInfo)
            // when the report is found, resume the processing sometime later giving the
            // browser some time to finish the paint of report
            nextInterval = 100
          } else {
            if (isFulfilled) {
              let count = 0
              // if parsing is done then we process all pending files
              // in batches
              let pendingFile

              do {
                pendingFile = pending.shift()

                if (pendingFile != null) {
                  toProcess.push(pendingFile)
                  count++
                }
              } while (pendingFile != null && count < 100)
            } else {
              let stop = false

              do {
                const fileInfo = pending.shift()

                toProcess.push(fileInfo)

                if (
                  fileInfo.rawData.length > 2000 ||
                  pending.length === 0 ||
                  pending[0].rawData.length > 2000
                ) {
                  stop = true
                }
              } while (!stop)
            }
          }

          onFiles(toProcess, pending)

          return nextInterval
        }
      })

      let parseErr

      try {
        await parseMultipartStream({
          contentType: response.headers.get('Content-Type'),
          stream: response.body
        }, (fileInfo) => {
          files.push(fileInfo)
        })
      } catch (err) {
        if (err.name === 'AbortError') {
          parseErr = new Error('User stopped the template rendering')
        } else {
          parseErr = err
        }
      }

      parsing = false
      await filesProcessingPromise

      if (parseErr) {
        throw parseErr
      }
    } else {
      let content

      if (contentType === 'application/json') {
        content = await response.json()
      } else {
        content = await response.text()
      }

      const notOkError = new Error(`Got not ok response, status: ${response.status}`)

      notOkError.data = content

      throw notOkError
    }
  } catch (e) {
    const newError = new Error(`Render Preview failed. ${e.message}`)

    newError.stack = e.stack || ''
    Object.assign(newError, e)

    throw newError
  }
}
