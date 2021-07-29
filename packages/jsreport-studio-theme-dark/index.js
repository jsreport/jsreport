const main = require('./lib/main')
const config = require('./jsreport.config')

module.exports = (options) => {
  const newConfig = Object.assign({}, config)

  newConfig.options = options
  newConfig.main = main
  newConfig.directory = __dirname

  return newConfig
}
