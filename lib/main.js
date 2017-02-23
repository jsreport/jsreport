var path = require('path')
var core = require('jsreport-core')
var packagejson = require('../package.json')
var extendConfig = require('./extendConfig')

module.exports = function (options) {
  options = options || {}
  options.discover = options.discover !== false
  options.rootDirectory = options.rootDirectory == null ? path.join(__dirname, '../../../') : options.rootDirectory
  options.loadConfig = options.loadConfig == null ? true : options.loadConfig
  var reporter = core(options)
  reporter.version = packagejson.version

  return reporter.afterConfigLoaded(extendConfig)
}
