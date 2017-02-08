var command = require('commander')
var installHandler = require('jsreport-cli/lib/commands/install').handler
var uninstallHandler = require('jsreport-cli/lib/commands/uninstall').handler

module.exports = function (options) {
  // ignore errors so we can override configuration with nconf
  command.unknownOption = function (flag) {
  }

  command
    .version(require('./../package.json').version)
    .usage('[options]')
    .option('-i, --install', 'WINDOWS ONLY - install app as windows service, For other platforms see http://jsreport.net/on-prem/downloads', function () {
      installHandler()
    })
    .option('-r, --uninstall', 'WINDOWS ONLY - Stop and uninstall service', function () {
      uninstallHandler()
    })
    .parse(process.argv)
}
