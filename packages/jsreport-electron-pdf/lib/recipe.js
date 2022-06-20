const toArray = require('stream-to-array')
const electronConvert = require('electron-html-to')
const { promisify } = require('util')
const pickBy = require('lodash.pickby')

module.exports = (reporter, definition) => async (request, response) => {
  const {
    strategy,
    numberOfWorkers,
    pingTimeout,
    tmpDir,
    portLeftBoundary,
    portRightBoundary,
    host,
    chromeCommandLineSwitches,
    maxLogEntrySize
  } = definition.options

  let convertOptions = {
    strategy,
    numberOfWorkers,
    pingTimeout,
    tmpDir,
    portLeftBoundary,
    portRightBoundary,
    host,
    chromeCommandLineSwitches,
    maxLogEntrySize
  }

  // filter undefined options
  convertOptions = pickBy(convertOptions, (val) => val !== undefined)

  const shouldAccessLocalFiles = Object.prototype.hasOwnProperty.call(definition.options, 'allowLocalFilesAccess') ? definition.options.allowLocalFilesAccess : false

  const electronConversion = promisify(electronConvert({
    ...convertOptions,
    allowLocalFilesAccess: shouldAccessLocalFiles
  }))

  request.template.electron = request.template.electron || {}
  request.template.electron.timeout = reporter.getReportTimeout(request)

  reporter.logger.debug('Electron Pdf recipe start.', request)

  const options = request.template.electron

  // TODO: add support for header and footer html when electron support printing header/footer
  const result = await electronConversion({
    html: response.content,
    delay: options.printDelay,
    timeout: options.timeout,
    waitForJS: options.waitForJS != null ? options.waitForJS : false,
    waitForJSVarName: 'JSREPORT_READY_TO_START',
    converterPath: electronConvert.converters.PDF,
    browserWindow: {
      width: options.width,
      height: options.height,
      webPreferences: {
        javascript: !(options.blockJavaScript != null ? options.blockJavaScript : false)
      }
    },
    pdf: {
      marginsType: options.marginsType,
      pageSize: parseIfJSON(options.format),
      printBackground: options.printBackground != null ? options.printBackground : true,
      landscape: options.landscape != null ? options.landscape : false
    }
  })

  const numberOfPages = result.numberOfPages

  response.meta.contentType = 'application/pdf'
  response.meta.fileExtension = 'pdf'
  response.meta.numberOfPages = numberOfPages

  if (Array.isArray(result.logs)) {
    result.logs.forEach((log) => {
      const meta = { timestamp: log.timestamp.getTime(), ...request }

      if (log.userLevel) {
        meta.userLevel = true
      }

      reporter.logger[log.level](log.message, meta)
    })
  }

  const arr = await toArray(result.stream)

  response.content = Buffer.concat(arr)
  reporter.logger.debug(`electron-pdf recipe finished with ${numberOfPages} pages generated`, request)
}

function parseIfJSON (val) {
  if (typeof val === 'object') {
    return val
  }

  try {
    return JSON.parse(val)
  } catch (e) {
    return val
  }
}
