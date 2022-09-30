const LRU = require('lru-cache')
const stackTrace = require('stack-trace')
const { customAlphabet } = require('nanoid')
const createSandbox = require('./createSandbox')
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 10)

module.exports = (reporter) => {
  const functionsCache = LRU(reporter.options.sandbox.cache)

  return async ({
    manager = {},
    context,
    userCode,
    initFn,
    executionFn,
    currentPath,
    onRequire,
    propertiesConfig,
    errorLineNumberOffset = 0
  }, req) => {
    let jsreportProxy = null

    // we use dynamic name because of the potential nested vm2 execution in the jsreportProxy.assets.require
    // it may turn out it is a bad approach in assets so we gonna delete it here
    const executionFnName = `${nanoid()}_executionFn`

    context[executionFnName] = executionFn
    context.__appDirectory = reporter.options.appDirectory
    context.__rootDirectory = reporter.options.rootDirectory
    context.__parentModuleDirectory = reporter.options.parentModuleDirectory
    context.setTimeout = setTimeout
    context.__topLevelFunctions = {}
    context.__handleError = (err) => handleError(reporter, err)

    const { sourceFilesInfo, run, compileScript, restore, sandbox, sandboxRequire } = createSandbox(context, {
      onLog: (log) => {
        // we mark any log done in sandbox as userLevel: true, this allows us to detect which logs belongs to user
        // and can potentially contain sensitive information
        reporter.logger[log.level](log.message, { ...req, timestamp: log.timestamp, userLevel: true })
      },
      formatError: (error, moduleName) => {
        error.message += ` To be able to require custom modules you need to add to configuration { "trustUserCode": true } or enable just specific module using { sandbox: { allowedModules": ["${moduleName}"] }`
      },
      safeExecution: reporter.options.trustUserCode === false,
      modulesCache: reporter.requestModulesCache.get(req.context.rootId),
      globalModules: reporter.options.sandbox.nativeModules || [],
      allowedModules: reporter.options.sandbox.allowedModules,
      propertiesConfig,
      requirePaths: [
        reporter.options.rootDirectory,
        reporter.options.appDirectory,
        reporter.options.parentModuleDirectory
      ],
      requireMap: (moduleName) => {
        const m = reporter.options.sandbox.modules.find((m) => m.alias === moduleName || m.path === moduleName)

        if (m) {
          return require(m.path)
        }

        if (moduleName === 'jsreport-proxy') {
          return jsreportProxy
        }

        if (onRequire) {
          return onRequire(moduleName, { context })
        }
      }
    })

    const _getTopLevelFunctions = (code) => {
      return getTopLevelFunctions(functionsCache, code)
    }

    jsreportProxy = reporter.createProxy({
      req,
      runInSandbox: run,
      context: sandbox,
      getTopLevelFunctions: _getTopLevelFunctions,
      sandboxRequire
    })

    jsreportProxy.currentPath = async () => {
      // we get the current path by throwing an error, which give us a stack trace
      // which we analyze and see if some source file is associated to an entity
      // if it is then we can properly get the path associated to it, if not we
      // fallback to the current path passed as options
      const filesCount = sourceFilesInfo.size
      let resolvedPath = currentPath

      if (filesCount > 0) {
        const err = new Error('get me stack trace please')
        const trace = stackTrace.parse(err)

        for (let i = 0; i < trace.length; i++) {
          const current = trace[i]

          if (sourceFilesInfo.has(current.getFileName())) {
            const { entity, entitySet } = sourceFilesInfo.get(current.getFileName())

            if (entity != null && entitySet != null) {
              resolvedPath = await reporter.folders.resolveEntityPath(entity, entitySet, req)
              break
            }
          }
        }
      }

      return resolvedPath
    }

    jsreportProxy.currentDirectoryPath = async () => {
      const currentPath = await jsreportProxy.currentPath()

      if (currentPath != null) {
        const localPath = currentPath.substring(0, currentPath.lastIndexOf('/'))

        if (localPath === '') {
          return '/'
        }

        return localPath
      }

      return currentPath
    }

    // NOTE: it is important that cleanup, restore methods are not called from a function attached to the
    // sandbox, because the arguments and return value of such function call will be sandboxed again, to solve this
    // we don't attach these methods to the sandbox, and instead share them through a "manager" object that should
    // be passed in options
    manager.restore = restore

    if (typeof initFn === 'function') {
      const initScriptInfo = await initFn(_getTopLevelFunctions, compileScript)

      if (initScriptInfo) {
        try {
          await run(initScriptInfo.script, {
            filename: initScriptInfo.filename || 'sandbox-init.js',
            source: initScriptInfo.source
          })
        } catch (e) {
          handleError(reporter, e)
        }
      }
    }

    const functionNames = getTopLevelFunctions(functionsCache, userCode)
    const functionsCode = `return {${functionNames.map(h => `"${h}": ${h}`).join(',')}}`
    const executionCode = `;(async () => { ${userCode} \n\n;${functionsCode} })()
        .then((topLevelFunctions) => {
          const mergedTopLevelFunctions = { ...topLevelFunctions, ...__topLevelFunctions }

          // expose top level functions to the sandbox context
          // so helpers can call other helpers (from shared asset helpers, or .registerHelpers call from proxy)
          for (const [topLevelFnName, topLevelFn] of Object.entries(mergedTopLevelFunctions)) {
            this[topLevelFnName] = topLevelFn
          }

          return ${executionFnName}({
              topLevelFunctions: mergedTopLevelFunctions,
              require,
              console,
              context: this
          })
        }).catch(__handleError);`

    try {
      return await run(executionCode, {
        filename: 'sandbox.js',
        source: userCode,
        errorLineNumberOffset
      })
    } catch (e) {
      handleError(reporter, e)
    }
  }
}

function handleError (reporter, errValue) {
  let newError

  const isErrorObj = (
    typeof errValue === 'object' &&
      typeof errValue.hasOwnProperty === 'function' &&
      Object.prototype.hasOwnProperty.call(errValue, 'message')
  )

  const isValidError = (
    isErrorObj ||
      typeof errValue === 'string'
  )

  if (!isValidError) {
    if (Object.prototype.toString.call(errValue) === '[object Object]') {
      newError = new Error(`User code threw with non-Error: ${JSON.stringify(errValue)}`)
    } else {
      newError = new Error(`User code threw with non-Error: ${errValue}`)
    }
  } else {
    if (typeof errValue === 'string') {
      newError = new Error(errValue)
    } else {
      newError = new Error(errValue.message)
      Object.assign(newError, errValue)
      if (errValue.stack) {
        newError.stack = errValue.stack
      }
    }
  }

  throw reporter.createError(null, {
    original: newError,
    statusCode: 400
  })
}

function getTopLevelFunctions (cache, code) {
  const key = `functions:${code}`

  if (cache.has(key)) {
    return cache.get(key)
  }

  // lazy load to speed up boot
  const parser = require('@babel/parser')
  const traverse = require('@babel/traverse').default

  const names = []
  try {
    const ast = parser.parse(code, {
      sourceType: 'script',
      allowReturnOutsideFunction: false,
      allowAwaitOutsideFunction: true,
      plugins: [
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'doExpressions',
        'functionBind',
        'throwExpressions',
        'topLevelAwait'
      ]
    })

    // traverse only function declaration that are defined
    // at the top level of program
    traverse(ast, {
      FunctionDeclaration: (path) => {
        if (path.parent.type === 'Program') {
          names.push(path.node.id.name)
        }
      }
    })
  } catch (e) {
    // we let the error handling for later eval
    return []
  }

  cache.set(key, names)
  return names
}
