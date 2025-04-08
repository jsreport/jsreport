
async function collectEntitiesInHierarchy (reporter, items, sourceEntity, req) {
  if (sourceEntity.__entitySet === 'folders') {
    items.push(sourceEntity)

    const oneLevelItems = []

    for (const es in reporter.documentStore.model.entitySets) {
      if (!reporter.documentStore.model.entitySets[es].entityTypeDef.folder) {
        continue
      }

      const entities = await reporter.documentStore.collection(es).find(
        {
          folder: {
            shortid: sourceEntity.shortid
          }
        },
        req
      )

      entities.map(e => ({ ...e, __entitySet: es, folder: sourceEntity })).forEach(e => oneLevelItems.push(e))
    }

    oneLevelItems.filter(e => e.__entitySet !== 'folders').forEach(e => items.push(e))
    await Promise.all(oneLevelItems.filter(e => e.__entitySet === 'folders').map(e => collectEntitiesInHierarchy(reporter, items, e, req)))
  } else {
    items.push(sourceEntity)
  }
}

async function collectParentFolders (reporter, folder, req) {
  const folders = [folder]

  while (folder.folder) {
    folder = await reporter.documentStore.collection('folders').findOneAdmin({ shortid: folder.folder.shortid }, req)
    folders.push({ ...folder, __entitySet: 'folders' })
  }

  return folders
}

async function collectEntitiesAtSameLevel (reporter, folder, req) {
  const result = []
  for (const es in reporter.documentStore.model.entitySets) {
    if (!reporter.documentStore.model.entitySets[es].entityTypeDef.folder) {
      continue
    }

    const entities = await reporter.documentStore.collection(es).findAdmin(
      {
        folder: {
          shortid: folder.shortid
        }
      },
      req
    )

    entities.map(e => ({ ...e, __entitySet: es })).forEach(e => result.push(e))
  }
  return result
}

async function collectEntitiesWithGroup (reporter, group, req) {
  const result = []

  for (const entitySetName in reporter.documentStore.model.entitySets) {
    const entitySet = reporter.documentStore.model.entitySets[entitySetName]

    if (entitySet.shared || entitySetName === 'usersGroups') {
      continue
    }

    const entities = await reporter.documentStore.collection(entitySetName).findAdmin({
      $or: [
        {
          readPermissionsGroup: group._id
        },
        {
          editPermissionsGroup: group._id
        }
      ]
    }, req)

    entities.map(e => ({ ...e, __entitySet: entitySetName })).forEach(e => result.push(e))
  }

  return result
}

async function collectPermissionsFromEntityGroups (reporter, { entity, groupUsers }, req) {
  let inheritedReadPermissionsFromGroup = []
  let inheritedEditPermissionsFromGroup = []

  const targetGroups = mergeArrays(entity.readPermissionsGroup, entity.editPermissionsGroup)

  for (const groupId of targetGroups) {
    let group

    if (groupUsers != null && groupUsers[groupId] != null) {
      group = groupUsers[groupId]
    } else {
      group = await reporter.documentStore.collection('usersGroups').findOneAdmin({
        _id: groupId
      }, req)
    }

    if (group == null) {
      continue
    }

    // we always inherit the group id
    if (entity.readPermissionsGroup && entity.readPermissionsGroup.includes(groupId)) {
      inheritedReadPermissionsFromGroup = mergeArrays(inheritedReadPermissionsFromGroup, [groupId])
    }

    if (entity.editPermissionsGroup && entity.editPermissionsGroup.includes(groupId)) {
      inheritedEditPermissionsFromGroup = mergeArrays(inheritedEditPermissionsFromGroup, [groupId])
    }

    let usersInGroup = []

    if (group.users) {
      usersInGroup = await reporter.documentStore.collection('users').findAdmin({
        shortid: {
          $in: group.users.map((g) => g.shortid)
        }
      }, { _id: 1 }, req)
    }

    const usersIds = usersInGroup.map((u) => u._id.toString())

    if (entity.readPermissionsGroup && entity.readPermissionsGroup.includes(groupId)) {
      inheritedReadPermissionsFromGroup = mergeArrays(inheritedReadPermissionsFromGroup, usersIds)
    }

    if (entity.editPermissionsGroup && entity.editPermissionsGroup.includes(groupId)) {
      inheritedEditPermissionsFromGroup = mergeArrays(inheritedEditPermissionsFromGroup, usersIds)
    }
  }

  return {
    readPermissions: inheritedReadPermissionsFromGroup,
    editPermissions: inheritedEditPermissionsFromGroup
  }
}

async function sortByHierarchyLevel (reporter, entities, req) {
  const newEntities = []
  const groups = new Map()
  const foldersCache = new Map()

  const getHierarchyLevel = async (entity) => {
    let level = 0

    if (entity.folder == null) {
      return level
    }

    let currentEntity = entity

    while (currentEntity.folder != null) {
      let parentFolder

      if (foldersCache.has(currentEntity.folder.shortid)) {
        parentFolder = foldersCache.get(currentEntity.folder.shortid)
      } else {
        parentFolder = await reporter.documentStore.collection('folders').findOneAdmin({ shortid: currentEntity.folder.shortid }, req)

        if (parentFolder != null) {
          foldersCache.set(currentEntity.folder.shortid, parentFolder)
        }
      }

      if (parentFolder == null) {
        throw new Error(`Parent folder "(shortid: ${currentEntity.folder.shortid})" for entity (entitySet: ${currentEntity.__entitySet}, shortid: "${currentEntity.shortid}") not found. Invalid hierarchy`)
      }

      level++

      currentEntity = parentFolder
    }

    return level
  }

  for (const entity of entities) {
    const hierarchyLevel = await getHierarchyLevel(entity)

    if (!groups.has(hierarchyLevel)) {
      groups.set(hierarchyLevel, [])
    }

    groups.get(hierarchyLevel).push(entity)
  }

  // get levels in ASC order
  const levelsInGroups = Array.from(groups.keys()).sort((a, b) => a - b)

  for (const level of levelsInGroups) {
    const entitiesInLevel = groups.get(level)

    const folders = []
    const restOfEntities = []

    for (const entity of entitiesInLevel) {
      if (entity.__entitySet === 'folders') {
        folders.push(entity)
      } else {
        restOfEntities.push(entity)
      }
    }

    newEntities.push(...folders)
    newEntities.push(...restOfEntities)
  }

  return newEntities
}

function mergeArrays (...params) {
  const arrays = params.map((p) => {
    return p != null ? p : []
  })

  const all = arrays.reduce((acu, arr) => {
    acu.push(...arr)
    return acu
  }, [])

  return [...new Set([...all])]
}

function arraysEqual (a, b) {
  a = a != null ? a : []
  b = b != null ? b : []

  const sa = new Set(a)
  const sb = new Set(b)
  return sa.size === sb.size && a.every(v => sb.has(v))
}

module.exports.collectEntitiesInHierarchy = collectEntitiesInHierarchy
module.exports.collectParentFolders = collectParentFolders
module.exports.collectEntitiesAtSameLevel = collectEntitiesAtSameLevel
module.exports.collectEntitiesWithGroup = collectEntitiesWithGroup
module.exports.collectPermissionsFromEntityGroups = collectPermissionsFromEntityGroups
module.exports.sortByHierarchyLevel = sortByHierarchyLevel
module.exports.mergeArrays = mergeArrays
module.exports.arraysEqual = arraysEqual
