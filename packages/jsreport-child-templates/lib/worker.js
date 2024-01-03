/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension allowing to assemble and render template using other child templates.
 * Syntax is {#child [template name]}
 */

const util = require('util')
const path = require('path')
const fs = require('fs/promises')
const extend = require('node.extend.without.arrays')
const asyncReplace = util.promisify(require('async-replace-with-limit'))
const Semaphore = require('semaphore-async-await').default
const staticHelpers = require('../static/helpers')

module.exports = function (reporter, definition) {
  reporter.beforeRenderListeners.add(definition.name, this, (request, response) => {
    return evaluateChildTemplates(reporter, request, response, { evaluateInTemplateContent: true })
  })

  let helpersScript

  reporter.registerHelpersListeners.add(definition.name, () => {
    return helpersScript
  })

  reporter.afterTemplatingEnginesExecutedListeners.add(definition.name, this, (request, response) => {
    return evaluateChildTemplates(reporter, request, response, { evaluateInTemplateContent: false })
  })

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })

  reporter.childTemplates = {
    evaluateChildTemplates: (...args) => evaluateChildTemplates(reporter, ...args)
  }

  async function evaluateChildTemplates (reporter, request, response, options) {
    let evaluateInTemplateContent
    let parallelLimit

    if (typeof options === 'boolean') {
      evaluateInTemplateContent = options
    } else {
      evaluateInTemplateContent = options.evaluateInTemplateContent
      parallelLimit = options.parallelLimit
    }

    if (evaluateInTemplateContent == null) {
      evaluateInTemplateContent = false
    }

    if (parallelLimit == null) {
      parallelLimit = definition.options.parallelLimit
    }

    async function processChildCall (childCall) {
      let template
      const templatePath = (childCall.indexOf(' @') !== -1) ? childCall.substring(0, childCall.indexOf(' @')) : childCall
      const templateNameIsPath = templatePath.indexOf('/') !== -1
      const pathParts = templatePath.split('/').filter((p) => p)

      if (pathParts.length === 0) {
        throw reporter.createError('Invalid template path, path should target something', {
          statusCode: 400,
          weak: true
        })
      }

      let templateName = [...pathParts].pop()
      const result = await reporter.folders.resolveEntityFromPath(templatePath, 'templates', request)
      let templates = []

      if (result) {
        templates = [result.entity]
      }

      if (templates.length === 0 && !templateNameIsPath) {
        // fallback to global search by name (with no folder)
        templateName = templatePath

        templates = await reporter.documentStore.collection('templates').find({
          name: templateName
        }, request)
      }

      if (templates.length > 1) {
        throw reporter.createError(`Duplicated templates found for ${templateName}`, {
          statusCode: 400,
          weak: true
        })
      }

      if (templates.length === 1) {
        template = templates[0]
      }

      if (!template) {
        reporter.logger.debug(`Child template "${templatePath}" was not found, skipping.`, request)
        return null
      }

      const req = {
        template
      }

      applyParameters(childCall, templateName, req)

      reporter.logger.debug(`Rendering child template ${templateName}`, request)

      const resp = await reporter.render(req, request)
      const content = (await resp.output.getBuffer()).toString()
      return content
    }

    if (evaluateInTemplateContent) {
      const strToReplace = request.template.content

      const result = await asyncReplace({
        string: strToReplace,
        parallelLimit
      }, getCompleteChildCallRegexp(), (str, p1, offset, s, done) => {
        processChildCall(p1).then((result) => done(null, result)).catch(done)
      })

      request.template.content = result
      return
    }

    await response.output.save({
      transform: async (chunk) => {
        const chunkStr = chunk.toString()
        const result = {}

        const matches = [...chunkStr.matchAll(getCompleteChildCallRegexp())]

        if (matches.length === 0) {
          result.content = chunk
          result.concat = hasPartialChildCall(chunkStr)

          return result
        }

        const matchesCount = matches.length

        const semaphore = new Semaphore(parallelLimit)
        const tasks = []
        const results = new Map()

        for (let idx = 0; idx < matchesCount; idx++) {
          const currentIdx = idx
          const match = matches[currentIdx]

          results.set(currentIdx, {
            start: match.index,
            length: match[0].length,
            newContent: null
          })

          tasks.push(semaphore.execute(async () => {
            const childCallResult = await processChildCall(match[1])
            results.get(currentIdx).newContent = childCallResult
          }))
        }

        await Promise.all(tasks)

        let newContent = chunkStr
        let diff = 0

        for (let idx = 0; idx < matchesCount; idx++) {
          const resultInfo = results.get(idx)
          const currentStart = resultInfo.start + diff

          diff += resultInfo.newContent.length - resultInfo.length

          newContent = newContent.slice(0, currentStart) + resultInfo.newContent + newContent.slice(currentStart + resultInfo.length)
        }

        result.content = Buffer.from(newContent)

        return result
      }
    })
  }
}

function applyParameters (p1, templateName, req) {
  if (p1.indexOf(' @') !== -1) {
    try {
      const modifications = {}

      const params = p1.replace(templateName, '').split(' @')
      params.shift()

      params.forEach(function (p) {
        let separator

        if (p.indexOf('$=') !== -1) {
          separator = '$='
        } else {
          separator = '='
        }

        const keys = p.slice(0, p.indexOf(separator)).split('.')
        const rawValue = p.slice(p.indexOf(separator) + separator.length)
        let value

        if (separator === '$=') {
          value = staticHelpers.childTemplateParseData(rawValue)
        } else {
          value = JSON.parse(`"${rawValue}"`)
        }

        let modificationsIterator = modifications

        const lastProperty = keys[keys.length - 1]
        keys.pop()

        keys.forEach((k) => {
          modificationsIterator = modificationsIterator[k] = modificationsIterator[k] || {}
        })
        modificationsIterator[lastProperty] = value
      })

      extend(true, req, modifications)
    } catch (e) {
      throw new Error(`Unable to parse params ${p1} for child template ${templateName}`)
    }
  }
}

function hasPartialChildCall (str) {
  const partialMatch = str.match(getIncompleteChildCallAtEndRegexp())
  let hasPartialCall = false

  if (partialMatch == null) {
    hasPartialCall = false
  } else {
    const childPart = partialMatch[1]
    const namePart = partialMatch[2].length

    const checks = [
      () => childPart.length === 0 && namePart === 0,
      () => {
        if (childPart.length === 0) {
          return false
        }

        const completeAssetPart = '#child '
        const containsComplete = childPart.length === completeAssetPart.length

        if (containsComplete) {
          return true
        }

        const targetAssetPart = completeAssetPart.slice(0, partialMatch[1].length)

        return childPart === targetAssetPart
      }
    ]

    hasPartialCall = checks.some((check) => check())
  }

  return hasPartialCall
}

function getCompleteChildCallRegexp () {
  return /{#child ([^{}]{0,500})}/g
}

function getIncompleteChildCallAtEndRegexp () {
  return /{([#child ]{0,7})([^{}]{0,500})$/
}
