var main = require('./lib/tags')
var config = require('./jsreport.config')

module.exports = function (options) {
  var newConfig = Object.assign({}, config)

  newConfig.options = options
  newConfig.main = main
  newConfig.directory = __dirname

  return newConfig
}
