const path = require('path')
const MainReporter = require('./lib/main/reporter')
const Request = require('./lib/shared/request')

module.exports = function (options, defaults) {
  options = options || {}

  options.parentModuleDirectory = options.parentModuleDirectory || path.dirname(module.parent.filename)

  return new MainReporter(options, defaults)
}

module.exports.Reporter = MainReporter
module.exports.Request = Request

module.exports.tests = {
  documentStore: () => require('./test/store/common.js'),
  blobStorage: () => require('./test/blobStorage/common.js'),
  listeners: () => require('./test/extensions/validExtensions/listeners/jsreport.config')
}
