module.exports = function (reporter, definition) {
  reporter.documentStore.registerEntityType('ComponentType', {
    name: { type: 'Edm.String' },
    content: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    helpers: { type: 'Edm.String', document: { extension: 'js' }, schema: { type: 'object' } },
    engine: { type: 'Edm.String' }
  })

  reporter.documentStore.addFileExtensionResolver(function (doc, entitySetName, entityType, propertyType) {
    if (entitySetName === 'components' && propertyType.document.engine) {
      return doc.engine
    }
  })

  reporter.documentStore.registerEntitySet('components', {
    entityType: 'jsreport.ComponentType',
    splitIntoDirectories: true
  })

  reporter.initializeListeners.add('components', () => {
    reporter.documentStore.collection('components').beforeInsertListeners.add('components', (doc) => {
      if (!doc.engine) {
        throw reporter.createError('Component must contain engine', {
          weak: true,
          statusCode: 400
        })
      }
    })

    reporter.documentStore.collection('components').beforeUpdateListeners.add('components', (q, u) => {
      if (u.$set && u.$set.engine == null) {
        throw reporter.createError('Component must contain engine', {
          weak: true,
          statusCode: 400
        })
      }
    })
  })
}
