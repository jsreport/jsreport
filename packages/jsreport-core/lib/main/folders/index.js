const validateReservedName = require('./validateReservedName')
const cascadeFolderRemove = require('./cascadeFolderRemove')
const validateDuplicatedName = require('./validateDuplicatedName')
const getEntitiesInFolder = require('./getEntitiesInFolder')
const moveBetweenFolders = require('./moveBetweenFolders')

module.exports = (reporter) => {
  reporter.documentStore.registerEntityType('FolderType', {
    name: { type: 'Edm.String' }
  })

  reporter.documentStore.registerEntitySet('folders', {
    entityType: 'jsreport.FolderType',
    splitIntoDirectories: true
  })

  reporter.documentStore.registerComplexType('FolderRefType', {
    shortid: { type: 'Edm.String', referenceTo: 'folders', index: true, length: 255 }
  })

  // before document store initialization, extend all entity types with folder information
  reporter.documentStore.on('before-init', (documentStore) => {
    Object.entries(documentStore.model.entitySets).forEach(([k, entitySet]) => {
      const entityTypeName = entitySet.entityType.replace(documentStore.model.namespace + '.', '')
      if (entitySet.exportable !== false) {
        documentStore.model.entityTypes[entityTypeName].folder = {
          type: 'jsreport.FolderRefType',
          // folder reference can be null when entity is at the root level
          schema: { type: 'null' }
        }
      }
    })
  })

  reporter.documentStore.internalAfterInitListeners.add('core-validate-reserved-name', () => validateReservedName(reporter))
  reporter.documentStore.internalAfterInitListeners.add('core-cascade-remove', () => cascadeFolderRemove(reporter))
  reporter.documentStore.internalAfterInitListeners.add('core-validate-duplicated-name', () => validateDuplicatedName(reporter))

  return {
    move: moveBetweenFolders(reporter),
    getEntitiesInFolder: getEntitiesInFolder(reporter)
  }
}
