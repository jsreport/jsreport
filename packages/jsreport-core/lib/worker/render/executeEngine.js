/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Child process script rendering html from template content, helpers and input data.
 * This script runs in the extra process because of multitenancy and security requirements, errors like infinite loop
 * should not affect other reports being rendered at the same time
 */
const LRU = require('lru-cache')
const { nanoid } = require('nanoid')

module.exports = (reporter) => {
  const cache = LRU(reporter.options.sandbox.cache || { max: 100 })

  reporter.templatingEngines = { cache }

  const executionFnParsedParamsMap = new Map()
  const executionAsyncResultsMap = new Map()

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
    }
  }

  reporter.templatingEngines.evaluate = (executionInfo, entityInfo, req) => templatingEnginesEvaluate(true, executionInfo, entityInfo, req)

  reporter.extendProxy((proxy, req, {
    runInSandbox,
    context,
    getTopLevelFunctions
  }) => {
    proxy.templatingEngines = {
      evaluate: async (executionInfo, entityInfo) => {
        return templatingEnginesEvaluate(false, executionInfo, entityInfo, req)
      },
      waitForAsyncHelpers: async () => {
        if (context.__executionId != null && executionAsyncResultsMap.has(context.__executionId)) {
          const asyncResultMap = executionAsyncResultsMap.get(context.__executionId)
          return Promise.all([...asyncResultMap.keys()].map((k) => asyncResultMap.get(k)))
        }
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

    const registerResults = await reporter.registerHelpersListeners.fire(req)
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
    const joinedHelpers = systemHelpersStr + '\n' + (helpers || '')
    const executionFnParsedParamsKey = `entity:${entity.shortid || 'anonymous'}:helpers:${joinedHelpers}`

    const executionFn = async ({ require, console, topLevelFunctions, context }) => {
      const asyncResultMap = new Map()

      context.__executionId = executionId

      executionAsyncResultsMap.set(executionId, asyncResultMap)
      executionFnParsedParamsMap.get(req.context.id).get(executionFnParsedParamsKey).resolve({ require, console, topLevelFunctions, context })

      const key = `template:${content}:${engine.name}`

      if (!cache.has(key)) {
        try {
          cache.set(key, engine.compile(content, { require }))
        } catch (e) {
          e.property = 'content'
          throw e
        }
      }

      const compiledTemplate = cache.get(key)

      const wrappedTopLevelFunctions = {}

      for (const h of Object.keys(topLevelFunctions)) {
        wrappedTopLevelFunctions[h] = wrapHelperForAsyncSupport(topLevelFunctions[h], asyncResultMap)
      }

      let contentResult = await engine.execute(compiledTemplate, wrappedTopLevelFunctions, data, { require })
      const resolvedResultsMap = new Map()
      while (asyncResultMap.size > 0) {
        await Promise.all([...asyncResultMap.keys()].map(async (k) => {
          resolvedResultsMap.set(k, `${await asyncResultMap.get(k)}`)
          asyncResultMap.delete(k)
        }))
      }

      while (contentResult.includes('{#asyncHelperResult')) {
        contentResult = contentResult.replace(/{#asyncHelperResult ([^{}]+)}/g, (str, p1) => {
          const asyncResultId = p1
          return `${resolvedResultsMap.get(asyncResultId)}`
        })
      }

      return {
        // handlebars escapes single brackets before execution to prevent errors on {#asset}
        // we need to unescape them later here, because at the moment the engine.execute finishes
        // the async helpers aren't executed yet
        content: engine.unescape ? engine.unescape(contentResult) : contentResult
      }
    }

    // executionFnParsedParamsMap is there to cache parsed components helpers to speed up longer loops
    // we store there for the particular request and component a promise and only the first component gets compiled
    if (executionFnParsedParamsMap.get(req.context.id).has(executionFnParsedParamsKey)) {
      const { require, console, topLevelFunctions, context } = await (executionFnParsedParamsMap.get(req.context.id).get(executionFnParsedParamsKey).promise)

      return executionFn({ require, console, topLevelFunctions, context })
    } else {
      const awaiter = {}
      awaiter.promise = new Promise((resolve) => {
        awaiter.resolve = resolve
      })
      executionFnParsedParamsMap.get(req.context.id).set(executionFnParsedParamsKey, awaiter)
    }

    if (reporter.options.sandbox.cache && reporter.options.sandbox.cache.enabled === false) {
      cache.reset()
    }

    try {
      return await reporter.runInSandbox({
        context: {
          ...(engine.createContext ? engine.createContext() : {})
        },
        userCode: joinedHelpers,
        executionFn,
        currentPath: entityPath,
        errorLineNumberOffset: systemHelpersStr.split('\n').length,
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
      if (templatePath !== 'anonymous' && !nestedErrorWithEntity) {
        const templateFound = await reporter.folders.resolveEntityFromPath(templatePath, 'templates', req)
        if (templateFound != null) {
          e.entity = {
            shortid: templateFound.entity.shortid,
            name: templateFound.entity.name,
            content
          }
        }
      }

      e.message = `Error when evaluating engine ${engine.name} for template ${templatePath}\n` + e.message

      if (!nestedErrorWithEntity && e.property !== 'content') {
        e.property = 'helpers'
      }

      if (nestedErrorWithEntity) {
        // errors from nested assets evals needs an unwrap for some reason
        e.entity = { ...e.entity }
      }

      throw e
    }
  }

  function wrapHelperForAsyncSupport (fn, asyncResultMap) {
    return function (...args) {
    // important to call the helper with the current this to preserve the same behavior
      const fnResult = fn.call(this, ...args)

      if (fnResult == null || typeof fnResult.then !== 'function') {
        return fnResult
      }

      const asyncResultId = nanoid(7)
      asyncResultMap.set(asyncResultId, fnResult)

      return `{#asyncHelperResult ${asyncResultId}}`
    }
  }
}
