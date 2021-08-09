const extend = require('node.extend.without.arrays')

module.exports = (reporter, definition) => {
  definition.options = extend(true, { preview: {}, beta: {} }, reporter.options.office, definition.options)

  reporter.extensionsManager.recipes.push({
    name: 'pptx'
  })

  reporter.documentStore.registerComplexType('PptxType', {
    templateAssetShortid: { type: 'Edm.String', referenceTo: 'assets' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.pptx = { type: 'jsreport.PptxType', schema: { type: 'null' } }

  reporter.initializeListeners.add('pptx', () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        beta: {
          showWarning: definition.options.beta.showWarning
        },
        preview: {
          enabled: definition.options.preview.enabled,
          showWarning: definition.options.preview.showWarning
        }
      })
    }
  })
}
