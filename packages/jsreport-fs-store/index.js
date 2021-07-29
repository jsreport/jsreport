const config = require('./jsreport.config.js')

module.exports = function (options) {
  config.directory = __dirname
  config.options = options
  return config
}
