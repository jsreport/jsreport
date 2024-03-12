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
const staticHelpers = require('../static/helpers')

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

module.exports = function (reporter, definition) {
  reporter.beforeRenderListeners.add(definition.name, this, (req, res) => {
    return evaluateChildTemplates(reporter, req, res, { evaluateInTemplateContent: true })
  })

  let helpersScript

  reporter.registerHelpersListeners.add(definition.name, () => {
    return helpersScript
  })

  reporter.afterTemplatingEnginesExecutedListeners.add(definition.name, this, (req, res) => {
    return evaluateChildTemplates(reporter, req, res, { evaluateInTemplateContent: false })
  })

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })

  reporter.childTemplates = {
    evaluateChildTemplates: (...args) => evaluateChildTemplates(reporter, ...args)
  }

  async function evaluateChildTemplates (reporter, request, response, options) {
    if (response.isInStreamingMode) {
      return
    }

    const childTemplateRegexp = /{#child ([^{}]*)}/g
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

    async function convert (str, p1, offset, s) {
      let template
      const templatePath = (p1.indexOf(' @') !== -1) ? p1.substring(0, p1.indexOf(' @')) : p1
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

      applyParameters(p1, templateName, req)

      reporter.logger.debug(`Rendering child template ${templateName}`, request)

      const resp = await reporter.render(req, request)
      return (await resp.output.getBuffer()).toString()
    }

    const strToReplace = evaluateInTemplateContent ? request.template.content : (await response.output.getBuffer()).toString()

    const result = await asyncReplace({
      string: strToReplace,
      parallelLimit
    }, childTemplateRegexp, (str, p1, offset, s, done) => {
      Promise.resolve(convert(str, p1, offset, s)).then((result) => done(null, result), (err) => done(err))
    })

    if (evaluateInTemplateContent) {
      request.template.content = result
      return
    }

    await response.output.update(Buffer.from(result))
  }
}
