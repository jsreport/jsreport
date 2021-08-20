'use strict'

const path = require('path')
const fs = require('fs')
const isPromise = require('is-promise')
const once = require('once')

exports.initialize = function (instance, verbose) {
  if (!instance._initialized) {
    // explicitly silent jsreport logging if verboseMode is not activated
    if (!verbose) {
      if (instance.options.logger) {
        instance.options.logger.silent = true
      } else {
        instance.options.logger = {
          silent: true
        }
      }
    }

    // initializing jsreport instance
    return instance.init().then(() => {
      return instance
    }).catch((err) => {
      let msg = 'An error has occurred when trying to initialize jsreport'

      if (err.code === 'EADDRINUSE') {
        msg += ', seems like there is already a server running in port: ' + err.port
      }

      const errorToReject = new Error(msg)

      if (err.code != null) {
        errorToReject.code = err.code
      }

      errorToReject.originalError = err

      throw errorToReject
    })
  }

  return Promise.resolve(instance)
}

exports.find = function find (cwd) {
  return new Promise((resolve, reject) => {
    // finding entry point before activating CLI
    let isAlreadyResolved = false
    let existsPackageJson
    let jsreportModuleInfo
    let userPkg
    let jsreportEntryPoint
    let pathToJsreportEntryPoint

    try {
      existsPackageJson = fs.existsSync(path.join(cwd, './package.json'))
      jsreportModuleInfo = getJsreportModuleInstalled(cwd, existsPackageJson)

      if (!jsreportModuleInfo) {
        return reject(new Error(
          'Couldn\'t find a jsreport installation necessary to continue with the execution of the command, ' +
          'make sure to install jsreport first.'
        ))
      }

      if (!existsPackageJson) {
        // creating a default instance
        return resolve({
          from: jsreportModuleInfo.name,
          isDefault: true,
          instance: createDefaultInstance(
            jsreportModuleInfo.module
          )
        })
      }

      userPkg = require(path.join(cwd, './package.json'))
      jsreportEntryPoint = (userPkg.jsreport || {}).entryPoint

      if (!jsreportEntryPoint) {
        return resolve({
          from: jsreportModuleInfo.name,
          isDefault: true,
          instance: createDefaultInstance(
            jsreportModuleInfo.module
          )
        })
      }

      const pathToJsreportEntryPoint = path.resolve(cwd, jsreportEntryPoint)

      if (!fs.existsSync(pathToJsreportEntryPoint)) {
        throw new Error(`Couldn't find a jsreport entry point at: ${pathToJsreportEntryPoint}`)
      }

      const jsreportEntryPointExport = require(pathToJsreportEntryPoint)

      if (typeof jsreportEntryPointExport === 'function') {
        // prevents resolving an instance more than once
        const resolveInstanceOnce = once(resolveInstance)
        const entryPointExportResult = jsreportEntryPointExport(resolveInstanceOnce)

        if (isAlreadyResolved) {
          return
        }

        // check if function returns a promise,
        // otherwise just wait until user calls `resolveInstanceOnce`
        if (isPromise(entryPointExportResult)) {
          if (resolveInstanceOnce.called) {
            isAlreadyResolved = true
            return reject(createDuplicateResolutionError(pathToJsreportEntryPoint))
          }

          handlePromiseExport(entryPointExportResult, {
            entryPoint: pathToJsreportEntryPoint,
            resolveCheck: resolveInstanceOnce,
            jsreportModule: jsreportModuleInfo.module
          }, (err, instance) => {
            if (isAlreadyResolved) {
              return
            }

            isAlreadyResolved = true

            if (err) {
              return reject(err)
            }

            return resolve({
              from: jsreportModuleInfo.name,
              isDefault: false,
              instance: instance,
              entryPoint: pathToJsreportEntryPoint
            })
          })
        }
      } else if (isJsreportInstance(jsreportEntryPointExport, jsreportModuleInfo.module)) {
        return resolve({
          from: jsreportModuleInfo.name,
          isDefault: false,
          instance: jsreportEntryPointExport,
          entryPoint: pathToJsreportEntryPoint
        })
      } else {
        return reject(new Error(
          'Entry point must return a valid jsreport instance or a function resolving to a jsreport instance, check file in ' +
          pathToJsreportEntryPoint
        ))
      }
    } catch (e) {
      const errorToReject = new Error('An error has occurred when trying to find a jsreport instance')
      errorToReject.originalError = e

      return reject(errorToReject)
    }

    function resolveInstance (err, instance) {
      if (isAlreadyResolved) {
        return
      }

      isAlreadyResolved = true

      if (err) {
        const errorToReject = new Error('An error has occurred when trying to find a jsreport instance')
        errorToReject.originalError = err
        return reject(errorToReject)
      }

      if (!isJsreportInstance(instance, jsreportModuleInfo.module)) {
        return reject(new Error(
          'Callback in entry point must return a valid jsreport instance, check file in ' +
          pathToJsreportEntryPoint
        ))
      }

      resolve({
        from: jsreportModuleInfo.name,
        isDefault: false,
        instance: instance,
        entryPoint: pathToJsreportEntryPoint
      })
    }
  })
}

