const createOrExtendError = require('./packages/jsreport-core/lib/shared/createError')
const runInSandbox = require('./packages/jsreport-core/lib/worker/sandbox/runInSandbox')

class Reporter {
  constructor () {
    const cwd = process.cwd()

    this.requestModulesCache = new Map()

    this.options = {
      appDirectory: cwd,
      rootDirectory: cwd,
      parentModuleDirectory: cwd,
      trustUserCode: true,
      sandbox: {
        cache: { max: 100, enabled: true },
        modules: [],
        nativeModules: [],
        allowedModules: []
      }
    }

    this.logger = {
      debug (...args) {
        return console.log('DEBUG:', ...args)
      },
      info (...args) {
        return console.log('INFO:', ...args)
      },
      error (...args) {
        return console.error('ERROR:', ...args)
      }
    }

    this.registerHelpersListeners = {
      fire () {
        return []
      }
    }

    this._runInSandbox = runInSandbox(this)
  }

  async runInSandbox ({
    manager,
    context,
    userCode,
    initFn,
    executionFn,
    currentPath,
    onRequire,
    propertiesConfig,
    errorLineNumberOffset
  }, req) {
    return this._runInSandbox({
      manager,
      context,
      userCode,
      initFn,
      executionFn,
      currentPath,
      onRequire,
      propertiesConfig,
      errorLineNumberOffset
    }, req)
  }

  createError (message, options = {}) {
    return createOrExtendError(message, options)
  }

  createProxy () {
    const proxyInstance = {}
    return proxyInstance
  }

  extendProxy () {
    // do nothing
  }
}

module.exports = new Reporter()
