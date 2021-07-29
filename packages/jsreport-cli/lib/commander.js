'use strict'

var semver = require('semver')
var cliPackageJson = require('../package.json')

if (!semver.satisfies(process.versions.node, cliPackageJson.engines.node)) {
  console.error(
    'jsreport cli requires to have installed a nodejs version of at least ' +
    cliPackageJson.engines.node +
    ' but you have installed version ' + process.versions.node + '. please update your nodejs version and try again'
  )

  process.exit(1)
}

const events = require('events')
const nanoid = require('nanoid')
const isAbsoluteUrl = require('is-absolute-url')
const yargs = require('yargs')
const Yargs = require('yargs/yargs')
const prompt = require('prompt-tmp')
const packageJson = require('../package.json')
const createCommandParser = require('./createCommandParser')
const registerExtensionsCommands = require('./registerExtensionsCommands')
const daemonHandler = require('./daemonHandler')
const keepAliveProcess = require('./keepAliveProcess')
const instanceHandler = require('./instanceHandler')
const getTempPaths = require('./getTempPaths')
const { printError } = require('./errorUtils')
const helpCmd = require('./commands/help')
const initCmd = require('./commands/init')
const repairCmd = require('./commands/repair')
const winInstallCmd = require('./commands/win-install')
const winUninstallCmd = require('./commands/win-uninstall')
const configureCmd = require('./commands/configure')
const startCmd = require('./commands/start')
const renderCmd = require('./commands/render')
const killCmd = require('./commands/kill')

let BUILT_IN_COMMAND_MODULES = {
  help: helpCmd,
  init: initCmd,
  repair: repairCmd,
  'win-install': winInstallCmd,
  'win-uninstall': winUninstallCmd,
  configure: configureCmd,
  start: startCmd,
  render: renderCmd,
  kill: killCmd
}

const AVAILABLE_GLOBAL_OPTIONS = {
  options: [
    'context',
    'verbose',
    // tempDirectory was added just for compatibility with jsreport.exe
    'tempDirectory',
    'serverUrl',
    'user',
    'password'
  ],
  alwaysGlobal: ['context', 'verbose', 'tempDirectory']
}

BUILT_IN_COMMAND_MODULES = Object.keys(BUILT_IN_COMMAND_MODULES).map((key) => BUILT_IN_COMMAND_MODULES[key])

const tempPaths = getTempPaths()
const CLI_PATH = tempPaths.cliPath
const MAIN_SOCK_PATH = tempPaths.mainSockPath
const WORKER_SOCK_PATH = tempPaths.workerSockPath

tempPaths.createPaths()

