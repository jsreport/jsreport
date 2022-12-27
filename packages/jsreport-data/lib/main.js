/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Extension which allows to specify some sample report data for designing purposes.
 */

module.exports = function (reporter, definition) {
  reporter.documentStore.registerEntityType('DataItemType', {
    dataJson: { type: 'Edm.String', document: { main: true, extension: 'json' } },
    name: { type: 'Edm.String' }
  })

  reporter.documentStore.registerComplexType('DataItemRefType', {
    shortid: { type: 'Edm.String', referenceTo: 'data' }
  })

  reporter.documentStore.registerEntitySet('data', {
    entityType: 'jsreport.DataItemType',
    splitIntoDirectories: true
  })

  reporter.documentStore.model.entityTypes.TemplateType.data = {
    // this makes the reference to accept null also when validating with json schema
    type: 'jsreport.DataItemRefType', schema: { type: 'null' }
  }

  reporter.documentStore.on('before-init', (documentStore) => {
    if (documentStore.model.entityTypes.ComponentType == null) {
      return
    }

    reporter.documentStore.model.entityTypes.ComponentType.data = {
      // this makes the reference to accept null also when validating with json schema
      type: 'jsreport.DataItemRefType', schema: { type: 'null' }
    }
  })
}
