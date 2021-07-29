const config = require('./jsreport.config.js')

module.exports = function (options) {
  const newConfig = { ...config }

  newConfig.options = options
  newConfig.directory = __dirname

  return newConfig
}
