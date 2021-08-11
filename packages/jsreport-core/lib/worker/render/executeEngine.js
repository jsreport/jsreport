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
    const asyncResultMap = new Map()

    if (reporter.options.sandbox.cache && reporter.options.sandbox.cache.enabled === false) {
      cache.reset()
    }

    req.data.__appDirectory = reporter.options.appDirectory
    req.data.__rootDirectory = reporter.options.rootDirectory
    req.data.__parentModuleDirectory = reporter.options.parentModuleDirectory

    const executionFn = async ({ require, console, topLevelFunctions }) => {
      const proxy = require('jsreport-proxy')

      proxy.templatingEngines = {
        evaluate: (content, data) => {
          const key = `evaluate:${content}:${engine.name}`
          if (!cache.has(key)) {
            cache.set(key, engine.compile(content, { require }))
          }
          return engine.execute(cache.get(key), {}, data, { require })
        }
      }

      const key = `template:${req.template.content}:${engine.name}`

      if (!cache.has(key)) {
        try {
          cache.set(key, engine.compile(req.template.content, { require }))
        } catch (e) {
          e.property = 'content'
          throw e
        }
      }

      const compiledTemplate = cache.get(key)

      for (const h of Object.keys(topLevelFunctions)) {
        topLevelFunctions[h] = wrapHelperForAsyncSupport(topLevelFunctions[h], asyncResultMap)
      }

      let content = await engine.execute(compiledTemplate, topLevelFunctions, req.data, { require })
      const resolvedResultsMap = new Map()
      while (asyncResultMap.size > 0) {
        await Promise.all([...asyncResultMap.keys()].map(async (k) => {
          resolvedResultsMap.set(k, `${await asyncResultMap.get(k)}`)
          asyncResultMap.delete(k)
        }))
      }

      while (content.includes('{#asyncHelperResult')) {
        content = content.replace(/{#asyncHelperResult ([^{}]+)}/g, (str, p1) => {
          const asyncResultId = p1
          return `${resolvedResultsMap.get(asyncResultId)}`
        })
      }

      return {
        content
      }
    }

    try {
      return await reporter.runInSandbox({
        context: {
          ...(engine.createContext ? engine.createContext() : {})
        },
        userCode: req.template.helpers,
        executionFn,
        onRequire: (moduleName, { context }) => {
          if (engine.onRequire) {
            return engine.onRequire(moduleName, { context })
          }
        }
      }, req)
    } catch (e) {
      const nestedErrorWithEntity = e.entity != null

      const templatePath = req.template._id ? await reporter.folders.resolveEntityPath(req.template, 'templates', req) : 'anonymous'
      if (templatePath !== 'anonymous' && !nestedErrorWithEntity) {
        const templateFound = await reporter.folders.resolveEntityFromPath(templatePath, 'templates', req)
        if (templateFound != null) {
          e.entity = {
            shortid: templateFound.entity.shortid,
            name: templateFound.entity.name,
            content: req.template.content
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
