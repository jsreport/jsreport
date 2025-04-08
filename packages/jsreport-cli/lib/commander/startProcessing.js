const yargs = require('yargs')
const prompts = require('prompts')
const startCommand = require('./startCommand')
const jsreportInstance = require('./jsreportInstance')
const cliPackageJson = require('../../package.json')

module.exports = async function startProcessing (commander, logger, args) {
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
      instance = await jsreportInstance.getInstance(commander, commander._jsreportInstance, () => {}, commander.cwd)
    } catch (e) {}

    if (instance && (helpRequired || willShowHelpExplicitly)) {
      await jsreportInstance.findAndLoadExtensionsCommands(instance, commander, verboseMode)
    }

    let parsed = false
    let output

    // activating CLI
    try {
      try {
        // we run the cli for it to handle args validation and handle help arg, and we can extract the output
        // from the run directly
        await commander._cli.parseAsync(args, (_error, _argv, resultOutput) => {
          // we need to use callback to be able to capture output (important for the default help)
          // unfortunately using the callback just pass the validation arg error here in the callback
          // for does not propagate to the parseAsync and does not make it to fail
          if (_error) {
            if (resultOutput != null && resultOutput !== '') {
              logger.error(resultOutput)
            }

            _error.exitDirectly = true

            throw _error
          }

          output = resultOutput
        })
      } catch (error) {
        error.exitDirectly = true
        throw error
      }

      commander.emit('parsed', null, args, commander.context)

      parsed = true

      if (versionRequired) {
        let instanceToEvaluate

        if (commander._jsreportVersion) {
          instanceToEvaluate = {
            version: commander._jsreportVersion
          }
        } else {
          if (typeof instance === 'function') {
            instanceToEvaluate = instance()
          } else {
            instanceToEvaluate = instance
          }
        }

        return handleVersionOption(instanceToEvaluate, logger)
      }

      if (
        willShowHelpExplicitly &&
        !args.includes('--help') &&
        !args.includes('-h')
      ) {
        output = await commander._cli.getHelp()
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

  const startImmediately = (
    // if command is built-in and version or help options is activated
    (commander._builtInCommandNames.indexOf(mainCommandReceived) !== -1 && (versionRequired || helpRequired))
  )

  const optionsForStart = {
    startImmediately,
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
      try {
        const response = await prompts({
          type: 'password',
          name: 'password',
          message: 'Password',
          validate: value => value.trim() === '' ? 'Password can\'t be empty' : true
        })

        // we add middleware to pre-define the "p/password" option to
        commander._cli.middleware((argv) => {
          argv.p = response.password
          argv.password = response.password
        }, true)
      } catch (error) {
        const errorToReject = new Error('No value for password option')
        errorToReject.cleanState = true

        commander.emit('started', errorToReject, null)

        throw errorToReject
      }
    }
  }

  await startCommand(commander, mainCommandReceived, args, optionsForStart, onBeforeCLIParse)

  return { command: mainCommandReceived }
}

function handleVersionOption (instance, logger) {
  let versionOutput = `cli version: ${cliPackageJson.version}`

  if (instance) {
    versionOutput = `jsreport version: ${instance.version}\n${versionOutput}`
  }

  logger.info(versionOutput)
}
