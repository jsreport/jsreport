const Yargs = require('yargs/yargs')
const { nanoid } = require('nanoid')
const createCommandParser = require('./createCommandParser')
const jsreportInstance = require('./jsreportInstance')

// check the command to see if we should handle jsreport instance
// initialization first or just delegate the command to cli handler
module.exports = async function startCommand (commander, commandName, args, options, onBeforeCLIParse) {
  const logger = options.logger
  const verbose = options.verbose
  // creating a new context based on properties of commander's context
  const context = Object.assign({}, commander.context)
  const startImmediately = options.startImmediately === true || commander._commands[commandName] != null

  // we need to handle the help option directly since there is a conflict
  // in yargs when a custom command is called the same that the option used in .help()
  // (that option registers an implicit command with the same name that the option passed)
  if (commandName === 'help') {
    // disable the implicit help command when the main command to execute is "help",
    // this allows our custom command to run
    commander._cli.help(false)
  }

  context.logger = logger

  context.getCommandHelp = getCommandHelp(commander, commandName, verbose, context)

  if (commander._daemonExecPath || commander._daemonExecArgs || commander._daemonExecOpts || commander._daemonExecScriptPath) {
    context.daemonExec = {}

    if (commander._daemonExecPath) {
      context.daemonExec.path = commander._daemonExecPath
    }

    if (commander._daemonExecArgs) {
      context.daemonExec.args = commander._daemonExecArgs
    }

    if (commander._daemonExecOpts) {
      context.daemonExec.opts = commander._daemonExecOpts
    }

    if (commander._daemonExecScriptPath) {
      context.daemonExec.scriptPath = commander._daemonExecScriptPath
    }
  }

  if (startImmediately) {
    // passing getInstance and initInstance as context
    // to commands when they should ignore the entry point
    context.getInstance = jsreportInstance.getInstance(commander, commander._jsreportInstance, logger.debug)
    context.initInstance = jsreportInstance.initInstance(commander, verbose)

    throwIfCommandIsNotValid(commander, commandName, onBeforeCLIParse)

    const commandConfig = commander._commandsConfig[commandName]

    if (commandConfig && commandConfig.globalOptions) {
      commandConfig.globalOptions.forEach((optName) => {
        commander._cli.global(optName)
      })
    }

    onBeforeCLIParse()

    // delegating the command to the CLI and activating it
    await startCLI(logger, commander, commandName, args, context)

    return
  }

  // at this point command was not found so we need to get jsreport instance and
  // read extensions and look if any of those define the command
  try {
    logger.debug(`Searching for command "${commandName}" in extensions`)

    let getInstancePromise

    if (commander._jsreportInstance) {
      getInstancePromise = Promise.resolve(commander._jsreportInstance)
    } else {
      getInstancePromise = jsreportInstance.getInstance(commander, null, logger.debug, commander.cwd)
    }

    const instanceOrFn = await getInstancePromise
    const instance = typeof instanceOrFn === 'function' ? instanceOrFn() : instanceOrFn

    context.getInstance = jsreportInstance.getInstance(commander, instance, logger.debug)
    context.initInstance = jsreportInstance.initInstance(commander, verbose)

    await jsreportInstance.findAndLoadExtensionsCommands(instance, commander, verbose)

    throwIfCommandIsNotValid(commander, commandName, onBeforeCLIParse)

    const commandConfig = commander._commandsConfig[commandName]

    if (commandConfig && commandConfig.globalOptions) {
      commandConfig.globalOptions.forEach((optName) => {
        commander._cli.global(optName)
      })
    }

    onBeforeCLIParse()
  } catch (e) {
    onBeforeCLIParse(e)
    throw e
  }

  await startCLI(logger, commander, commandName, args, context)
}

async function startCLI (logger, commander, commandName, args, context) {
  const cli = commander._cli

  commander.emit('parsing', args, context)

  let error
  let output

  try {
    const result = await parseCLI(cli, args, context)
    error = result.error
    output = result.output
  } catch (e) {
    commander.emit('parsed', e, args, context)

    const error = new Error(`An error ocurred while trying to execute "${commandName}" command`)
    error.originalError = e

    throw error
  }

  if (error) {
    commander.emit('parsed', error, args, context)

    if (output != null && output !== '') {
      logger.error(output)
    }

    error.exitDirectly = true

    throw error
  }

  commander.emit('parsed', null, args, context)

  if (output != null && output !== '') {
    logger.info(output)
  }
}

async function parseCLI (cli, args, context) {
  let error
  let output

  await cli.parseAsync(args, { context }, (_error, _argv, resultOutput) => {
    output = resultOutput

    if (_error) {
      error = _error
    }
  })

  return { error, output }
}

function getCommandHelp (commander, originCommandName, verbose, context) {
  return async (command) => {
    let customYargs
    let out

    if (!commander._commands[command]) {
      let instance

      try {
        const instanceOrFn = await context.getInstance()
        instance = typeof instanceOrFn === 'function' ? instanceOrFn() : instanceOrFn
      } catch (e) {}

      if (instance) {
        await jsreportInstance.findAndLoadExtensionsCommands(instance, commander, verbose)
      }
    }

    const commandModule = commander._commandModules[command]

    if (commandModule) {
      customYargs = createCommandParser(Yargs([]), commander.cliName).command(commandModule)
    }

    if (customYargs) {
      let helpArg = '-h'

      if (originCommandName === 'help') {
        const randomHelpArg = nanoid(5)
        customYargs.help(randomHelpArg).hide(randomHelpArg)
        helpArg = randomHelpArg
      }

      const { error, output } = await parseCLI(customYargs, [command, helpArg], context)

      if (error) {
        throw error
      }

      out = output
    } else {
      const error = new Error(`"${command}" command not available to inspect information, to get the list of commands supported on your installation run "jsreport -h" and try again with a supported command`)
      error.cleanState = true
      error.notFound = true
      throw error
    }

    return out
  }
}

function throwIfCommandIsNotValid (commander, commandName, onBeforeThrow) {
  if (!commander._commands[commandName]) {
    const error = new Error(
      '"' + commandName + '" command not found in this installation, ' +
      'check that you are writing the command correctly or check if the command ' +
      'is available in your installation, use "jsreport -h" to see the list of available commands'
    )

    error.cleanState = true

    if (onBeforeThrow) {
      onBeforeThrow(error)
    }

    throw error
  }
}
