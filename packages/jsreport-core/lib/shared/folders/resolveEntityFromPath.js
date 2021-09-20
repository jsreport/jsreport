const normalizeEntityPath = require('./normalizeEntityPath')

module.exports = (reporter) => async (entityPathParam, targetEntitySet, options, req) => {
  if (req == null) {
    req = options
    options = {}
  }

  const entityPath = normalizeEntityPath(entityPathParam, options, req)
  const fragments = entityPath.split('/').filter(s => s)
  let currentEntity = null
  let currentEntitySet = null
  let currentFolder = null

  if (targetEntitySet) {
    const entitySet = reporter.documentStore.model.entitySets[targetEntitySet]

    if (!entitySet) {
      throw new Error(`Target entity set "${targetEntitySet}" does not exists`)
    }

    if (!entitySet.entityTypeDef.name) {
      throw new Error(`Entity set "${targetEntitySet}" does not have a name attribute`)
    }
  }

  if (fragments.length === 0) {
    return
  }

  const lastIndex = fragments.length - 1

  for (const [index, entityName] of fragments.entries()) {
    if (lastIndex === index) {
      if (!targetEntitySet) {
        for (const c of Object.keys(reporter.documentStore.collections)) {
          if (!reporter.documentStore.model.entitySets[c].entityTypeDef.name) {
            continue
          }

          const query = getSearchQuery(entityName, currentFolder)
          currentEntitySet = c
          currentEntity = await reporter.documentStore.collection(c).findOne(query, req)

          if (currentEntity) {
            break
          }
        }
      } else {
        const query = getSearchQuery(entityName, currentFolder)
        currentEntitySet = targetEntitySet
        currentEntity = await reporter.documentStore.collection(targetEntitySet).findOne(query, req)
      }
    } else {
      const query = getSearchQuery(entityName, currentFolder)
      const folder = await reporter.documentStore.collection('folders').findOne(query, req)

      if (!folder) {
        break
      }

      currentFolder = folder
    }
  }

  if (!currentEntity) {
    return
  }

  return {
    entitySet: currentEntitySet,
    entity: currentEntity
  }
}

function getSearchQuery (name, currentFolder) {
  const query = {
    name
  }

  if (currentFolder) {
    query.folder = { shortid: currentFolder.shortid }
  } else {
    query.folder = null
  }

  return query
}
