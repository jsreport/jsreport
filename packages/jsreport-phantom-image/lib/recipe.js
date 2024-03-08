
const util = require('util')
const Conversion = require('phantom-html-to-pdf')
let conversion

module.exports = async (reporter, definition, request, response) => {
  if (conversion == null) {
    conversion = util.promisify(Conversion(definition.options))
  }
  request.template.phantomImage = request.template.phantomImage || {}

  reporter.logger.debug('Pdf recipe start.', request)

  request.template.recipe = 'html'

  request.template.phantomImage.allowLocalFilesAccess = definition.options.allowLocalFilesAccess
  request.template.phantomImage.settings = {
    javascriptEnabled: request.template.phantomImage.blockJavaScript !== 'true'
  }

  if (request.template.phantomImage.waitForJS) {
    request.template.phantomImage.waitForJS = JSON.parse(request.template.phantomImage.waitForJS)
  }

  request.template.phantomImage.imageType = request.template.phantomImage.imageType || 'png'
  request.template.phantomImage.quality = request.template.phantomImage.quality || '100'

  request.template.phantomImage.format = { format: request.template.phantomImage.imageType, quality: request.template.phantomImage.quality }

  const html = (await response.output.getBuffer()).toString()

  request.template.phantomImage.html = html
  request.template.phantomImage.timeout = reporter.getReportTimeout(request)

  request.template.phantomImage.waitForJSVarName = 'JSREPORT_READY_TO_START'

  const cres = await conversion(request.template.phantomImage)

  cres.logs.forEach(function (m) {
    const meta = { timestamp: m.timestamp.getTime(), ...request }
    let targetLevel = m.level
    let msg = m.message

    if (m.userLevel) {
      targetLevel = 'debug'
      meta.userLevel = true

      let consoleType = m.level

      if (consoleType === 'debug') {
        consoleType = 'log'
      } else if (consoleType === 'warn') {
        consoleType = 'warning'
      }

      msg = `(console:${consoleType}) ${msg}`
    }

    reporter.logger[targetLevel](msg, meta)
  })

  response.meta.contentType = 'image/' + request.template.phantomImage.imageType
  response.meta.fileExtension = request.template.phantomImage.imageType

  await response.updateOutput(cres.stream)

  reporter.logger.debug('phantom-image recipe finished.', request)
}
