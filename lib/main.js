var path = require('path')
var core = require('jsreport-core')
var extendConfig = require('./extendConfig')
var extendInit = require('./extendInit')

module.exports = function (options) {
  options = options || {}
  options.discover = options.discover !== false
  options.rootDirectory = options.rootDirectory == null ? path.join(__dirname, '../../../') : options.rootDirectory
  options.loadConfig = options.loadConfig == null ? true : options.loadConfig
  var reporter = core(options)
  extendInit(reporter)
  return reporter.afterConfigLoaded(extendConfig)
}
