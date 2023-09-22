
export default function createGroupEntitiesByFolders () {
  const foldersCache = new WeakMap()
  const nodesCache = new WeakMap()

  return (entitySets, entities, helpers) => {
    const entitySetsNames = Object.keys(entitySets)

    const result = groupEntitiesByFolders(entitySetsNames, entities, helpers, {
      foldersCache,
      nodesCache
    })

    return result
  }
}

function groupEntitiesByFolders (entitySetsNames, entities, helpers, { foldersCache, nodesCache }) {
  const newItems = []

  // eslint-disable-next-line
  const allFoldersEntities = [...(Studio.getReferences().folders || [])]
  const entitiesByFolderLevelMap = new Map()
  const foldersByShortidMap = new Map()
  const foldersChildrenCountMap = new Map()

  if (entities.folders != null) {
    for (const currentFolderFromAll of allFoldersEntities) {
      const foundIndex = entities.folders.findIndex((f) => f._id === currentFolderFromAll._id)
      const foundEntity = foundIndex !== -1 ? entities.folders[foundIndex] : undefined

      let folderEntity = foundEntity

      if (currentFolderFromAll !== foundEntity) {
        folderEntity = setOrGetFromCache(
          foldersCache,
          [currentFolderFromAll, foundEntity],
          (f1, f2) => {
            return { ...f1, ...f2 }
          }
        )
      }

      if (folderEntity != null) {
        foldersByShortidMap.set(folderEntity.shortid, folderEntity)
      }
    }
  }

  const newestCheckMap = new Map()

  const context = {
    cache: nodesCache,
    newestCheckMap,
    foldersChildrenCountMap,
    foldersByShortidMap,
    helpers
  }

  // group folders first
  for (const entityFolder of entities.folders) {
    groupEntityByFolderLevel(entitiesByFolderLevelMap, entityFolder, context)
  }

  for (const entitySetName of entitySetsNames) {
    if (entitySetName === 'folders') {
      continue
    }

    const entitiesInSet = entities[entitySetName]

    if (!entitiesInSet) {
      return
    }

    const entitiesInSetCount = entitiesInSet.length

    for (let j = 0; j < entitiesInSetCount; j++) {
      groupEntityByFolderLevel(entitiesByFolderLevelMap, entitiesInSet[j], context)
    }
  }

  // group folders again to detect deletes (check to children count)
  for (const entityFolder of entities.folders) {
    groupEntityByFolderLevel(entitiesByFolderLevelMap, entityFolder, context, true)
  }

  addItemsByHierarchy(newItems, entitiesByFolderLevelMap, context)

  entitiesByFolderLevelMap.clear()
  foldersByShortidMap.clear()
  newestCheckMap.clear()
  foldersChildrenCountMap.clear()

  return newItems
}

function setOrGetFromCache (cache, _keys, initFn, cacheCheck) {
  const keys = (Array.isArray(_keys) ? _keys : [_keys]).filter((_key) => _key != null)
  const matchedIndex = keys.findIndex((k) => cache.has(k))
  const shouldInit = cacheCheck == null ? matchedIndex === -1 : cacheCheck(...keys)

  if (shouldInit) {
    const newItem = initFn(...keys)

    for (const key of keys) {
      cache.set(key, newItem)
    }

    return newItem
  }

  return cache.get(keys[matchedIndex])
}

function addItemsByHierarchy (newItems, entitiesByFolderLevelMap, context, level = 0, parentMeta) {
  const entitiesInLevel = entitiesByFolderLevelMap.get(level)?.entities
  const foldersInLevel = []
  const otherEntitiesInLevel = []

  if (!entitiesInLevel) {
    return
  }

  const { cache, newestCheckMap, foldersChildrenCountMap } = context
  const { getNodeId, checkIsGroupNode, checkIsGroupEntityNode } = context.helpers
  const optimizedFoldersMap = new Map()

  entitiesInLevel.sort((a, b) => {
    if (!a.__entitySet || !b.__entitySet) {
      return 0
    }

    const nameA = a.name
    const nameB = b.name

    if (nameA < nameB) {
      return -1
    }

    if (nameA > nameB) {
      return 1
    }

    return 0
  }).forEach((entity) => {
    if (parentMeta && entity.folder && parentMeta.shortid !== entity.folder.shortid) {
      return
    }

    let collection
    let createNode

    if (entity.__entitySet === 'folders') {
      createNode = (e) => ({
        name: e.name,
        isGroup: true,
        isEntity: true,
        data: e,
        items: []
      })

      collection = foldersInLevel
    } else {
      createNode = (e) => ({
        name: e.name,
        data: e
      })

      collection = otherEntitiesInLevel
    }

    const { node } = setOrGetFromCache(
      cache,
      entity,
      (e) => {
        const newNode = createNode(e)
        const isGroupEntityNode = checkIsGroupEntityNode(newNode)
        const isGroupNode = checkIsGroupNode(newNode)
        const isOnlyGroupNode = isGroupNode && !isGroupEntityNode
        // technically we also depend on parentMeta to know if something changed in the
        // hierarchy, however since we use immutable data structures in the studio we just
        // rely on entity being different
        const nodeId = getNodeId(newNode.name, isOnlyGroupNode ? null : newNode.data, parentMeta != null ? parentMeta.nodeId : undefined, level)
        newNode.id = nodeId

        const childrenCount = foldersChildrenCountMap.get(e._id)?.size || 0

        return { node: newNode, childrenCount }
      },
      (e) => {
        let shouldCreate

        if (!newestCheckMap.has(e._id)) {
          shouldCreate = true
        } else {
          shouldCreate = newestCheckMap.get(e._id)
        }

        if (!shouldCreate && e.__entitySet === 'folders') {
          optimizedFoldersMap.set(e._id, true)
        }

        return shouldCreate
      }
    )

    collection.push(node)
  })

  foldersInLevel.forEach((i) => newItems.push(i))
  otherEntitiesInLevel.forEach((i) => newItems.push(i))

  if (foldersInLevel.length > 0) {
    foldersInLevel.forEach((f) => {
      if (optimizedFoldersMap.has(f.data._id)) {
        return
      }

      addItemsByHierarchy(f.items, entitiesByFolderLevelMap, context, level + 1, {
        nodeId: f.id,
        shortid: f.data.shortid
      })
    })
  }

  optimizedFoldersMap.clear()
}

