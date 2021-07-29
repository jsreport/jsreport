/*!
 * Copyright(c) 2018 Jan Blaha
 */

module.exports = function (reporter, definition) {
  reporter.extensionsManager.engines.push({
    name: 'handlebars'
  })

  // we need to addFileExtensionResolver after the store provider extension is initialized, but before
  // every other extension like sample template is processed
  reporter.initializeListeners.insert(0, 'handlebars', () => {
    reporter.documentStore.addFileExtensionResolver((doc, entitySetName, entityType, propertyType) => {
      if (doc.engine === 'handlebars' && propertyType.document.engine) {
        return 'handlebars'
      }
    })
  })
}
