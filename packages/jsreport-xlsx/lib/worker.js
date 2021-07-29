const recipe = require('./recipe')
const serialize = require('./serialize.js')
const parse = serialize.parse
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

  if (reporter.options.sandbox.allowedModules !== '*') {
    reporter.options.sandbox.allowedModules.push('path')
  }

  reporter.extensionsManager.recipes.push({
    name: 'xlsx',
    execute: (req, res) => recipe(reporter, definition, req, res)
  })

  reporter.beforeRenderListeners.insert({ after: 'data' }, 'xlsxTemplates', async (req) => {
    if (req.template.recipe !== 'xlsx') {
      return
    }

    const findTemplate = async () => {
      if (
        (!req.template.xlsxTemplate || (!req.template.xlsxTemplate.shortid && !req.template.xlsxTemplate.content)) &&
        (!req.template.xlsx || (!req.template.xlsx.templateAssetShortid && !req.template.xlsx.templateAsset))
      ) {
        if (defaultXlsxTemplate) {
          return Promise.resolve(defaultXlsxTemplate)
        }

        return fs.readFile(path.join(__dirname, '../static/defaultXlsxTemplate.json')).then((content) => JSON.parse(content))
      }

      if (req.template.xlsx && req.template.xlsx.templateAsset && req.template.xlsx.templateAsset.content) {
        return parse(Buffer.from(req.template.xlsx.templateAsset.content, req.template.xlsx.templateAsset.encoding || 'utf8'))
      } else if (req.template.xlsxTemplate && req.template.xlsxTemplate.content) {
        return parse(req.template.xlsxTemplate.content)
      }

      let docs
      let xlsxTemplateShortid

      if (req.template.xlsx && req.template.xlsx.templateAssetShortid) {
        xlsxTemplateShortid = req.template.xlsx.templateAssetShortid
        docs = await reporter.documentStore.collection('assets').find({ shortid: xlsxTemplateShortid }, req)
      } else {
        xlsxTemplateShortid = req.template.xlsxTemplate.shortid
        docs = await reporter.documentStore.collection('xlsxTemplates').find({ shortid: xlsxTemplateShortid }, req)
      }

      if (!docs.length) {
        throw reporter.createError(`Unable to find xlsx template with shortid ${xlsxTemplateShortid}`, {
          statusCode: 404
        })
      }

      if (req.template.xlsx && req.template.xlsx.templateAssetShortid) {
        return parse(docs[0].content)
      } else {
        return JSON.parse(docs[0].content)
      }
    }

    const template = await findTemplate()

    req.data = req.data || {}
    req.data.$xlsxTemplate = template
    req.data.$xlsxModuleDirname = path.join(__dirname, '../')
    req.data.$tempAutoCleanupDirectory = reporter.options.tempAutoCleanupDirectory
    req.data.$addBufferSize = definition.options.addBufferSize || 50000000
    req.data.$escapeAmp = definition.options.escapeAmp
    req.data.$numberOfParsedAddIterations = definition.options.numberOfParsedAddIterations == null ? 50 : definition.options.numberOfParsedAddIterations

    const helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
    req.template.helpers = helpersScript + '\n' + (req.template.helpers || '')
  })
}
