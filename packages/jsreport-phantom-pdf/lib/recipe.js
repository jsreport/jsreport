const util = require('util')
const Conversion = require('phantom-html-to-pdf')
const toArrayAsync = util.promisify(require('stream-to-array'))
let conversion

const defaultPhantomjsVersion = '1.9.8'

module.exports = (reporter, definition, request, response) => {
  if (!conversion) {
    conversion = Conversion(definition.options)
  }
  let margin

  request.template.phantom = request.template.phantom || {}

  margin = request.template.phantom.margin

  if (margin) {
    if (typeof margin === 'string') {
      try {
        // margin value should always be a string or object, never a number
        margin = isNaN(parseInt(margin, 10)) ? JSON.parse(margin) : String(JSON.parse(margin))
      } catch (e) {}
    }
  }

  request.template.phantom.paperSize = {
    width: request.template.phantom.width,
    height: request.template.phantom.height,
    headerHeight: request.template.phantom.headerHeight,
    footerHeight: request.template.phantom.footerHeight,
    format: request.template.phantom.format,
    orientation: request.template.phantom.orientation,
    margin: margin
  }

  request.template.phantom.allowLocalFilesAccess = definition.options.allowLocalFilesAccess
  request.template.phantom.settings = {
    javascriptEnabled: request.template.phantom.blockJavaScript !== true,
    resourceTimeout: request.template.phantom.resourceTimeout
  }

  if (request.template.phantom.waitForJS) {
    request.template.phantom.waitForJS = JSON.parse(request.template.phantom.waitForJS)
  }

  request.template.phantom.fitToPage = request.template.phantom.fitToPage != null ? request.template.phantom.fitToPage : false

  request.template.phantom.waitForJSVarName = 'JSREPORT_READY_TO_START'

  request.template.phantom.html = response.content.toString()

  request.template.phantom.timeout = reporter.getReportTimeout(request)

  if (request.template.phantom.customPhantomJS === true) {
    request.template.phantom.phantomPath = require.main.require('phantomjs-prebuilt').path
  }

  if (request.template.phantom.phantomjsVersion) {
    const phantom = definition.options.phantoms.filter(function (p) {
      return p.version === request.template.phantom.phantomjsVersion
    })

    // default doesn't have a path
    if (phantom.length === 1 && phantom[0].path) {
      request.template.phantom.phantomPath = require(phantom[0].path).path
    }
  } else {
    if (definition.options.defaultPhantomjsVersion && definition.options.defaultPhantomjsVersion !== defaultPhantomjsVersion) {
      request.template.phantom.phantomPath = require(definition.options.phantoms[0].path).path
    }
  }

  function processPart (options, req, type) {
    if (!options[type]) {
      return Promise.resolve()
    }

    reporter.logger.debug('Starting child request to render pdf ' + type, req)

    // do an anonymous render
    const template = {
      content: options[type],
      engine: req.template.engine,
      recipe: 'html',
      helpers: req.template.helpers
    }

    return reporter.render({
      template
    }, req).then(function (res) {
      options[type] = res.content.toString()
    })
  }

  return processPart(request.template.phantom, request, 'header').then(function () {
    return processPart(request.template.phantom, request, 'footer')
  }).then(function () {
    return util.promisify(conversion)(request.template.phantom)
  }).then(function (res) {
    res.logs.forEach(function (m) {
      const meta = { timestamp: m.timestamp.getTime(), ...request }

      if (m.userLevel) {
        meta.userLevel = true
      }

      reporter.logger[m.level](m.message, meta)
    })

    response.meta.contentType = 'application/pdf'
    response.meta.fileExtension = 'pdf'
    response.meta.numberOfPages = res.numberOfPages

    return toArrayAsync(res.stream).then(function (arr) {
      response.content = Buffer.concat(arr)
      reporter.logger.debug('phantom-pdf recipe finished with ' + res.numberOfPages + ' pages generated', request)
    })
  })
}
