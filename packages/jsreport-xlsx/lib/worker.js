const fs = require('fs').promises
const path = require('path')
const { deflateSync } = require('zlib')

module.exports = (reporter, definition) => {
  reporter.extendProxy((proxy) => {
    proxy.xlsx = {
      compressXml: (xml) => deflateSync(xml)
    }
  })

  reporter.options.sandbox.modules.push({
    alias: 'lodash',
    path: require.resolve('lodash')
  })

  reporter.options.sandbox.modules.push({
    alias: 'xml2js-preserve-spaces',
    path: require.resolve('xml2js-preserve-spaces')
  })

  if (reporter.options.sandbox.allowedModules !== '*') {
    reporter.options.sandbox.allowedModules.push('path')
  }

  reporter.extensionsManager.recipes.push({
    name: 'xlsx',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })

  let helpersGenerationScript
  let helpersTransformationScript

  reporter.initializeListeners.add(definition.name, async () => {
    helpersGenerationScript = await fs.readFile(path.join(__dirname, '../static/helpersGeneration.js'), 'utf8')
    helpersTransformationScript = await fs.readFile(path.join(__dirname, '../static/helpersTransformation.js'), 'utf8')
  })

  reporter.registerHelpersListeners.add(definition.name, () => {
    return `${helpersGenerationScript}\n\n${helpersTransformationScript}`
  })

  reporter.beforeRenderListeners.insert({ before: 'templates' }, `${definition.name}-next`, (req) => {
    if (req.template.recipe === 'xlsx' && !req.template.name && !req.template.shortid && !req.template.content) {
      // templates extension otherwise complains that the template is empty
      // but that is fine for this recipe
      req.template.content = ' '
    }
  })

  reporter.initializeListeners.add(definition.name, () => {
    reporter.beforeRenderListeners.add(definition.name, async (req) => {
      if (req.template.recipe !== 'xlsx') {
        return
      }

      req.data = req.data || {}

      req.data.$xlsxOriginalContent = req.template.content
      req.template.content = ''

      req.data.$xlsxModuleDirname = path.join(__dirname, '../')
      req.data.$addBufferSize = definition.options.addBufferSize || 50000000
      req.data.$escapeAmp = definition.options.escapeAmp
      req.data.$numberOfParsedAddIterations = definition.options.numberOfParsedAddIterations == null ? 50 : definition.options.numberOfParsedAddIterations
      // this allows the data generated in the helpers to continue to be persisted outside of the sandbox
      req.data.$files = []
      req.data.$buffers = {}
    })
  })
}
