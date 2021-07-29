const main = require('./lib/main')
const config = require('./jsreport.config')

module.exports = function (options) {
  config.options = options
  config.main = main
  config.directory = __dirname
  return config
}
