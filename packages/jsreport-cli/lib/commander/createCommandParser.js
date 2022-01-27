const yargs = require('yargs')

module.exports = function createCommandParser (instance, _cliName) {
  let cli = instance || yargs([])
  const cliName = _cliName || 'jsreport'
  const commandHelp = 'To show more information about a command, type: jsreport <command> -h'

  if (cliName != null && cliName !== '') {
    cli = cli.scriptName(cliName)
  }

  return (
    cli
      .usage(`Usage:\n\njsreport [options] <command> [options]\n\n${commandHelp}`)
      // this makes strict works correctly when passing unknown dashed options
      .parserConfiguration({ 'camel-case-expansion': false })
      .showHidden(false)
      .showHelpOnFail(false)
      .exitProcess(false)
      .version(false)
      .help('help', 'Show help')
      .alias('help', 'h')
      // adding version option explicitly because we have a custom handler for it
      .option('version', {
        global: false,
        alias: 'v',
        description: 'Show version number',
        type: 'boolean'
      })
      // we are only declaring the "context" option to allow passing
      // a context object for other commands,
      // it is not mean to be used by users, that why it is hidden (description: false)
      // it needs to be global because we don't know if other command will be .strict() or not
      // and could cause validation errors
      .option('context', {
        global: false,
        alias: '_context_',
        description: false, // makes the option invisible
        type: 'string' // necessary to don't have any value if option is omitted
      })
      .hide('context')
      .epilog(commandHelp)
  )
}
