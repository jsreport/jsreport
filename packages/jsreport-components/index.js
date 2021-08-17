const config = require('./jsreport.config')

module.exports = function (options) {
  config.options = options
  config.directory = __dirname
  return config
}
