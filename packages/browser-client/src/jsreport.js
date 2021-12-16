/* globals jsreportInit */
import { saveAs } from 'file-saver'

class RenderResponse {
  constructor (res) {
    this._response = res
  }

  /**
   * Return the fetch original response
   */
  get response () {
    return this._response
  }

  /**
   * Returns Promise<string> content of the response
   * @returns {Promise<string>}
   */
  async toString () {
    const blob = await this.response.blob()
    return blob.text()
  }

  /**
   * Invoke save of the output content as the file
   * @param {string} afilename  - filename to save the file as
   */
  async download (afilename) {
    const blob = await this.response.blob()
    saveAs(blob, afilename)
  }

  /**
   * Returns Promise<Blob> content of the response
   * @returns {Promise<Blob>}
   */
  async toBlob () {
    return this.response.blob()
  }

  /**
   *  Return Promise<string> data URI of the response
   * @returns {Promise<string>}
   */
  async toDataURI () {
    const reader = new FileReader()
    const blob = await this.response.blob()
    return new Promise((resolve) => {
      reader.onload = function (e) {
        resolve(reader.result)
      }
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Opens the response content in a new browser window
   * @param {Object} options - optional configs passed to the window.open
   * @param {string} options.windowName - name of the window
   * @param {string} options.windowFeatures - features of the window
   * @param {Number} options.cleanInterval - how often to check if the window is closed to clean up the object URL
   * @param {Number} options.title - tab title name
   * @returns {Promise<Window}
   */
  async openInWindow ({
    cleanInterval = 5000,
    windowName,
    windowFeatures,
    title
  } = { }) {
    const blob = await this.response.blob()
    const objectURL = URL.createObjectURL(blob, windowName, windowFeatures)

    const previewURL = window.URL.createObjectURL(new Blob([`
    <html>
      <head>
        <title>${title || 'report'}</title>
        <style>
          html, body {
            margin: 0px;
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <iframe src="${objectURL}" frameborder="0" width="100%" height="100%" />
      </body>
    </html>
  `], { type: 'text/html' }))

    const w = window.open(previewURL)
    const interval = setInterval(() => {
      if (w && w.closed) {
        URL.revokeObjectURL(objectURL)
        URL.revokeObjectURL(previewURL)
        clearInterval(interval)
      }
    }, cleanInterval)
    return w
  }

  /**
   * Return the response as object URL. Remember you need to revoke the object URL when you are done with it
   * @returns {Promise<string>}
   */
  async toObjectURL () {
    const blob = await this.response.blob()
    return URL.createObjectURL(blob)
  }
}

class JsReportClient {
  constructor () {
    this.headers = {}
  }

  _normalizeUrl (baseUrl, ...paths) {
    const rootUrl = new URL(baseUrl)
    const normalizedPaths = []

    for (const path of paths) {
      let normalizedPath = path

      if (normalizedPath[0] === '/') {
        normalizedPath = normalizedPath.slice(1)
      }

      if (normalizedPath[normalizedPath.length - 1] === '/') {
        normalizedPath = normalizedPath.slice(0, -1)
      }

      if (normalizedPath !== '') {
        normalizedPaths.push(normalizedPath)
      }
    }

    if (normalizedPaths.length === 0) {
      return rootUrl.toString()
    }

    return new URL(normalizedPaths.join('/'), rootUrl).toString()
  }

  async _jsreportRequest ({ method, path, body }) {
    if (!this.serverUrl) {
      throw new Error('The script was not linked from jsreport. You need to fill jsreport.serverUrl property with valid url to jsreport server.')
    }

    const reportUrl = this._normalizeUrl(this.serverUrl, path)

    let res
    try {
      res = await fetch(reportUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: body != null ? JSON.stringify(body) : null,
        method
      })
    } catch (e) {
      throw new Error('Failed to connect to jsreport server.')
    }

    if (!res.ok) {
      let error = {
        message: `jsreport server responded with error. status text: ${res.statusText}, status code: ${res.status}`
      }
      try {
        const blob = await res.blob()
        const text = await blob.text()
        const remoteError = JSON.parse(text)
        error = {
          ...remoteError,
          message: `${error.message}, details: ${remoteError.message}`
        }
      } catch (e) {

      }
      const returnError = new Error(error.message)
      Object.assign(returnError, {
        status: res.status,
        statusText: res.statusText,
        error
      })
      throw returnError
    }

    return res
  }

  _submitFormRequest (req, target, title) {
    const mapForm = document.createElement('form')
    mapForm.target = target
    mapForm.id = new Date().getTime()
    mapForm.method = 'POST'
    mapForm.action = this._normalizeUrl(this.serverUrl, '/api/report', encodeURIComponent(title))

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'renderRequestContent'
    input.value = JSON.stringify(req)
    mapForm.appendChild(input)
    document.body.appendChild(mapForm)

    function submit (i) {
      if (i > 10) {
        return console.log('Unable to submit render form.')
      }
      try {
        mapForm.submit()
        mapForm.outerHTML = ''
      } catch (e) {
        setTimeout(function () {
          submit(i + 1)
        }, 50)
      }
    }

    submit(0)
  }

  /**
   * Render report in remote server and initiate download
   * This method doesn't support submitting to jsreport with authentication enabled
   * @param {filename} new tab title
   * @param {RenderRequest} renderRequest
   */
  download (filename, req) {
    if (
      filename == null ||
      typeof filename !== 'string' ||
      filename.trim() === ''
    ) {
      throw new Error('jsreport.download requires filename parameter and must be a non empty string')
    }

    const request = Object.assign({}, req)
    request.options = Object.assign({}, request.options)
    if (request.options['Content-Disposition'] == null) {
      request.options['Content-Disposition'] = `attachment; filename="${filename}"`
    }
    this._submitFormRequest(request, '_self', filename)
  }

  /**
   * Render report in remote server and open in new tab
   * This method doesn't support submitting to jsreport with authentication enabled
   * @param {Object} options
   * @param {string} options.filename
   * @param {string} options.title
   * @param {RenderRequest} renderRequest
   */
  openInWindow ({ title, filename } = {}, req) {
    if (
      title == null ||
      typeof title !== 'string' ||
      title.trim() === ''
    ) {
      throw new Error('jsreport.openInWindow requires title parameter and must be a non empty string')
    }

    if (
      filename == null ||
      typeof filename !== 'string' ||
      filename.trim() === ''
    ) {
      throw new Error('jsreport.openInWindow requires filename parameter and must be a non empty string')
    }

    const request = Object.assign({}, req)
    if (filename) {
      request.options = Object.assign({}, request.options)
      if (request.options['Content-Disposition'] == null) {
        request.options['Content-Disposition'] = `inline; filename="${filename}"`
      }
    }

    this._submitFormRequest(request, '_blank', title)
  }

  /**
   * Render report in remote server
   * @param {RenderRequest} renderRequest
   * @returns {Promise<RenderResponse>}
   */
  async render (renderRequest) {
    const res = await this._jsreportRequest({ method: 'POST', path: '/api/report', body: renderRequest })
    return new RenderResponse(res)
  }

  /**
   * Create new instance of the client, this is rarely needed and you can use the default in the most of the cases
   * @returns {JsReportClient}
   */
  createClient () {
    return new JsReportClient()
  }
}

const jsreportInstance = new JsReportClient()
setTimeout(function () {
  if (window.jsreportInit !== undefined) {
    jsreportInit(jsreportInstance)
  }
}, 0)

export default jsreportInstance
