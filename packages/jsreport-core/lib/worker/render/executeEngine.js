/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Child process script rendering html from template content, helpers and input data.
 * This script runs in the extra process because of multitenancy and security requirements, errors like infinite loop
 * should not affect other reports being rendered at the same time
 */
const LRU = require('lru-cache')
const { nanoid } = require('nanoid')
const { AsyncLocalStorage } = require('node:async_hooks')

module.exports = (reporter) => {
  const helperCallerAsyncLocalStorage = new AsyncLocalStorage()
  const templatesCache = LRU(reporter.options.sandbox.cache)
  let systemHelpersCache

  reporter.templatingEngines = { cache: templatesCache }

  const contextExecutionChainMap = new Map()
  const executionFnParsedParamsMap = new Map()
  const executionAsyncResultsMap = new Map()
  const executionFinishListenersMap = new Map()

  const templatingEnginesEvaluate = async (mainCall, { engine, content, helpers, data }, { entity, entitySet }, req) => {
    const engineImpl = reporter.extensionsManager.engines.find((e) => e.name === engine)

    if (!engine) {
      throw reporter.createError(`Engine '${engine}' not found. If this is a custom engine make sure it's properly installed from npm`, {
        statusCode: 400
      })
    }

    if (mainCall) {
      executionFnParsedParamsMap.set(req.context.id, new Map())
    }

    const executionId = nanoid(7)

    try {
      const res = await executeEngine({
        engine: engineImpl,
        content,
        helpers,
        data
      }, { executionId, handleErrors: false, entity, entitySet }, req)

      return res.content
    } finally {
      if (mainCall) {
        executionFnParsedParamsMap.delete(req.context.id)
      }

      executionAsyncResultsMap.delete(executionId)
      executionFinishListenersMap.delete(executionId)
    }
  }

  reporter.templatingEngines.evaluate = (executionInfo, entityInfo, req) => {
    return templatingEnginesEvaluate(true, executionInfo, entityInfo, req)
  }

  reporter.closeListeners.add('engineHelperCaller', () => helperCallerAsyncLocalStorage.disable())

  reporter.extendProxy((proxy, req, {
    runInSandbox,
    context,
    getTopLevelFunctions
  }) => {
    proxy.templatingEngines = {
      evaluate: async (executionInfo, entityInfo) => {
        return templatingEnginesEvaluate(false, executionInfo, entityInfo, req)
      },
      waitForAsyncHelper: async (maybeAsyncContent) => {
        const executionChain = contextExecutionChainMap.get(context.__sandboxId) || []
        const executionId = executionChain[executionChain.length - 1]

        if (
          executionId == null ||
          !executionAsyncResultsMap.has(executionId) ||
          typeof maybeAsyncContent !== 'string'
        ) {
          return maybeAsyncContent
        }

        const asyncResultMap = executionAsyncResultsMap.get(executionId)
        const asyncHelperResultRegExp = /{#asyncHelperResult ([^{}]+)}/
        let content = maybeAsyncContent
        let matchResult

        do {
          if (matchResult != null) {
            const matchedPart = matchResult[0]
            const asyncResultId = matchResult[1]
            const result = await asyncResultMap.get(asyncResultId)
            const isFullMatch = content === matchedPart

            if (typeof result !== 'string' && isFullMatch) {
              // this allows consuming async helper that returns a value other than string
              // like an async helper that returns object and it is received as
              // parameter of another helper
              content = result
            } else {
              content = `${content.slice(0, matchResult.index)}${result}${content.slice(matchResult.index + matchedPart.length)}`
            }
          }

          if (typeof content === 'string') {
            matchResult = content.match(asyncHelperResultRegExp)
          } else {
            matchResult = null
          }
        } while (matchResult != null)

        return content
      },
      waitForAsyncHelpers: async () => {
        const executionChain = contextExecutionChainMap.get(context.__sandboxId) || []
        const executionId = executionChain[executionChain.length - 1]

        if (executionId != null && executionAsyncResultsMap.has(executionId)) {
          const asyncResultMap = executionAsyncResultsMap.get(executionId)

          const callerId = helperCallerAsyncLocalStorage.getStore()

          // we must exclude the caller helper because if it exists it represents some parent
          // sync/async call that called .waitForAsyncHelpers, it is not going to be resolved at this point
          // so we should skip it in order for the execution to not hang
          const targetAsyncResultKeys = [...asyncResultMap.keys()].filter((key) => key !== callerId)

          return Promise.all(targetAsyncResultKeys.map((k) => asyncResultMap.get(k)))
        }
      },
      addFinishListener: (fn) => {
        const executionChain = contextExecutionChainMap.get(context.__sandboxId) || []
        const executionId = executionChain[executionChain.length - 1]

        if (executionId && executionFinishListenersMap.has(executionId)) {
          executionFinishListenersMap.get(executionId).add('finish', fn)
        }
      },
      createAsyncHelperResult: (v) => {
        const executionChain = contextExecutionChainMap.get(context.__sandboxId) || []
        const executionId = executionChain[executionChain.length - 1]

        const asyncResultMap = executionAsyncResultsMap.get(executionId)
        const asyncResultId = nanoid(7)
        asyncResultMap.set(asyncResultId, v)
        return `{#asyncHelperResult ${asyncResultId}}`
      }
    }
  })

  return async (engine, req) => {
    executionFnParsedParamsMap.set(req.context.id, new Map())
    req.data.__appDirectory = reporter.options.appDirectory
    req.data.__rootDirectory = reporter.options.rootDirectory
    req.data.__parentModuleDirectory = reporter.options.parentModuleDirectory

    const executionId = nanoid(7)

    try {
      return await executeEngine({
        engine,
        content: req.template.content,
        helpers: req.template.helpers,
        data: req.data
      }, {
        executionId,
        handleErrors: true,
        entity: req.template,
        entitySet: 'templates'
      }, req)
    } finally {
      executionFnParsedParamsMap.delete(req.context.id)
      executionAsyncResultsMap.delete(executionId)
    }
  }

  async function executeEngine ({ engine, content, helpers, data }, { executionId, handleErrors, entity, entitySet }, req) {
    let entityPath

    if (entity._id) {
      entityPath = await reporter.folders.resolveEntityPath(entity, entitySet, req)
    }

    const normalizedHelpers = `${helpers || ''}`
    const executionFnParsedParamsKey = `entity:${entity.shortid || 'anonymous'}:helpers:${normalizedHelpers}`
    let sandboxId

    const initFn = async (getTopLevelFunctions, compileScript) => {
      if (systemHelpersCache != null) {
        return systemHelpersCache
      }

      const registerResults = await reporter.registerHelpersListeners.fire()
      const systemHelpers = []

      for (const result of registerResults) {
        if (result == null) {
          continue
        }

        if (typeof result === 'string') {
          systemHelpers.push(result)
        }
      }

      const systemHelpersStr = systemHelpers.join('\n')

      const functionNames = getTopLevelFunctions(systemHelpersStr)

      const exposeSystemHelpersCode = `for (const fName of ${JSON.stringify(functionNames)}) { this[fName] = __topLevelFunctions[fName] }`

      // we sync the __topLevelFunctions with system helpers and expose it immediately to the global context
      const userCode = `(async () => { ${systemHelpersStr};
      __topLevelFunctions = {...__topLevelFunctions, ${functionNames.map(h => `"${h}": ${h}`).join(',')}}; ${exposeSystemHelpersCode}
      })()`

      const filename = 'system-helpers.js'
      const script = compileScript(userCode, filename)

      systemHelpersCache = {
        filename,
        source: systemHelpersStr,
        script
      }

      return systemHelpersCache
    }

    const executionFn = async ({ require, console, topLevelFunctions, context }) => {
      sandboxId = context.__sandboxId
      const asyncResultMap = new Map()

      if (!contextExecutionChainMap.has(sandboxId)) {
        contextExecutionChainMap.set(sandboxId, [])
      }

      contextExecutionChainMap.get(sandboxId).push(executionId)

      executionAsyncResultsMap.set(executionId, asyncResultMap)
      executionFinishListenersMap.set(executionId, reporter.createListenerCollection())
      executionFnParsedParamsMap.get(req.context.id).get(executionFnParsedParamsKey).resolve({ require, console, topLevelFunctions, context })

      try {
        const key = engine.buildTemplateCacheKey
          ? engine.buildTemplateCacheKey({ content }, req)
          : `template:${content}:${engine.name}`

        if (!templatesCache.has(key)) {
          try {
            templatesCache.set(key, engine.compile(content, { require }))
          } catch (e) {
            e.property = 'content'
            throw e
          }
        }

        const compiledTemplate = templatesCache.get(key)
        const wrappedTopLevelFunctions = {}

        for (const h of Object.keys(topLevelFunctions)) {
          // extra wrapping for enhance the error with the helper name
          wrappedTopLevelFunctions[h] = wrapHelperForHelperNameWhenError(topLevelFunctions[h], h, () => executionFnParsedParamsMap.has(req.context.id))

          if (engine.getWrappingHelpersEnabled && engine.getWrappingHelpersEnabled(req) === false) {
            wrappedTopLevelFunctions[h] = engine.wrapHelper(wrappedTopLevelFunctions[h], { context })
          } else {
            wrappedTopLevelFunctions[h] = wrapHelperForAsyncSupport(wrappedTopLevelFunctions[h], h, asyncResultMap)
          }
        }

        let contentResult = await engine.execute(compiledTemplate, wrappedTopLevelFunctions, data, { require })

        const resolvedResultsMap = new Map()

        // we need to use the cloned map, because there can be a waitForAsyncHelper pending that needs the asyncResultMap values
        let clonedMap = new Map(asyncResultMap)

        while (clonedMap.size > 0) {
          const keysEvaluated = [...clonedMap.keys()]

          await Promise.all(keysEvaluated.map(async (k) => {
            const result = await clonedMap.get(k)
            resolvedResultsMap.set(k, `${result}`)
            clonedMap.delete(k)
          }))

          // we need to remove the keys processed from the original map at this point
          // (after the await) because during the async work the asyncResultMap will be read
          for (const k of keysEvaluated) {
            asyncResultMap.delete(k)
          }

          // we want to process the new generated pending async results
          if (asyncResultMap.size > 0) {
            clonedMap = new Map(asyncResultMap)
          }
        }

        while (contentResult.includes('{#asyncHelperResult')) {
          contentResult = contentResult.replace(/{#asyncHelperResult ([^{}]+)}/g, (str, p1) => {
            const asyncResultId = p1
            // this can happen if a child jsreport.templatingEngines.evaluate receives an async value from outer scope
            // because every evaluate uses a unique map of async results
            // example is the case when component receives as a value async thing
            // instead of returning "undefined" we let the outer eval to do the replace
            if (!resolvedResultsMap.has(asyncResultId)) {
              // returning asyncUnresolvedHelperResult just to avoid endless loop, after replace we put it back to asyncHelperResult
              return `{#asyncUnresolvedHelperResult ${asyncResultId}}`
            }
            return `${resolvedResultsMap.get(asyncResultId)}`
          })
        }

        contentResult = contentResult.replace(/asyncUnresolvedHelperResult/g, 'asyncHelperResult')

        await executionFinishListenersMap.get(executionId).fire()

        return {
          // handlebars escapes single brackets before execution to prevent errors on {#asset}
          // we need to unescape them later here, because at the moment the engine.execute finishes
          // the async helpers aren't executed yet
          content: engine.unescape ? engine.unescape(contentResult) : contentResult
        }
      } finally {
        // ensure we clean the execution from the chain always, even on errors
        contextExecutionChainMap.set(sandboxId, contextExecutionChainMap.get(sandboxId).filter((id) => id !== executionId))
      }
    }

    try {
      // executionFnParsedParamsMap is there to cache parsed components helpers to speed up longer loops
      // we store there for the particular request and component a promise and only the first component gets compiled
      if (executionFnParsedParamsMap.get(req.context.id).has(executionFnParsedParamsKey)) {
        const { require, console, topLevelFunctions, context } = await (executionFnParsedParamsMap.get(req.context.id).get(executionFnParsedParamsKey).promise)

        return await executionFn({ require, console, topLevelFunctions, context })
      }

      const awaiter = {}

      awaiter.promise = new Promise((resolve) => {
        awaiter.resolve = resolve
      })

      executionFnParsedParamsMap.get(req.context.id).set(executionFnParsedParamsKey, awaiter)

      if (reporter.options.sandbox.cache && reporter.options.sandbox.cache.enabled === false) {
        templatesCache.reset()
      }

      try {
        return await reporter.runInSandbox({
          context: {
            ...(engine.createContext ? engine.createContext(req) : {})
          },
          userCode: normalizedHelpers,
          initFn,
          executionFn,
          currentPath: entityPath,
          onRequire: (moduleName, { context }) => {
            if (engine.onRequire) {
              return engine.onRequire(moduleName, { context })
            }
          }
        }, req)
      } catch (e) {
        if (!handleErrors) {
          throw e
        }

        const nestedErrorWithEntity = e.entity != null

        const templatePath = req.template._id ? await reporter.folders.resolveEntityPath(req.template, 'templates', req) : 'anonymous'

        const newError = reporter.createError(`Error when evaluating engine ${engine.name} for template ${templatePath}`, { original: e })

        if (templatePath !== 'anonymous' && !nestedErrorWithEntity) {
          const templateFound = await reporter.folders.resolveEntityFromPath(templatePath, 'templates', req)

          if (templateFound != null) {
            newError.entity = {
              shortid: templateFound.entity.shortid,
              name: templateFound.entity.name,
              content
            }
          }
        }

        if (!nestedErrorWithEntity && e.property !== 'content') {
          newError.property = 'helpers'
        }

        if (nestedErrorWithEntity) {
          // errors from nested assets evals needs an unwrap for some reason
          newError.entity = { ...e.entity }
        }

        // we remove the decoratedSuffix (created from sandbox) from the stack trace (if it is there) because it
        // just creates noise and duplication when printing the error,
        // we just want the decoration on the message not in the stack trace
        if (e.decoratedSuffix != null && newError.stack.includes(e.decoratedSuffix)) {
          newError.stack = newError.stack.replace(e.decoratedSuffix, '')
        }

        throw newError
      }
    } finally {
      if (sandboxId != null && contextExecutionChainMap.get(sandboxId)?.length === 0) {
        contextExecutionChainMap.delete(sandboxId)
      }
    }
  }

  function wrapHelperForAsyncSupport (fn, helperName, asyncResultMap) {
    return function (...args) {
      const resultId = nanoid(7)

      let fnResult

      // make the result id available for all calls inside the helper
      helperCallerAsyncLocalStorage.run(resultId, () => {
        // important to call the helper with the current this to preserve the same behavior
        fnResult = fn.call(this, ...args)
      })

      if (fnResult == null || typeof fnResult.then !== 'function') {
        return fnResult
      }

      asyncResultMap.set(resultId, fnResult)

      return `{#asyncHelperResult ${resultId}}`
    }
  }

  function wrapHelperForHelperNameWhenError (fn, helperName, isMainEvalStillRunningFn) {
    return function (...args) {
      let fnResult

      const getEnhancedHelperError = (e) => reporter.createError(`"${helperName}" helper call failed`, { original: e })

      try {
        // important to call the helper with the current this to preserve the same behavior
        fnResult = fn.call(this, ...args)
      } catch (syncError) {
        throw getEnhancedHelperError(syncError)
      }

      if (fnResult == null || typeof fnResult.then !== 'function') {
        return fnResult
      }

      return fnResult.catch((asyncError) => {
        if (!isMainEvalStillRunningFn()) {
          // main exec already finished on some error, we just ignore errors of the hanging async calls
          return
        }
        throw getEnhancedHelperError(asyncError)
      })
    }
  }
}
