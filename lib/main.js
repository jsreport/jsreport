const path = require('path')
const core = require('jsreport-core')
const packagejson = require('../package.json')
const extendConfig = require('./extendConfig')

module.exports = (options, defaults) => {
  options = options || {}

  const defaultsToUse = Object.assign({}, {
    discover: true,
    rootDirectory: path.join(__dirname, '../../../'),
    loadConfig: true
  }, defaults)

  const reporter = core(options, defaultsToUse)

  reporter.version = packagejson.version

  return reporter.afterConfigLoaded(extendConfig)
}