class Commander extends events.EventEmitter {
  constructor (cwd, options = {}) {
    super()

    let cliHandler

    events.EventEmitter.call(this)

    this.cwd = cwd || process.cwd()

    this.execution = options.execution

    this.context = {
      cwd: this.cwd,
      sockPath: MAIN_SOCK_PATH,
      workerSockPath: WORKER_SOCK_PATH,
      staticPaths: options.staticPaths || {},
      daemonHandler,
      keepAliveProcess,
      appInfo: options.appInfo
    }

    if (this.execution) {
      if (!this.context.staticPaths.nssm) {
        this.context.staticPaths.nssm = process.arch === 'x64' ? this.execution.resourceTempPath('nssm64.exe') : this.execution.resourceTempPath('nssm.exe')
      }
    }

    this._commands = {}
    this._commandHandlers = {}
    this._commandNames = []
    this._commandsConfig = {}

    if (options.builtInCommands) {
      this._builtInCommands = options.builtInCommands
    } else {
      this._builtInCommands = BUILT_IN_COMMAND_MODULES
    }

    if (options.disabledCommands) {
      this._disabledCommands = options.disabledCommands
    } else {
      this._disabledCommands = []
    }

    this._builtInCommandNames = this._builtInCommands.map((cmdModule) => cmdModule.command)

    this._showHelpWhenNoCommand = options.showHelpWhenNoCommand != null ? Boolean(options.showHelpWhenNoCommand) : true

    // this option tell us that we should use this value as the instance
    // and not try to look up for it
    this._jsreportInstance = options.instance

    // reference to the jsreport instance initiated, this variable will be set
    // when the CLI has initialized a jsreport instance successfully
    this.jsreportInstanceInitiated = null

    // this option tell us that we should use this value as the instance version
    // and not try to look up for it
    this._jsreportVersion = options.jsreportVersion

    // this option tell us that we should use this path as the executable
    // to spawn when we need to use a daemonized process
    this._daemonExecPath = options.daemonExecPath

    // optional path to script being run in the daemonized process
    this._daemonExecScriptPath = options.daemonExecScriptPath

    // this option tell us that we should additionally pass this arguments
    // to the executable when we need to use a daemonized process
    this._daemonExecArgs = options.daemonExecArgs

    // this option tell us that we should additionally pass this options
    // to child_process.spawn when we need to use a daemonized process
    this._daemonExecOpts = options.daemonExecOpts

    if (this.execution) {
      if (this._daemonExecOpts == null || this._daemonExecOpts.WinRunPath == null) {
        this._daemonExecOpts = this._daemonExecOpts || {}
        this._daemonExecOpts.WinRunPath = this.execution.resourceTempPath('WinRun.exe')
      }
    }

    // lazy initialization of cli handler, commands will be activated when
    // doing cliHandler.parse()
    if (options.cli) {
      cliHandler = createCommandParser(options.cli, options.cliName)
    } else {
      cliHandler = (
        createCommandParser(undefined, options.cliName)
          .option('verbose', {
            global: false,
            alias: 'b',
            description: 'Enables verbose mode',
            type: 'boolean'
          })
          .option('tempDirectory', {
            global: false,
            description: 'Specifies the temp directory that will be used to store temp files and resources',
            type: 'string'
          })
          .option('serverUrl', {
            global: false,
            alias: 's',
            description: 'Specifies a url to a remote jsreport server, that server will be the target of the command (only if command support this mode)',
            type: 'string',
            requiresArg: true,
            coerce: (value) => {
              if (!isAbsoluteUrl(value)) {
                let error = new Error('serverUrl option must be a valid absolute url')
                error.cleanState = true
                throw error
              }

              return value
            }
          })
          .option('user', {
            global: false,
            alias: 'u',
            description: 'Specifies a username for authentication against a jsreport server (Use if some command needs authentication information)',
            type: 'string',
            requiresArg: true
          })
          .option('password', {
            global: false,
            alias: 'p',
            description: 'Specifies a password for authentication against a jsreport server (Use if some command needs authentication information)'
          })
          .strict()
      )
    }

    this._cli = cliHandler

    this.cliName = this._cli.$0

    // registering built-in commands
    this._builtInCommands.forEach((commandModule) => this.registerCommand(commandModule))

    setImmediate(() => this.emit('initialized'))

    return this
  }

  getCommands () {
    return this._commandNames
  }

  async executeCommand (commandName, argv) {
    const command = this._commands[commandName]

    if (!command) {
      throw new Error('"' + commandName + '" command is not a valid command')
    }

    if (typeof command.handler !== 'function') {
      throw new Error('"' + commandName + '" command doesn\'t have a valid handler')
    }

    const commandHandler = command.handler

    this.emit('command.init', commandName, argv)
    this.emit(getCommandEventName(commandName, 'init'), argv)

    let resolveValue

    try {
      resolveValue = await commandHandler(argv)
      this.emit('command.success', commandName, resolveValue)
      this.emit(getCommandEventName(commandName, 'success'), resolveValue)

      return resolveValue
    } catch (errorInCommand) {
      this.emit('command.error', commandName, errorInCommand)
      this.emit(getCommandEventName(commandName, 'error'), errorInCommand)
      // propagating error
      throw errorInCommand
    } finally {
      this.emit('command.finish', commandName)
      this.emit(getCommandEventName(commandName, 'finish'))
    }
  }

