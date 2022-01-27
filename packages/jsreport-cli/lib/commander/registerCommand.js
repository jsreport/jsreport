const createCustomCommandBuilder = require('./createCustomCommandBuilder')
const executeCommand = require('./executeCommand')

module.exports = function registerCommand (commander, rawCommandModule) {
  const globalOptions = commander._globalOptions
  const commandBuilder = rawCommandModule.builder || ((yargs) => (yargs))
  const commandConfiguration = Object.assign({}, rawCommandModule.configuration)
  let commandGlobalOptions = Object.assign([], commandConfiguration.globalOptions)

  if (typeof rawCommandModule.command !== 'string' || !rawCommandModule.command) {
    throw new Error('command module must have a .command property of type string')
  }

  // we do this because .command can include positional arguments like "command <requiredArg> [optionalArg]"
  const commandName = rawCommandModule.command.split(' ')[0].trim()

  if (typeof rawCommandModule.description !== 'string') {
    throw new Error('command module must have a .description property of type string')
  }

  if (typeof rawCommandModule.handler !== 'function') {
    throw new Error('command module must have a .handler property of type function')
  }

  if (commandBuilder != null && typeof commandBuilder !== 'function') {
    throw new Error('command module .builder property must be a function')
  }

  if (commander._disabledCommands.indexOf(commandName) !== -1) {
    return
  }

  if (commandGlobalOptions) {
    commandGlobalOptions = commandGlobalOptions.map((opt) => {
      if (globalOptions.options.indexOf(opt) === -1) {
        return null
      }

      return opt
    })

    // removing invalid options
    commandGlobalOptions.filter(Boolean)

    // always add some options to global
    globalOptions.alwaysGlobal.forEach((opt) => {
      if (commandGlobalOptions.indexOf(opt) === -1) {
        commandGlobalOptions.unshift(opt)
      }
    })
  } else {
    // always add some options to global
    commandGlobalOptions = globalOptions.alwaysGlobal
  }

  commandConfiguration.globalOptions = commandGlobalOptions

  const bindedHandler = executeCommand.bind(null, commander, commandName)

  commander._commandsConfig[commandName] = commandConfiguration

  const customCommandBuilder = createCustomCommandBuilder(commander, {
    commandName,
    commandDescription: rawCommandModule.description,
    commandBuilder,
    commandConfig: commandConfiguration,
    globalOptions
  })

  const commandModule = Object.assign({}, rawCommandModule, {
    builder: customCommandBuilder,
    handler: async (argv) => {
      const disableExit = commandConfiguration.disableProcessExit === true

      try {
        await bindedHandler(argv)
      } catch (err) {
        err.disableExit = disableExit
        throw err
      }
    }
  })

  commander._cli.command(commandModule)

  commander._commands[commandName] = rawCommandModule
  commander._commandModules[commandName] = commandModule
  commander._commandNames.push(commandName)

  commander.emit('command.register', commandName, rawCommandModule)
}
