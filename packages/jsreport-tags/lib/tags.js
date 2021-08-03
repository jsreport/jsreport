const reservedTagNamesExport = require('../shared/reservedTagNames')
const reservedTagNames = reservedTagNamesExport.default
const HEX_COLOR_REGEXP = /^#[0-9A-F]{6}$/i

module.exports = function (reporter, definition) {
  // define entity Tag
  reporter.documentStore.registerEntityType('TagType', {
    name: { type: 'Edm.String' },
    description: { type: 'Edm.String' },
    color: { type: 'Edm.String' }
  })

  // expose it as an entity set
  reporter.documentStore.registerEntitySet('tags', {
    entityType: 'jsreport.TagType',
    splitIntoDirectories: true
  })

  reporter.documentStore.registerComplexType('TagRefType', {
    shortid: { type: 'Edm.String', referenceTo: 'tags' }
  })

  // after document store initialization, extend all entity types with tag information
  reporter.documentStore.on('before-init', (documentStore) => {
    Object.entries(documentStore.model.entitySets).forEach(([k, entitySet]) => {
      const entityTypeName = entitySet.entityType.replace(documentStore.model.namespace + '.', '')

      // ignore TagType
      if (entityTypeName !== 'TagType') {
        documentStore.model.entityTypes[entityTypeName].tags = {
          type: 'Collection(jsreport.TagRefType)'
        }
      }
    })
  })

  // initialize operations after the extension has been loaded
  reporter.initializeListeners.add(definition.name, () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        organizeByDefault: definition.options.organizeByDefault
      })
    }

    reporter.documentStore.collection('tags').beforeInsertListeners.add('tags', (doc) => {
      if (reservedTagNames.includes(doc.name)) {
        throw reporter.createError(`${doc.name} can't be used as a tag name, it is a reserved name`, {
          statusCode: 400
        })
      }

      if (!doc.color) {
        throw reporter.createError('color field cannot be empty', {
          statusCode: 400
        })
      }

      if (!HEX_COLOR_REGEXP.test(doc.color)) {
        throw reporter.createError('color field must have a valid hex value', {
          statusCode: 400
        })
      }
    })

    reporter.documentStore.collection('tags').beforeUpdateListeners.add('tags', (query, update) => {
      if ('name' in update.$set) {
        if (reservedTagNames.includes(update.$set.name)) {
          throw reporter.createError(`${update.$set.name} can't be used as a tag name, it is a reserved name`, {
            statusCode: 400
          })
        }
      }

      if ('color' in update.$set) {
        if (!update.$set.color) {
          throw reporter.createError('color field cannot be empty', {
            statusCode: 400
          })
        }

        if (!HEX_COLOR_REGEXP.test(update.$set.color)) {
          throw reporter.createError('color field must have a valid hex value', {
            statusCode: 400
          })
        }
      }
    })
  })
}
