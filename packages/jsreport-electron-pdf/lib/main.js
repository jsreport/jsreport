
module.exports = function (reporter, definition) {
  definition.options = Object.assign({}, reporter.options.electron, definition.options)

  definition.options.strategy = definition.options.strategy || 'dedicated-process'
  definition.options.tmpDir = reporter.options.tempAutoCleanupDirectory

  reporter.documentStore.registerComplexType('ElectronType', {
    marginsType: { type: 'Edm.Int32' },
    // header: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    // headerHeight: { type: 'Edm.String' },
    // footer: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    // footerHeight: { type: 'Edm.String' },
    landscape: { type: 'Edm.Boolean' },
    format: { type: 'Edm.String' },
    printBackground: { type: 'Edm.Boolean' },
    width: { type: 'Edm.Int32' },
    height: { type: 'Edm.Int32' },
    printDelay: { type: 'Edm.Int32' },
    blockJavaScript: { type: 'Edm.Boolean' },
    waitForJS: { type: 'Edm.Boolean' }
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    // eslint-disable-next-line no-param-reassign
    reporter.documentStore.model.entityTypes.TemplateType.electron = {
      type: 'jsreport.ElectronType'
    }
  }

  reporter.extensionsManager.recipes.push({
    name: 'electron-pdf'
  })
}
