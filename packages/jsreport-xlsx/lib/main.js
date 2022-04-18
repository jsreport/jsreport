const extend = require('node.extend.without.arrays')
const serialize = require('./transformation/serialize')

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

  reporter.documentStore.registerEntityType('XlsxTemplateType', {
    name: { type: 'Edm.String' },
    contentRaw: { type: 'Edm.Binary', document: { extension: 'xlsx' } },
    content: { type: 'Edm.String', document: { extension: 'txt' } }
  })

  // NOTE: xlsxTemplates are deprecated, we will remove it in jsreport v4
  reporter.documentStore.registerEntitySet('xlsxTemplates', {
    entityType: 'jsreport.XlsxTemplateType',
    splitIntoDirectories: true,
    // since it is deprecated we don't want that imports process xlsxTemplates
    exportable: false
  })

  reporter.documentStore.registerComplexType('XlsxRefType', {
    templateAssetShortid: { type: 'Edm.String', referenceTo: 'assets', schema: { type: 'null' } }
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    reporter.documentStore.model.entityTypes.TemplateType.xlsx = { type: 'jsreport.XlsxRefType', schema: { type: 'null' } }
  }

  reporter.documentStore.on('after-init', () => {
    reporter.documentStore.collection('xlsxTemplates').beforeInsertListeners.add('xlsxTemplates', (doc) => {
      return serialize(doc.contentRaw).then((serialized) => (doc.content = serialized))
    })

    reporter.documentStore.collection('xlsxTemplates').beforeUpdateListeners.add('xlsxTemplates', (query, update, req) => {
      if (update.$set && update.$set.contentRaw) {
        return serialize(update.$set.contentRaw).then((serialized) => (update.$set.content = serialized))
      }
    })
  })

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
