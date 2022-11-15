const createRecordManager = require('./recordsManager')
const { groupFoldersByLevel, groupEntitiesByLevel } = require('../helpers')

module.exports = async function getImportRecords (reporter, req, {
  entitiesInExportFile,
  targetFolder,
  targetFolderPath,
  importByEntitySet,
  fullImport
}) {
  const recordsManager = createRecordManager(reporter, req, {
    entitiesInExportFile,
    importByEntitySet,
    targetFolder,
    targetFolderPath
  })

  const exportableCollectionsWithoutFolders = Object.keys(reporter.documentStore.collections).filter((collectionName) => {
    return (
      (
        // null check for back-compatible support
        reporter.documentStore.model.entitySets[collectionName].exportable == null ||
        reporter.documentStore.model.entitySets[collectionName].exportable === true
      ) && collectionName !== 'folders'
    )
  })

  const exportableCollections = [...exportableCollectionsWithoutFolders, 'folders']

  if (fullImport) {
    // when doing full import we first record folders delete at the root level and let core do the cascade deletes for entities inside the folder.
    // it is important that we first save the deletes to the folders for correct permissions propagation
    const foldersAtRoot = await reporter.documentStore.collection('folders').findAdmin({
      folder: null
    }, req)

    for (const f of foldersAtRoot) {
      await recordsManager.addDelete({
        collectionName: 'folders',
        entity: f
      })
    }

    // then save the rest of deletes of entities at the root level
    for (const c of exportableCollectionsWithoutFolders) {
      const collection = reporter.documentStore.collection(c)

      if (!collection) {
        continue
      }

      const entitiesAtRoot = await collection.findAdmin({
        folder: null
      }, req)

      for (const e of entitiesAtRoot) {
        await recordsManager.addDelete({
          collectionName: c,
          entity: e
        })
      }
    }
  }

  let folderGroups

  if (reporter.documentStore.collections.folders != null) {
    // we process folders first to avoid getting errors related to missing
    // folder when inserting an entity
    const validFolders = entitiesInExportFile.folders || []

    folderGroups = groupFoldersByLevel(validFolders)

    const sortedLevelsASC = Object.keys(folderGroups).map((l) => parseInt(l, 10)).sort((a, b) => a - b)
    const foldersToProcess = []

    for (const level of sortedLevelsASC) {
      foldersToProcess.push(...folderGroups[level])
    }

    for (const f of foldersToProcess) {
      await recordsManager.addAndResolveAction({
        collectionName: 'folders',
        entity: f
      })
    }
  }

  for (const c of exportableCollectionsWithoutFolders) {
    const validEntities = entitiesInExportFile[c] || []
    const collection = reporter.documentStore.collection(c)

    if (!collection && validEntities.length > 0) {
      validEntities.forEach((e) => {
        recordsManager.ignore({
          reason: 'missingCollection',
          collectionName: c,
          entity: e
        })
      })

      continue
    } else if (collection && !exportableCollections.includes(collection.name) && validEntities.length > 0) {
      validEntities.forEach((e) => {
        recordsManager.ignore({
          reason: 'collectionNotExportable',
          collectionName: c,
          entity: e
        })
      })

      continue
    }

    const entitiesToProcess = []

    if (folderGroups) {
      const groups = groupEntitiesByLevel(validEntities, folderGroups)
      const sortedLevelsASC = Object.keys(groups).map((l) => parseInt(l, 10)).sort((a, b) => a - b)

      for (const level of sortedLevelsASC) {
        entitiesToProcess.push(...groups[level])
      }
    } else {
      entitiesToProcess.push(...validEntities)
    }

    for (const e of entitiesToProcess) {
      await recordsManager.addAndResolveAction({
        collectionName: c,
        entity: e
      })
    }
  }

  // we are done adding records and we can now safely update
  // references that point to existing value on the store, and queue lazy updates
  // that will be resolved during records processing
  const result = await recordsManager.end()

  return result
}