  registerCommand (commandModule) {
    const commandBuilder = commandModule.builder || ((yargs) => (yargs))
    const commandConfiguration = Object.assign({}, commandModule.configuration)
    let commandGlobalOptions = Object.assign([], commandConfiguration.globalOptions)

    if (typeof commandModule.command !== 'string' || !commandModule.command) {
      throw new Error('command module must have a .command property of type string')
    }

    // we do this because .command can include positional arguments like "command <regiredArg> [optionalArg]"
    const commandName = commandModule.command.split(' ')[0].trim()

    if (typeof commandModule.description !== 'string') {
      throw new Error('command module must have a .description property of type string')
    }

    if (typeof commandModule.handler !== 'function') {
      throw new Error('command module must have a .handler property of type function')
    }

    if (commandBuilder != null && typeof commandBuilder !== 'function') {
      throw new Error('command module .builder property must be a function')
    }

    if (this._disabledCommands.indexOf(commandName) !== -1) {
      return
    }

    if (commandGlobalOptions) {
      commandGlobalOptions = commandGlobalOptions.map((opt) => {
        if (AVAILABLE_GLOBAL_OPTIONS.options.indexOf(opt) === -1) {
          return null
        }

        return opt
      })

      // removing invalid options
      commandGlobalOptions.filter(Boolean)

      // always add some options to global
      AVAILABLE_GLOBAL_OPTIONS.alwaysGlobal.forEach((opt) => {
        if (commandGlobalOptions.indexOf(opt) === -1) {
          commandGlobalOptions.unshift(opt)
        }
      })
    } else {
      // always add some options to global
      commandGlobalOptions = AVAILABLE_GLOBAL_OPTIONS.alwaysGlobal
    }

    commandConfiguration.globalOptions = commandGlobalOptions

    // wrapping builder to allow some customizations
    const newBuilder = (yargs) => {
      const commandConfig = this._commandsConfig[commandName]
      let shouldGenerateUsage = true
      let originalUsageFn
      let originalCheckFn
      let originalOptionFn
      let originalOptionsFn
      let commandCheckFn
      let modYargs

      if (typeof yargs.usage === 'function') {
        originalUsageFn = yargs.usage

        // we expose .usage but just for the message case
        yargs.usage = (msg) => {
          shouldGenerateUsage = false
          return originalUsageFn.apply(yargs, [msg])
        }
      }

      if (typeof yargs.check === 'function') {
        originalCheckFn = yargs.check

        yargs.check = (fn) => {
          commandCheckFn = fn
          return yargs
        }
      }

      if (typeof yargs.option === 'function') {
        originalOptionFn = yargs.option

        // default options to be global: false
        yargs.option = (key, opt) => {
          if (opt && opt.global == null) {
            opt.global = false
          }

          return originalOptionFn.apply(yargs, [key, opt])
        }
      }

      if (typeof yargs.options === 'function') {
        originalOptionsFn = yargs.options

        // default options to be global: false
        yargs.options = (keyOrOpts, opt) => {
          if (keyOrOpts && opt == null) {
            Object.entries(keyOrOpts).forEach(([key, keyConf]) => {
              if (keyConf && keyConf.global == null) {
                keyConf.global = false
              }
            })
          }

          if (opt && opt.global == null) {
            opt.global = false
          }

          return originalOptionFn.apply(yargs, [keyOrOpts, opt])
        }
      }

      modYargs = commandBuilder(yargs)

      if (typeof yargs.usage === 'function') {
        yargs.usage = originalUsageFn
        modYargs.usage = originalUsageFn

        if (shouldGenerateUsage) {
          modYargs.usage(commandModule.description + '\n\nUsage:\n\njsreport ' + commandName)
        }
      }

      if (typeof yargs.check === 'function') {
        yargs.check = originalCheckFn
        modYargs.check = originalCheckFn
      }

      if (typeof yargs.option === 'function') {
        yargs.option = originalOptionFn
        modYargs.option = originalOptionFn
      }

      if (typeof yargs.options === 'function') {
        yargs.options = originalOptionsFn
        modYargs.options = originalOptionsFn
      }

      modYargs.check((...args) => {
        const argv = args[0]
        const commandConfig = this._commandsConfig[commandName]

        const unsupportedGlobalOptions = AVAILABLE_GLOBAL_OPTIONS.options.filter((opt) => {
          return commandConfig.globalOptions.indexOf(opt) === -1
        })

        unsupportedGlobalOptions.forEach((opt) => {
          if (argv[opt]) {
            throw new Error(opt + ' global option is not supported in this command')
          }
        })

        if (commandCheckFn) {
          return commandCheckFn.apply(undefined, args)
        }

        return true
      }, false)

      if (typeof modYargs.fail === 'function') {
        // making command strict and registering a generalized fail function
        modYargs.fail((msg, err) => {
          // do nothing when error comes from command promise itself,
          // the propagation of error will be done automatically by promise chain
          if (msg == null) {
            return
          }

          this.emit('command.error', commandName, err)
          this.emit(getCommandEventName(commandName, 'error'), err)

          const defaultErr = new Error(`${commandName} command error:\n${msg}\ntype jsreport ${commandName} -h to get help about usage and available options`)

          defaultErr.cleanState = true

          throw defaultErr
        })
      }

      if (commandConfig.disableStrictOptions !== true) {
        modYargs.strict()
      } else {
        modYargs.strict(false)
      }

      return modYargs
    }

    const bindedHandler = this.executeCommand.bind(this, commandName)

    this._commandsConfig[commandName] = commandConfiguration

    const commandHandler = Object.assign({}, commandModule, {
      builder: newBuilder,
      handler: (argv) => {
        const commandConfig = this._commandsConfig[commandName]
        const disableExit = commandConfig.disableProcessExit === true

        const commandPromise = bindedHandler(argv)
          .then(() => {
            return undefined
          })
          .catch(function (err) {
            err.disableExit = disableExit
            throw err
          })

        argv.commandPromise = commandPromise

        return commandPromise
      }
    })

    this._cli.command(commandHandler)

    this._commands[commandName] = commandModule
    this._commandHandlers[commandName] = commandHandler
    this._commandNames.push(commandName)

    this.emit('command.register', commandName, commandModule)

    return this
  }

