const path = require('path')
const winston = require('winston')
const MainReporter = require('./lib/main/reporter')
const createDefaultLoggerFormat = require('./lib/main/createDefaultLoggerFormat')
const createListenerCollection = require('./lib/shared/listenerCollection')
const Request = require('./lib/shared/request')

module.exports = function (options, defaults) {
  options = options || {}

  // when jsreport-core is loaded from ESM, module.parent does not exists
  if (options.parentModuleDirectory == null && module.parent) {
    options.parentModuleDirectory = path.dirname(module.parent.filename)
  }

  return new MainReporter(options, defaults)
}

module.exports.Reporter = MainReporter
module.exports.Request = Request
module.exports.createListenerCollection = createListenerCollection
module.exports.loggerFormat = winston.format
module.exports.createDefaultLoggerFormat = createDefaultLoggerFormat
module.exports.createError = require('./lib/shared/createError')

module.exports.tests = {
  documentStore: () => require('./test/store/common.js'),
  blobStorage: () => require('./test/blobStorage/common.js'),
  listeners: () => require('./test/extensions/validExtensions/listeners/jsreport.dontdiscover.config')
}
