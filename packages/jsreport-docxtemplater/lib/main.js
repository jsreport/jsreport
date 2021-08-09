const extend = require('node.extend.without.arrays')

module.exports = function (reporter, definition) {
  definition.options = extend(true, { preview: {} }, reporter.options.office, definition.options)

  reporter.extensionsManager.recipes.push({
    name: 'docxtemplater'
  })

  reporter.documentStore.registerComplexType('DocxTemplaterType', {
    templateAssetShortid: { type: 'Edm.String', referenceTo: 'assets' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.docxtemplater = { type: 'jsreport.DocxTemplaterType', schema: { type: 'null' } }

  reporter.initializeListeners.add('docxtemplater', () => {
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
