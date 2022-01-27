const commander = require('./lib/commander')
const main = require('./lib/cliExtension')
const keepAliveProcess = require('./lib/keepAliveProcess')
const daemonHandler = require('./lib/daemonHandler')
const config = require('./jsreport.config')

module.exports = function (options) {
  const newConfig = Object.assign({}, config)

  newConfig.options = options
  newConfig.main = main
  newConfig.directory = __dirname

  return newConfig
}

module.exports.commander = commander
module.exports.tempResources = main.tempResources
module.exports.keepAliveProcess = keepAliveProcess
module.exports.daemonHandler = daemonHandler
