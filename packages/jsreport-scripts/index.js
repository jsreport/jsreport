const config = require('./jsreport.config')

module.exports = (options) => {
  config.options = options
  config.directory = __dirname
  return config
}
