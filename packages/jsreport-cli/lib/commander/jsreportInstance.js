const instanceHandler = require('../instanceHandler')
const detectAndRegisterExtensionsCommands = require('../detectAndRegisterExtensionsCommands')

module.exports.getInstance = function getInstance (commander, prevInstance, log, cwd) {
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

module.exports.initInstance = function initInstance (commander, verbose, instance) {
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

module.exports.findAndLoadExtensionsCommands = async function findAndLoadExtensionsCommands (instance, commander, verbose) {
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

  await detectAndRegisterExtensionsCommands(instance.extensionsManager.extensions, commander)
}
