
module.exports = (reporter) => async function getEntitiesInFolder (folderShortId, recursive, req) {
  if (folderShortId == null) {
    throw new Error('Missing folder shortid param')
  }

  const entities = []
  const lookup = []

  for (const [entitySetName] of Object.entries(reporter.documentStore.model.entitySets)) {
    if (!reporter.documentStore.model.entitySets[entitySetName].entityTypeDef.folder) {
      continue
    }

    lookup.push(reporter.documentStore.collection(entitySetName).find({
      folder: {
        shortid: folderShortId
      }
    }, req).then((results) => {
      if (results.length === 0) {
        return
      }

      if (entitySetName === 'folders') {
        return Promise.all(results.map((folder) => {
          entities.push({
            entitySet: entitySetName,
            entity: folder
          })

          if (recursive === true) {
            return getEntitiesInFolder(folder.shortid, true, req)
          }

          return undefined
        })).then((folderLookupResults) => {
          folderLookupResults.forEach((childEntities) => {
            if (childEntities) {
              entities.push(...childEntities)
            }
          })
        })
      } else {
        results.forEach((entity) => {
          entities.push({
            entitySet: entitySetName,
            entity
          })
        })
      }
    }))
  }

  await Promise.all(lookup)

  return entities
}
