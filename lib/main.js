const path = require('path')
const core = require('jsreport-core')
const packagejson = require('../package.json')
const extendConfig = require('./extendConfig')

module.exports = (options) => {
  options = options || {}
  options.discover = options.discover !== false
  options.rootDirectory = options.rootDirectory == null ? path.join(__dirname, '../../../') : options.rootDirectory
  options.loadConfig = options.loadConfig == null ? true : options.loadConfig
  const reporter = core(options)
  reporter.version = packagejson.version

  return reporter.afterConfigLoaded(extendConfig)
}
