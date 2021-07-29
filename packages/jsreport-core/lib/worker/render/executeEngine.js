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

  return async ({ engine }, req) => {
    const asyncResultMap = new Map()

    if (reporter.options.sandbox.cache && reporter.options.sandbox.cache.enabled === false) {
      cache.reset()
    }

    req.data.__appDirectory = reporter.options.appDirectory
    req.data.__rootDirectory = reporter.options.rootDirectory
    req.data.__parentModuleDirectory = reporter.options.parentModuleDirectory

    const executionFn = async ({ require, console, topLevelFunctions }) => {
      const key = `template:${req.template.content}:${engine.name}`

      if (!cache.has(key)) {
        console.log('Compiled template not found in the cache, compiling')
        try {
          cache.set(key, engine.compile(req.template.content, { require }))
        } catch (e) {
          e.property = 'content'
          throw e
        }
      } else {
        console.log('Taking compiled template from engine cache')
      }

      const compiledTemplate = cache.get(key)

      for (const h of Object.keys(topLevelFunctions)) {
        topLevelFunctions[h] = wrapHelperForAsyncSupport(topLevelFunctions[h], asyncResultMap)
      }

      const content = await engine.execute(compiledTemplate, topLevelFunctions, req.data, { require })

      await Promise.all([...asyncResultMap.keys()].map(async (k) => {
        asyncResultMap.set(k, `${await asyncResultMap.get(k)}`)
      }))

      const finalContent = content.replace(/{#asyncHelperResult ([^{}]+)}/g, (str, p1) => {
        const asyncResultId = p1
        return `${asyncResultMap.get(asyncResultId)}`
      })

      return {
        content: finalContent
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
