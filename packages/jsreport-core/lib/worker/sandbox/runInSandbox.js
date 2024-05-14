const LRU = require('lru-cache')
const stackTrace = require('stack-trace')
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 10)
const createSandbox = require('./createSandbox')
const normalizeError = require('../../shared/normalizeError')

module.exports = function createRunInSandbox (reporter) {
  const functionsCache = LRU(reporter.options.sandbox.cache)

  return async function runInSandbox ({
    manager = {},
    context,
    userCode,
    initFn,
    executionFn,
    currentPath,
    onRequire,
    propertiesConfig,
    errorLineNumberOffset = 0
  }, req) {
    let jsreportProxy = null

    // we use dynamic name because of the potential nested vm execution in the jsreportProxy.assets.require
    // it may turn out it is a bad approach in assets so we gonna delete it here
    const executionFnName = `${nanoid()}_executionFn`

    // creating new id different than execution to ensure user code can not get access to
    // internal functions by using the __sandboxId
    context.__sandboxId = nanoid()
    context[executionFnName] = executionFn
    context.__appDirectory = reporter.options.appDirectory
    context.__rootDirectory = reporter.options.rootDirectory
    context.__parentModuleDirectory = reporter.options.parentModuleDirectory
    context.__topLevelFunctions = {}
    context.__handleError = (err) => handleError(reporter, err)

    const { sourceFilesInfo, run, compileScript, restore, sandbox, sandboxRequire } = await createSandbox(context, {
      rootDirectory: reporter.options.rootDirectory,
      onLog: (log) => {
        // we mark any log done in sandbox as userLevel: true, this allows us to detect which logs belongs to user
        // and can potentially contain sensitive information

        let consoleType = log.level

        if (consoleType === 'debug') {
          consoleType = 'log'
        } else if (consoleType === 'warn') {
          consoleType = 'warning'
        }

        reporter.logger.debug(`(console:${consoleType}) ${log.message}`, { ...req, timestamp: log.timestamp, userLevel: true })
      },
      formatError: (error, moduleName) => {
        error.message += ` To be able to require custom modules you need to add to configuration { "trustUserCode": true } or enable just specific module using { sandbox: { allowedModules": ["${moduleName}"] }`
      },
      safeExecution: reporter.options.trustUserCode === false,
      isolateModules: reporter.options.sandbox.isolateModules !== false,
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
          const cachedModuleFromOutside = require.cache[m.path]

          // this is an optimization, the requireMap always go the built-in node require,
          // which has an overhead, even if the module you are trying to resolve is already cached
          // node will try to resolve filename when the require happens from different module than
          // it was requested first time.
          // this becomes an issue when you do a lazy require inside helper execution, if this helper
          // is a hot path (executed multiple times during rendering)
          // then you are adding extra time per the amount of times you call the helper
          // (which is big if you call this in a loop for 15K items),
          // the solution is to try first from the require cache directly, and fallback to built-in require
          // when not found, we can do this because we are sure the m.path is the path to the resolved filename of module
          if (cachedModuleFromOutside != null) {
            return cachedModuleFromOutside.exports
          }

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

    const _getTopLevelFunctions = function _getTopLevelFunctions (code) {
      return getTopLevelFunctions(functionsCache, code)
    }

    jsreportProxy = reporter.createProxy({
      req,
      runInSandbox: run,
      context: sandbox,
      getTopLevelFunctions: _getTopLevelFunctions,
      sandboxRequire
    })

    jsreportProxy.currentPath = async function getCurrentPath () {
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

    jsreportProxy.currentDirectoryPath = async function getCurrentDirectoryPath () {
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

    // it is better we remove our internal functions so we avoid user having the chance
    // to call them, as long as we force the execution to be truly async (with the await 1)
    // then it is safe to delete __handleError from context, when the execution is truly
    // async then it means the __handleError was already passed to catch handler,
    // therefore safe to delete
    const contextNormalizeCode = [
      'await 1;',
      `const ${executionFnName}_expose = ${executionFnName};`,
      'delete this.__handleError;',
      `delete this['${executionFnName}'];`
    ].join('')

    const functionsCode = `return {topLevelFunctions: {${functionNames.map(h => `"${h}": ${h}`).join(',')}}, fnToExecute: ${executionFnName}_expose}`

    const executionCode = `;(async () => { ${contextNormalizeCode}${userCode} \n\n;${functionsCode} })()
        .then(({ topLevelFunctions, fnToExecute }) => {
          const mergedTopLevelFunctions = { ...topLevelFunctions, ...__topLevelFunctions }

          // expose top level functions to the sandbox context
          // so helpers can call other helpers (from shared asset helpers, or .registerHelpers call from proxy)
          for (const [topLevelFnName, topLevelFn] of Object.entries(mergedTopLevelFunctions)) {
            this[topLevelFnName] = topLevelFn
          }

          return fnToExecute({
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
  let newError = normalizeError(errValue)

  if (newError === errValue) {
    // here it means the original error was valid in the first place,
    // so it was not normalized
    newError = new Error(errValue.message)
    Object.assign(newError, errValue)

    if (errValue.stack) {
      newError.stack = errValue.stack
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
