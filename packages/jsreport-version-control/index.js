const config = require('./jsreport.config.js')

module.exports = function (options) {
  config.options = options
  config.directory = __dirname
  return config
}

module.exports.tests = () => require('./test/common')