  start (args) {
    const verboseMode = args.includes('--verbose') || args.includes('-b')
    const { logger } = createLogger(verboseMode)

    startProccesing(this, logger, args).then((resultInfo) => {
      const commandHandled = resultInfo != null ? resultInfo.command : undefined
      const disableExit = commandHandled != null && this._commandsConfig[commandHandled] ? this._commandsConfig[commandHandled].disableProcessExit === true : false

      if (disableExit !== true) {
        process.exit(0)
      }
    }).catch((err) => {
      if (err.exitDirectly) {
        return process.exit(1)
      }

      printError(err, logger)

      if (err.disabledExit !== true) {
        process.exit(1)
      }
    })
  }

  async startAndWait (args) {
    const verboseMode = args != null && (args.includes('--verbose') || args.includes('-b'))
    const { logger, getLogs } = createLogger(verboseMode)
    let error

    try {
      await startProccesing(this, logger, args)
    } catch (e) {
      error = e

      if (e.exitDirectly !== true) {
        printError(e, logger)
      }
    }

    const logs = getLogs()

    return { error, logs }
  }
}

module.exports = (cwd, options = {}) => new Commander(cwd, options)

module.exports.cliPath = CLI_PATH
module.exports.mainSockPath = MAIN_SOCK_PATH
module.exports.workerSockPath = WORKER_SOCK_PATH

function createLogger (verboseMode) {
  const logs = []

  const logger = {
    debug: (...messages) => {
      const msg = messages.join(' ')

      if (verboseMode) {
        logs.push({
          type: 'debug',
          message: msg
        })

        console.log(...messages)
      }
    },
    info: (...messages) => {
      const msg = messages.join(' ')

      logs.push({
        type: 'info',
        message: msg
      })

      console.log(...messages)
    },
    error: (...messages) => {
      const msg = messages.join(' ')

      logs.push({
        type: 'error',
        message: msg
      })

      console.error(...messages)
    }
  }

  return { logger, getLogs: () => logs }
}

