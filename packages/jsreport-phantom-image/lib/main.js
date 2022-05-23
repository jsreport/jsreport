/*!
 * Copyright(c) 2015 Jan Blaha
 *
 * Recipe rendering images files using phantomjs.
 */

module.exports = function (reporter, definition) {
  definition.options = Object.assign({}, reporter.options.phantom, definition.options)
  definition.options.strategy = definition.options.strategy || 'dedicated-process'
  definition.options.allowLocalFilesAccess = definition.options.allowLocalFilesAccess != null ? definition.options.allowLocalFilesAccess : reporter.options.trustUserCode

  reporter.extensionsManager.recipes.push({
    name: 'phantom-image'
  })

  reporter.documentStore.registerComplexType('PhantomImageType', {
    printDelay: { type: 'Edm.Int32' },
    blockJavaScript: { type: 'Edm.Boolean' },
    waitForJS: { type: 'Edm.Boolean' },
    imageType: { type: 'Edm.String' },
    quality: { type: 'Edm.String' }
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    reporter.documentStore.model.entityTypes.TemplateType.phantomImage = { type: 'jsreport.PhantomImageType' }
  }

  reporter[definition.name] = { definition }
}
