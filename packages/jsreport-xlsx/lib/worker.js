const fs = require('fs').promises
const path = require('path')

let defaultXlsxTemplate

module.exports = (reporter, definition) => {
  reporter.options.sandbox.modules.push({
    alias: 'fsproxy.js',
    path: path.join(__dirname, '../lib/fsproxy.js')
  })

  reporter.options.sandbox.modules.push({
    alias: 'lodash',
    path: require.resolve('lodash')
  })

  reporter.options.sandbox.modules.push({
    alias: 'xml2js-preserve-spaces',
    path: require.resolve('xml2js-preserve-spaces')
  })

  reporter.options.sandbox.modules.push({
    alias: 'string-pixel-width',
    path: require.resolve('string-pixel-width')
  })

  if (reporter.options.sandbox.allowedModules !== '*') {
    reporter.options.sandbox.allowedModules.push('path')
  }

  reporter.extensionsManager.recipes.push({
    name: 'xlsx',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })

  reporter.extensionsManager.recipes.push({
    name: 'xlsx-next',
    execute: (req, res) => require('./recipe-next')(reporter, definition, req, res)
  })

  let helpersScript
  let helpersNextScript

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
    helpersNextScript = await fs.readFile(path.join(__dirname, '../static/helpersNext.js'), 'utf8')
  })

  reporter.registerHelpersListeners.add(definition.name, (req) => {
    if (req.template.recipe === 'xlsx') {
      return helpersScript
    }

    return helpersNextScript
  })

  reporter.beforeRenderListeners.insert({ before: 'templates' }, `${definition.name}-next`, (req) => {
    if (req.template.recipe === 'xlsx-next' && !req.template.name && !req.template.shortid && !req.template.content) {
      // templates extension otherwise complains that the template is empty
      // but that is fine for this recipe
      req.template.content = 'xlsx placeholder'
    }
  })

  reporter.beforeRenderListeners.insert({ after: 'data' }, definition.name, async (req) => {
    if (req.template.recipe !== 'xlsx') {
      return
    }

    const serialize = require('./serialize.js')
    const parse = serialize.parse

    const findXlsxTemplate = async () => {
      if (
        (!req.template.xlsx || (!req.template.xlsx.templateAssetShortid && !req.template.xlsx.templateAsset))
      ) {
        if (defaultXlsxTemplate) {
          return Promise.resolve(defaultXlsxTemplate)
        }

        return fs.readFile(path.join(__dirname, '../static/defaultXlsxTemplate.json')).then((content) => JSON.parse(content))
      }

      if (req.template.xlsx && req.template.xlsx.templateAsset && req.template.xlsx.templateAsset.content) {
        return parse(Buffer.from(req.template.xlsx.templateAsset.content, req.template.xlsx.templateAsset.encoding || 'utf8'))
      }

      let docs = []
      let xlsxTemplateShortid

      if (req.template.xlsx && req.template.xlsx.templateAssetShortid) {
        xlsxTemplateShortid = req.template.xlsx.templateAssetShortid
        docs = await reporter.documentStore.collection('assets').find({ shortid: xlsxTemplateShortid }, req)
      }

      if (!docs.length) {
        if (!xlsxTemplateShortid) {
          throw reporter.createError('Unable to find xlsx template. xlsx template not specified', {
            statusCode: 404
          })
        }

        throw reporter.createError(`Unable to find xlsx template with shortid ${xlsxTemplateShortid}`, {
          statusCode: 404
        })
      }

      return parse(docs[0].content)
    }

    const template = await findXlsxTemplate()

    req.data = req.data || {}
    req.data.$xlsxTemplate = template
    req.data.$xlsxModuleDirname = path.join(__dirname, '../')
    req.data.$tempAutoCleanupDirectory = reporter.options.tempAutoCleanupDirectory
    req.data.$addBufferSize = definition.options.addBufferSize || 50000000
    req.data.$escapeAmp = definition.options.escapeAmp
    req.data.$numberOfParsedAddIterations = definition.options.numberOfParsedAddIterations == null ? 50 : definition.options.numberOfParsedAddIterations
  })
}