async function startProccesing (commander, logger, args) {
  process.env.JSREPORT_CLI = true

  if (!Array.isArray(args) && typeof args !== 'string') {
    throw new Error('args must be an array or string')
  }

  commander.emit('starting')

  const userArgv = yargs([]).help(false).version(false).parse(args)

  const versionRequired = userArgv.version || userArgv.v
  const helpRequired = userArgv.help || userArgv.h
  const needsPassword = userArgv.password || userArgv.p
  const verboseMode = userArgv.verbose || userArgv.b

  if (userArgv._.length === 0) {
    const willShowHelpExplicitly = commander._showHelpWhenNoCommand && !versionRequired && !helpRequired

    commander.emit('started', null, { handled: versionRequired || helpRequired || willShowHelpExplicitly, mainCommand: null })

    commander.emit('parsing', args, commander.context)

    let instance

    try {
      instance = await getInstance(commander, commander._jsreportInstance, () => {}, commander.cwd)
    } catch (e) {}

    if (instance && (helpRequired || willShowHelpExplicitly)) {
      await findAndLoadExtensionsCommands(instance, commander, verboseMode)
    }

    let parsed = false

    // activating CLI
    try {
      let output = await new Promise((resolve, reject) => {
        commander._cli.parse(args, (error, argv, output) => {
          if (error) {
            if (output != null && output !== '') {
              logger.error(output)
            }

            error.exitDirectly = true

            return reject(error)
          }

          resolve(output)
        })
      })

      commander.emit('parsed', null, args, commander.context)

      parsed = true

      if (versionRequired) {
        return handleVersionOption(
          commander._jsreportVersion ? {
            version: commander._jsreportVersion
          } : (typeof instance === 'function' ? instance() : instance),
          logger
        )
      }

      if (
        willShowHelpExplicitly &&
        !args.includes('--help') &&
        !args.includes('-h')
      ) {
        output = await new Promise((resolve, reject) => {
          const newArgs = [...args, '--help']

          commander._cli.parse(newArgs, (error, argv, output) => {
            if (error) {
              return reject(error)
            }

            resolve(output)
          })
        })
      }

      if (output != null && output !== '') {
        logger.info(output)
      }
    } catch (e) {
      if (!parsed) {
        commander.emit('parsed', e, args, commander.context)
      }

      throw e
    }

    return
  }

  const mainCommandReceived = userArgv._[0]

  const startInmediatly = (
    // if command is built-in and version or help options is activated
    (commander._builtInCommandNames.indexOf(mainCommandReceived) !== -1 && (versionRequired || helpRequired))
  )

  const optionsForStart = {
    startInmediatly,
    logger,
    verbose: verboseMode
  }

  const commandConfiguration = commander._commandsConfig[mainCommandReceived] || {}

  let beforeCLIParseCbCalled = false

  const onBeforeCLIParse = (err) => {
    if (beforeCLIParseCbCalled) {
      return
    }

    beforeCLIParseCbCalled = true

    const isSupportedCommand = commander._commandNames.indexOf(mainCommandReceived) !== -1

    if (err) {
      return commander.emit('started', err, null)
    }

    commander.emit('started', null, {
      handled: isSupportedCommand || versionRequired || (isSupportedCommand && helpRequired),
      mainCommand: mainCommandReceived
    })
  }

  if (
    needsPassword &&
    commandConfiguration.globalOptions &&
    commandConfiguration.globalOptions.indexOf('password') !== -1
  ) {
    if (typeof needsPassword === 'string') {
      // we add middleware to pre-define the "p/password" option to
      commander._cli.middleware((argv) => {
        argv.p = needsPassword
        argv.password = needsPassword
      }, true)
    } else {
      await new Promise((resolve, reject) => {
        prompt.start()

        prompt.message = ''

        prompt.get([{
          name: 'password',
          description: 'Password',
          message: 'Password can\'t be empty',
          type: 'string',
          hidden: true,
          required: true
        }], (err, result) => {
          if (err) {
            const errorToReject = new Error('No value for password option')
            errorToReject.cleanState = true

            commander.emit('started', errorToReject, null)

            return reject(errorToReject)
          }

          // we add middleware to pre-define the "p/password" option to
          commander._cli.middleware((argv) => {
            argv.p = result.password
            argv.password = result.password
          }, true)

          resolve()
        })
      })
    }
  }

  await handleCommand(commander, mainCommandReceived, args, optionsForStart, onBeforeCLIParse)

  return { command: mainCommandReceived }
}

