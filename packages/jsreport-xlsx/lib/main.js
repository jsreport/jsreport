const extend = require('node.extend.without.arrays')

module.exports = (reporter, definition) => {
  if (reporter.options.xlsx) {
    reporter.logger.warn('xlsx root configuration property is deprecated. Use office property instead')
  }

  definition.options = extend(true, { preview: {} }, reporter.options.xlsx, reporter.options.office, definition.options)
  reporter.options.xlsx = definition.options

  if (definition.options.previewInExcelOnline != null) {
    reporter.logger.warn('extensions.xlsx.previewInExcelOnline configuration property is deprecated. Use office.preview.enabled=false instead')
    definition.options.preview.enabled = definition.options.previewInExcelOnline
  }

  if (definition.options.showExcelOnlineWarning != null) {
    reporter.logger.warn('extensions.xlsx.showExcelOnlineWarning configuration property is deprecated. Use office.preview.showWarning=false instead')
    definition.options.preview.showWarning = definition.options.showExcelOnlineWarning
  }

  if (definition.options.publicUriForPreview != null) {
    reporter.logger.warn('extensions.xlsx.publicUriForPreview configuration property is deprecated. Use office.preview.publicUri=https://... instead')
    definition.options.preview.publicUri = definition.options.publicUriForPreview
  }

  reporter.extensionsManager.recipes.push({
    name: 'xlsx'
  })

  reporter.documentStore.registerComplexType('XlsxRefType', {
    templateAssetShortid: { type: 'Edm.String', referenceTo: 'assets', schema: { type: 'null' } }
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    reporter.documentStore.model.entityTypes.TemplateType.xlsx = { type: 'jsreport.XlsxRefType', schema: { type: 'null' } }
  }

  reporter.initializeListeners.add('xlsx', () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        preview: {
          enabled: definition.options.preview.enabled,
          showWarning: definition.options.preview.showWarning
        }
      })
    }
  })
}
