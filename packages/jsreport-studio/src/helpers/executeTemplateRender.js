import isObject from 'lodash/isObject'
import parseStreamingMultipart from './parseStreamingMultipart'
import { getPreviewWindowName } from './previewWindow'
import resolveUrl from './resolveUrl'
import processItemsInInterval from './processItemsInInterval'
import { extensions } from '../lib/configuration'

export default async function (request, target) {
  delete request.template._id
  request.template.content = request.template.content || ' '

  request.options = request.options || {}
  request.options.preview = true

  if (extensions.studio.options.asyncRender) {
    await streamRender(request, target)
  } else {
    await render(request, target)
  }
}

async function streamRender (request, { onStart, onFiles } = {}) {
  const templateName = request.template.name

  let url = templateName ? resolveUrl(`/api/report/${encodeURIComponent(templateName)}`) : resolveUrl('/api/report')

  url = `${url}?profilerDebug=true`

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
      })
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
        await parseStreamingMultipart(response, (fileInfo) => {
          files.push(fileInfo)
        })
      } catch (err) {
        parseErr = err
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

    newError.stack = e.stack
    Object.assign(newError, e)

    throw newError
  }
}

async function render (request, target) {
  const templateName = request.template.name
  const mapForm = document.createElement('form')

  let formTarget
  const windowPrefix = 'window-'

  if (target.type === 'download') {
    formTarget = '_self'
    delete request.options.preview
    request.options.download = true
  } else if (target.type.indexOf(windowPrefix) === 0) {
    formTarget = getPreviewWindowName(target.type.slice(windowPrefix.length))
  } else {
    formTarget = 'previewFrame'
  }

  mapForm.target = formTarget
  mapForm.method = 'POST'

  // we set the template name in url just to show a title in the preview iframe, the name
  // won't be using at all on server side logic
  mapForm.action = templateName ? resolveUrl(`/api/report/${encodeURIComponent(templateName)}`) : resolveUrl('/api/report')

  function addBody (path, body) {
    if (body === undefined) {
      return
    }

    // eslint-disable-next-line
    for (const key in body) {
      if (isObject(body[key])) {
        // if it is an empty object or array then it should not be added to form,
        // this fix problem with url encoded data which can not represent empty arrays or objects
        // so instead of sending empty `template[scripts]:` we don't add the value at all
        if (Object.keys(body[key]).length === 0) {
          continue
        }

        addBody(path + '[' + key + ']', body[key])
      } else {
        if (body[key] !== undefined && !(body[key] instanceof Array)) {
          addInput(mapForm, path + '[' + key + ']', body[key])
        }
      }
    }
  }

  addBody('template', request.template)
  addBody('options', request.options)

  if (request.data) {
    addInput(mapForm, 'data', request.data)
  }

  document.body.appendChild(mapForm)

  mapForm.submit()

  function addInput (form, name, value) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
}
