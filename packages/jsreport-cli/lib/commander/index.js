// eslint-disable-next-line no-var
var semver = require('semver')
// eslint-disable-next-line no-var
var cliPackageJson = require('../../package.json')

if (!semver.satisfies(process.versions.node, cliPackageJson.engines.node)) {
  console.error(
    'jsreport cli requires to have installed a nodejs version of at least ' +
    cliPackageJson.engines.node +
    ' but you have installed version ' + process.versions.node + '. please update your nodejs version and try again'
  )

  process.exit(1)
}

const events = require('events')
const isAbsoluteUrl = require('is-absolute-url')
const createLogger = require('./createLogger')
const createCommandParser = require('./createCommandParser')
const registerCommand = require('./registerCommand')
const executeCommand = require('./executeCommand')
const startProcessing = require('./startProcessing')
const daemonHandler = require('../daemonHandler')
const keepAliveProcess = require('../keepAliveProcess')
const getTempPaths = require('../utils/getTempPaths')
const { printError } = require('../utils/error')

const helpCmd = require('../commands/help')
const initCmd = require('../commands/init')
const repairCmd = require('../commands/repair')
const winInstallCmd = require('../commands/win-install')
const winUninstallCmd = require('../commands/win-uninstall')
const configureCmd = require('../commands/configure')
const startCmd = require('../commands/start')
const renderCmd = require('../commands/render')
const killCmd = require('../commands/kill')

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
    this._commandModules = {}
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

    this._globalOptions = AVAILABLE_GLOBAL_OPTIONS

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
    // starting the parsing of cliHandler
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
            requiresArg: true
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
          .check((argv, hash) => {
            if (argv.serverUrl != null && !isAbsoluteUrl(argv.serverUrl)) {
              const error = new Error('serverUrl option must be a valid absolute url')
              error.cleanState = true
              throw error
            }

            return true
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

  registerCommand (commandModule) {
    registerCommand(this, commandModule)
    return this
  }

  async executeCommand (commandName, argv) {
    return executeCommand(this, commandName, argv)
  }

  start (args) {
    const verboseMode = args.includes('--verbose') || args.includes('-b')
    const { logger } = createLogger(verboseMode)

    startProcessing(this, logger, args).then((resultInfo) => {
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
      await startProcessing(this, logger, args)
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
