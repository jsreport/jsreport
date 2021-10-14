/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * html-to-xlsx recipe transforms html into xlsx. The process is based on extracting html and css attributes
 * using phantomjs and then assembling excel Open XML.
 */

const extend = require('node.extend.without.arrays')
const { htmlEngines } = require('./autoDetectHtmlEngines')()

module.exports = function (reporter, definition) {
  definition.options = extend(true, { preview: {} }, reporter.options.xlsx, reporter.options.office, definition.options)

  if (reporter.options.office) {
    Object.assign(definition.options, reporter.options.office)
  }

  if (definition.options.previewInExcelOnline != null) {
    definition.options.preview.enabled = definition.options.previewInExcelOnline
  }

  if (definition.options.showExcelOnlineWarning != null) {
    definition.options.preview.showWarning = definition.options.showExcelOnlineWarning
  }

  if (definition.options.publicUriForPreview != null) {
    definition.options.preview.publicUri = definition.options.publicUriForPreview
  }

  reporter.documentStore.registerComplexType('HtmlToXlsxType', {
    templateAssetShortid: { type: 'Edm.String', referenceTo: 'assets', schema: { type: 'null' } },
    htmlEngine: { type: 'Edm.String' },
    waitForJS: { type: 'Edm.Boolean' }
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    reporter.documentStore.model.entityTypes.TemplateType.htmlToXlsx = { type: 'jsreport.HtmlToXlsxType' }
  }

  definition.options.htmlEngines = Object.keys(htmlEngines)

  if (htmlEngines.chrome) {
    reporter.logger.info('html-to-xlsx detected chrome as available html engine')
  }

  if (htmlEngines.phantom) {
    reporter.logger.info('html-to-xlsx detected phantom as available html engine')
  }

  if (htmlEngines.cheerio) {
    reporter.logger.info('html-to-xlsx detected cheerio as available html engine')
  }

  reporter.extensionsManager.recipes.push({
    name: 'html-to-xlsx'
  })

  reporter.initializeListeners.add(definition.name, () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        htmlEngines: definition.options.htmlEngines,
        preview: {
          enabled: definition.options.preview.enabled,
          showWarning: definition.options.preview.showWarning
        }
      })
    }
  })
}