exports.isJsreportInstance = isJsreportInstance

function createDuplicateResolutionError (pathToJsreportEntryPoint) {
  return new Error(
    'jsreport instance is already resolved, are you using promise and callback at the same time? ' +
    'you should only use one way to resolve the instance from entry point, check file in ' +
    pathToJsreportEntryPoint
  )
}

function isJsreportInstance (instance, jsreportModule) {
  if (!instance) {
    return false
  }

  // only check if jsreportModule is not null or undefined
  if (jsreportModule != null) {
    return instance instanceof jsreportModule.Reporter
  }

  // if no jsreportModule is passed try to check if "instance" looks
  // like a jsreport instance
  return (
    typeof instance.init === 'function' &&
    typeof instance.render === 'function' &&
    typeof instance.afterConfigLoaded === 'function' &&
    instance.extensionsManager != null &&
    instance.beforeRenderListeners != null &&
    instance.afterRenderListeners != null
  )
}

function createDefaultInstance (jsreportModule) {
  return jsreportModule()
}

function handlePromiseExport (promiseToInstance, options, cb) {
  const entryPoint = options.entryPoint
  const jsreportModule = options.jsreportModule
  const resolveCheck = options.resolveCheck

  promiseToInstance.then((jsreportInstance) => {
    if (resolveCheck.called) {
      return cb(createDuplicateResolutionError(entryPoint))
    }

    if (!isJsreportInstance(jsreportInstance, jsreportModule)) {
      return cb(
        new Error(
          'Promise in entry point must resolve to a jsreport instance, check file in ' +
          entryPoint
        )
      )
    }

    cb(null, jsreportInstance)
  }).catch((getJsreportInstanceError) => {
    if (resolveCheck.called) {
      return cb(createDuplicateResolutionError(entryPoint))
    }

    cb(getJsreportInstanceError)
  })
}

function getJsreportModuleInstalled (cwd, existsPackageJson) {
  let detectedJsreport
  let detectedModule

  if (existsPackageJson) {
    const userPkg = require(path.join(cwd, './package.json'))
    const userDependencies = userPkg.dependencies || {}

    if (userDependencies.jsreport) {
      detectedJsreport = 'jsreport'
    } else if (userDependencies['@jsreport/jsreport-core']) {
      detectedJsreport = '@jsreport/jsreport-core'
    } else if (userDependencies['jsreport-core']) {
      detectedJsreport = 'jsreport-core'
    }
  }

  if (!detectedJsreport) {
    if (fs.existsSync(path.join(cwd, 'node_modules/jsreport'))) {
      detectedJsreport = 'jsreport'
    } else if (fs.existsSync(path.join(cwd, 'node_modules/@jsreport/jsreport-core'))) {
      detectedJsreport = '@jsreport/jsreport-core'
    } else if (fs.existsSync(path.join(cwd, 'node_modules/jsreport-core'))) {
      detectedJsreport = 'jsreport-core'
    }
  }

  if (!detectedJsreport) {
    return null
  }

  try {
    // always require top-level package from cwd
    detectedModule = require(require.resolve(path.join(cwd, 'node_modules', detectedJsreport)))

    detectedModule = {
      name: detectedJsreport,
      module: detectedModule
    }
  } catch (err) {
    if (
      process.env.cli_instance_lookup_fallback === 'enabled' &&
      err.code === 'MODULE_NOT_FOUND'
    ) {
      // if not found from top-level package try to search using
      // default node resolution
      try {
        detectedModule = require(require.resolve(require.resolve(detectedJsreport)))

        detectedModule = {
          name: detectedJsreport,
          module: detectedModule
        }
      } catch (e) {
        detectedModule = null
      }
    } else {
      detectedModule = null
    }
  }

  return detectedModule
}
