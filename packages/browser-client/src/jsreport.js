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
   * @param {Object} options - optinal configs passed to the window.open
   * @param {string} options.windowName - name of the window
   * @param {string} options.windowFeatures - features of the window
   * @param {Number} options.cleanInterval - how often to check if the window is closed to clean up the object URL
   * @returns {Promise<Window}
   */
  async openInWindow ({
    cleanInterval = 5000,
    windowName,
    windowFeatures
  } = { }) {
    const blob = await this.response.blob()
    const objectURL = URL.createObjectURL(blob, windowName, windowFeatures)
    const w = window.open(objectURL)
    const interval = setInterval(() => {
      if (w.closed) {
        URL.revokeObjectURL(objectURL)
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

  async _jsreportRequest ({ method, path, body }) {
    if (!this.serverUrl) {
      throw new Error('The script was not linked from jsreport. You need to fill jsreport.serverUrl property with valid url to jsreport server.')
    }

    let res
    try {
      res = await fetch(this.serverUrl + path, {
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