// check the command to see if we should handle jsreport instance
// initialization first or just delegate the command to cli handler
async function handleCommand (commander, commandName, args, options, onBeforeCLIParse) {
  const logger = options.logger
  const verbose = options.verbose
  // creating a new context based on properties of commander's context
  const context = Object.assign({}, commander.context)
  const startInmediatly = options.startInmediatly === true || commander._commands[commandName] != null

  // we need to handle the help option directly since there is a conflict
  // in yargs when a custom command is called the same that the option used in .help()
  // (that option registers an implicit command with the same name that the option passed)
  if (commandName === 'help') {
    // disable the implicit help command when the main command to execute is "help",
    // this allows our custom command to run
    commander._cli.help(false)
  }

  context.logger = logger

  context.getCommandHelp = async (command) => {
    let customYargs
    let out

    if (!commander._commands[command]) {
      let instance

      try {
        const instanceOrFn = await context.getInstance()
        instance = typeof instanceOrFn === 'function' ? instanceOrFn() : instanceOrFn
      } catch (e) {}

      if (instance) {
        await findAndLoadExtensionsCommands(instance, commander, verbose)
      }
    }

    const commandHandler = commander._commandHandlers[command]

    if (commandHandler) {
      customYargs = createCommandParser(Yargs([]), commander.cliName).command(commandHandler)
    }

    if (customYargs) {
      let helpArg = '-h'

      if (commandName === 'help') {
        const randomHelpArg = nanoid(5)
        customYargs.help(randomHelpArg).hide(randomHelpArg)
        helpArg = randomHelpArg
      }

      parseCLI(customYargs, [command, helpArg], context, (err, result) => {
        if (err) {
          throw err
        }

        out = result
      })
    } else {
      const error = new Error(`"${command}" command not available to inspect information, to get the list of commands supported on your installation run "jsreport -h" and try again with a supported command`)
      error.cleanState = true
      error.notFound = true
      throw error
    }

    return out
  }

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

  if (startInmediatly) {
    // passing getInstance and initInstance as context
    // to commands when they should ignore the entry point
    context.getInstance = getInstance(commander, commander._jsreportInstance, logger.debug)
    context.initInstance = initInstance(commander, verbose)

    throwIfCommandIsNotValid(commander, context, commandName, onBeforeCLIParse)

    const commandConfig = commander._commandsConfig[commandName]

    if (commandConfig && commandConfig.globalOptions) {
      commandConfig.globalOptions.forEach((optName) => {
        commander._cli.global(optName)
      })
    }

    onBeforeCLIParse()

    // delegating the command to the CLI and activating it
    await startCLI(logger, commander, args, context)

    return
  }

  // at this point command was not found so we need to get jsreport instance and
  // read extensions and look if any of those define the command
  try {
    logger.debug(`Searching for command "${commandName}" in extensions`)

    const getInstanceAsync = commander._jsreportInstance ? (
      Promise.resolve(commander._jsreportInstance)
    ) : getInstance(commander, null, logger.debug, commander.cwd)

    const instanceOrFn = await getInstanceAsync
    const instance = typeof instanceOrFn === 'function' ? instanceOrFn() : instanceOrFn

    context.getInstance = getInstance(commander, instance, logger.debug)
    context.initInstance = initInstance(commander, verbose)

    await findAndLoadExtensionsCommands(instance, commander, verbose)

    throwIfCommandIsNotValid(commander, context, commandName, onBeforeCLIParse)

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

  await startCLI(logger, commander, args, context)
}

async function startCLI (logger, commander, args, context) {
  const cli = commander._cli

  await new Promise((resolve, reject) => {
    try {
      commander.emit('parsing', args, context)

      parseCLI(cli, args, context, (error, { argv, context, output }) => {
        if (error) {
          commander.emit('parsed', error, args, context)

          if (output != null && output !== '') {
            logger.error(output)
          }

          error.exitDirectly = true

          return reject(error)
        }

        commander.emit('parsed', null, args, context)

        if (output != null && output !== '') {
          logger.info(output)
        }

        if (argv.commandPromise && typeof argv.commandPromise.then === 'function') {
          resolve(argv.commandPromise)
        } else {
          resolve()
        }
      })
    } catch (e) {
      commander.emit('parsed', e, args, context)

      const error = new Error(`An error ocurred while trying to execute a command`)
      error.originalError = e

      throw error
    }
  })
}

function parseCLI (cli, args, context, cb) {
  cli.parse(args, { context }, (error, argv, output) => {
    if (error) {
      cb(error, { args, context, output })
      return
    }

    cb(null, { args, argv, context, output })
  })
}

function getInstance (commander, prevInstance, log, cwd) {
  const args = Array.prototype.slice.call(arguments)

  if (args.length === 3) {
    return _getInstance_.bind(undefined, commander, prevInstance, log)
  }

  return _getInstance_(commander, prevInstance, log, cwd)

  function _getInstance_ (commander, prevInstance, log, cwd) {
    if (prevInstance) {
      log('using jsreport instance passed from options')

      return Promise.resolve(prevInstance)
    }

    commander.emit('instance.lookup')

    if (cwd == null) {
      cwd = commander.cwd
    }

    return (
      instanceHandler
        .find(cwd)
        .then((instanceInfo) => {
          if (instanceInfo.isDefault) {
            commander.emit('instance.default', instanceInfo.instance)

            log(
              'no entry point was found, creating a default instance ' +
            'using: require("' + instanceInfo.from + '")()'
            )
          } else {
            commander.emit('instance.found', instanceInfo.instance)

            log('using jsreport instance found in: ' + instanceInfo.entryPoint)
          }

          return instanceInfo.instance
        })
    )
  }
}

function initInstance (commander, verbose, instance) {
  const args = Array.prototype.slice.call(arguments)

  if (args.length === 2) {
    return _initInstance_.bind(undefined, commander, verbose)
  }

  return _initInstance_(commander, verbose, instance)

  function _initInstance_ (commander, verbose, instance, forceVerbose) {
    let verboseMode = verbose

    commander.emit('instance.initializing')

    if (forceVerbose === true) {
      verboseMode = forceVerbose
    }

    return (
      instanceHandler.initialize(instance, verboseMode)
        .then((result) => {
          commander.jsreportInstanceInitiated = instance

          commander.emit('instance.initialized', result)

          return result
        })
    )
  }
}

async function findAndLoadExtensionsCommands (instance, commander, verbose) {
  if (!instance || !instance.extensionsLoad) {
    return
  }

  if (!verbose) {
    if (instance.options.logger) {
      instance.options.logger.silent = true
    } else {
      instance.options.logger = {
        silent: true
      }
    }
  }

  await instance.extensionsLoad({ onlyLocation: true })

  await registerExtensionsCommands(instance.extensionsManager.extensions, commander)
}

function getCommandEventName (command, event) {
  return 'command' + '.' + command + '.' + event
}

function handleVersionOption (instance, logger) {
  let versionOutput = 'cli version: ' + packageJson.version

  if (instance) {
    versionOutput = 'jsreport version: ' + instance.version + '\n' + versionOutput
  }

  logger.info(versionOutput)
}

function throwIfCommandIsNotValid (commander, context, commandName, onBeforeThrow) {
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
