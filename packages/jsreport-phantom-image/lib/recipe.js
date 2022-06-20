
const util = require('util')
const toArray = require('stream-to-array')
const Conversion = require('phantom-html-to-pdf')
let conversion

module.exports = (reporter, definition, request, response) => {
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
  request.template.phantomImage.html = response.content
  request.template.phantomImage.timeout = reporter.getReportTimeout(request)

  request.template.phantomImage.waitForJSVarName = 'JSREPORT_READY_TO_START'

  return conversion(request.template.phantomImage).then(function (cres) {
    cres.logs.forEach(function (m) {
      const meta = { timestamp: m.timestamp.getTime(), ...request }

      if (m.userLevel) {
        meta.userLevel = true
      }

      reporter.logger[m.level](m.message, meta)
    })

    response.meta.contentType = 'image/' + request.template.phantomImage.imageType
    response.meta.fileExtension = request.template.phantomImage.imageType

    return toArray(cres.stream).then(function (arr) {
      response.content = Buffer.concat(arr)
      reporter.logger.debug('phantom-image recipe finished.', request)
    })
  })
}