function findFolderInSet (foldersByShortidMap, folderShortId) {
  return foldersByShortidMap.get(folderShortId)
}

function getLevel (foldersByShortidMap, entity) {
  let level = 0
  let currentEntity = entity

  while (currentEntity && currentEntity.folder != null) {
    level++

    currentEntity = findFolderInSet(foldersByShortidMap, currentEntity.folder.shortid)
  }

  return level
}

function groupEntityByFolderLevel (
  entitiesByFolderLevelMap,
  _entity,
  context,
  checkChildrenCount = false
) {
  const { cache, newestCheckMap, foldersChildrenCountMap, foldersByShortidMap } = context

  let level = 0
  let currentFolder

  let entity = _entity

  // ensure folder entity references to the normalized folders
  if (entity.__entitySet === 'folders') {
    entity = findFolderInSet(foldersByShortidMap, entity.shortid)
  }

  if (entity.__entitySet === 'folders') {
    currentFolder = findFolderInSet(foldersByShortidMap, entity.shortid)

    if (currentFolder && currentFolder.folder != null) {
      currentFolder = findFolderInSet(foldersByShortidMap, currentFolder.folder.shortid)
    } else {
      currentFolder = null
    }
  } else if (entity.folder != null) {
    currentFolder = findFolderInSet(foldersByShortidMap, entity.folder.shortid)
  }

  const parents = []

  while (currentFolder) {
    const currentFolderLevel = getLevel(foldersByShortidMap, currentFolder)

    addEntityToEntitiesLevelMap(entitiesByFolderLevelMap, currentFolderLevel, currentFolder)

    parents.unshift(currentFolder)

    level++

    if (currentFolder.folder != null) {
      currentFolder = findFolderInSet(foldersByShortidMap, currentFolder.folder.shortid)
    } else {
      currentFolder = null
    }
  }

  addEntityToEntitiesLevelMap(entitiesByFolderLevelMap, level, entity)

  const hierarchy = [...parents, entity]

  for (let index = hierarchy.length - 1; index >= 0; index--) {
    const current = hierarchy[index]
    const parent = hierarchy[index - 1]
    const currentIsNew = !cache.has(current)

    const oldIsNew = newestCheckMap.get(current._id)
    let isNew

    if (oldIsNew != null) {
      isNew = !oldIsNew ? currentIsNew : oldIsNew
    } else {
      isNew = currentIsNew
    }

    if (!isNew && current.__entitySet === 'folders' && !currentIsNew) {
      const { childrenCount: oldChildrenCount } = cache.get(current)

      if (checkChildrenCount) {
        // this detects deletes inside folders
        const currentChildrenCount = foldersChildrenCountMap.get(current._id)?.size || 0
        isNew = currentChildrenCount !== oldChildrenCount
      }
    }

    newestCheckMap.set(current._id, isNew)

    if (parent != null && parent.__entitySet === 'folders') {
      updateChildrenCount(foldersChildrenCountMap, parent, current)
    }

    if (
      parent != null &&
      // if there is no entry or if child is new change the parent entry
      (!newestCheckMap.has(parent._id) || isNew)
    ) {
      newestCheckMap.set(parent._id, isNew)
    }
  }
}

function updateChildrenCount (foldersChildrenCountMap, folder, entity) {
  if (!foldersChildrenCountMap.has(folder._id)) {
    foldersChildrenCountMap.set(folder._id, new Set())
  }

  const entitiesSet = foldersChildrenCountMap.get(folder._id)
  entitiesSet.add(entity._id)
}

function addEntityToEntitiesLevelMap (entitiesByFolderLevelMap, level, entity) {
  initEntitiesLevelMapIfEmpty(entitiesByFolderLevelMap, level)

  const currentLevel = entitiesByFolderLevelMap.get(level)

  if (!currentLevel.allByIdMap.has(entity._id)) {
    currentLevel.entities.push(entity)
    currentLevel.allByIdMap.set(entity._id, entity)
  }
}

function initEntitiesLevelMapIfEmpty (entitiesByFolderLevelMap, level) {
  if (entitiesByFolderLevelMap.has(level)) {
    return
  }

  entitiesByFolderLevelMap.set(level, {
    allByIdMap: new Map(),
    entities: []
  })
}
