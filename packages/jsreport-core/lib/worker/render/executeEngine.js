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

  return async (engine, req) => {
    const executionFnParsedParamsMap = new Map()

    reporter.extendProxy((proxy, req, {
      runInSandbox,
      context,
      getTopLevelFunctions
    }) => {
      proxy.templatingEngines = {
        evaluate: async ({ engine, content, helpers, data }, { entity, entitySet }) => {
          const engineImpl = reporter.extensionsManager.engines.find((e) => e.name === engine)

          if (!engine) {
            throw reporter.createError(`Engine '${engine}' not found. If this is a custom engine make sure it's properly installed from npm`, {
              statusCode: 400
            })
          }

          const res = await executeEngine({
            engine: engineImpl,
            content,
            helpers,
            systemHelpers: req.context.systemHelpers,
            data
          }, { executionFnParsedParamsMap, handleErrors: false, entity, entitySet }, req)
          return res.content
        }
      }
    })

    req.data.__appDirectory = reporter.options.appDirectory
    req.data.__rootDirectory = reporter.options.rootDirectory
    req.data.__parentModuleDirectory = reporter.options.parentModuleDirectory

    return executeEngine({
      engine,
      content: req.template.content,
      helpers: req.template.helpers,
      systemHelpers: req.context.systemHelpers,
      data: req.data
    }, {
      executionFnParsedParamsMap,
      handleErrors: true,
      entity: req.template,
      entitySet: 'templates'
    }, req)
  }

  async function executeEngine ({ engine, content, helpers, systemHelpers, data }, { executionFnParsedParamsMap, handleErrors, entity, entitySet }, req) {
    const joinedHelpers = systemHelpers + '\n' + helpers
    const executionFnParsedParamsKey = `entity:${entity.shortid || 'anonymous'}:helpers:${joinedHelpers}`

    const executionFn = async ({ require, console, topLevelFunctions }) => {
      if (entitySet !== 'templates') {
        const jsreport = require('jsreport-proxy')
        const entityPath = await jsreport.folders.resolveEntityPath(entity, entitySet)
        jsreport.currentPath = entityPath.substring(0, entityPath.lastIndexOf('/'))
      }

      const asyncResultMap = new Map()
      executionFnParsedParamsMap.set(executionFnParsedParamsKey, { require, console, topLevelFunctions })

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
        content: contentResult
      }
    }

    if (executionFnParsedParamsMap.has(executionFnParsedParamsKey)) {
      const { require, console, topLevelFunctions } = executionFnParsedParamsMap.get(executionFnParsedParamsKey)

      return executionFn({ require, console, topLevelFunctions })
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
        errorLineNumberOffset: systemHelpers.split('\n').length,
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
    // important to call the helper with the current this to preserve the same behaviour
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
