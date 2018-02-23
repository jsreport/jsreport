const command = require('commander')
const winInstallHandler = require('jsreport-cli/lib/commands/win-install').handler
const winUninstallHandler = require('jsreport-cli/lib/commands/win-uninstall').handler

module.exports = options => {
  // ignore errors so we can override configuration with nconf
  command.unknownOption = flag => {}

  command
    .version(require('./../package.json').version)
    .usage('[options]')
    .option(
      '-i, --install',
      'WINDOWS ONLY - install app as windows service, For other platforms see http://jsreport.net/on-prem/downloads',
      () => {
        winInstallHandler({
          context: {
            cwd: process.cwd()
          }
        }).catch(console.error.bind(console))
      }
    )
    .option(
      '-r, --uninstall',
      'WINDOWS ONLY - Stop and uninstall service',
      () => {
        winUninstallHandler({
          context: {
            cwd: process.cwd()
          }
        }).catch(console.error.bind(console))
      }
    )
    .parse(process.argv)
}
