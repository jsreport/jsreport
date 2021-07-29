const extend = require('node.extend.without.arrays')

module.exports = (reporter, definition) => {
  definition.options = extend(true, { preview: {}, beta: {} }, reporter.options.office, definition.options)

  reporter.extensionsManager.recipes.push({
    name: 'docx'
  })

  reporter.documentStore.registerComplexType('DocxType', {
    templateAssetShortid: { type: 'Edm.String', referenceTo: 'assets' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.docx = { type: 'jsreport.DocxType', schema: { type: 'null' } }

  reporter.initializeListeners.add('docx', () => {
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
