module.exports = (entitySetsNames, entities) => {
  const newItems = []
  const allFoldersEntities = Studio.getReferences().folders || []
  const entitiesByFolderLevel = {}

  if (entities.folders != null) {
    entities.folders.forEach((cF) => {
      let foundEntity
      const foundIndex = allFoldersEntities.findIndex((f) => {
        const found = f._id === cF._id

        if (found) {
          foundEntity = cF
        }

        return found
      })

      if (foundIndex !== -1) {
        allFoldersEntities[foundIndex] = { ...allFoldersEntities[foundIndex], ...foundEntity }
      }
    })
  }

  // group folders first
  entities.folders.forEach((entityFolder) => {
    groupEntityByFolderLevel(entitiesByFolderLevel, allFoldersEntities, entityFolder)
  })

  entitySetsNames.forEach((entitySetName) => {
    if (entitySetName === 'folders') {
      return
    }

    const entitiesInSet = entities[entitySetName]

    if (!entitiesInSet) {
      return
    }

    const entitiesInSetCount = entitiesInSet.length

    for (let j = 0; j < entitiesInSetCount; j++) {
      groupEntityByFolderLevel(entitiesByFolderLevel, allFoldersEntities, entitiesInSet[j])
    }
  })

  addItemsByHierarchy(newItems, entitiesByFolderLevel)

  return newItems
}

function getLevel (allFolders, entity) {
  let level = 0
  let currentEntity = entity

  while (currentEntity && currentEntity.folder != null) {
    level++

    currentEntity = findFolderInSet(allFolders, currentEntity.folder.shortid)
  }

  return level
}

function addItemsByHierarchy (newItems, entitiesByFolderLevel, level = 0, parentFolderShortId) {
  const entitiesInLevel = entitiesByFolderLevel[level]
  const foldersInLevel = []
  const otherEntitiesInLevel = []

  if (!entitiesInLevel) {
    return
  }

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
    if (parentFolderShortId && entity.folder && parentFolderShortId !== entity.folder.shortid) {
      return
    }

    if (entity.__entitySet === 'folders') {
      foldersInLevel.push({
        name: entity.name,
        isGroup: true,
        isEntity: true,
        data: entity,
        items: []
      })
    } else {
      otherEntitiesInLevel.push({
        name: entity.name,
        data: entity
      })
    }
  })

  foldersInLevel.forEach((i) => newItems.push(i))
  otherEntitiesInLevel.forEach((i) => newItems.push(i))

  if (foldersInLevel.length > 0) {
    foldersInLevel.forEach((f) => {
      addItemsByHierarchy(f.items, entitiesByFolderLevel, level + 1, f.data.shortid)
    })
  }
}

function findFolderInSet (folderSet, folderShortId) {
  let folder

  const found = folderSet.some((folderInSet) => {
    folder = folderInSet
    return folderInSet.shortid === folderShortId
  })

  if (found) {
    return folder
  }

  return undefined
}

function groupEntityByFolderLevel (collection, allFolders, entity) {
  let level = 0
  let currentFolder

  if (entity.__entitySet === 'folders') {
    currentFolder = findFolderInSet(allFolders, entity.shortid)

    if (currentFolder && currentFolder.folder != null) {
      currentFolder = findFolderInSet(allFolders, currentFolder.folder.shortid)
    } else {
      currentFolder = null
    }
  } else if (entity.folder != null) {
    currentFolder = findFolderInSet(allFolders, entity.folder.shortid)
  }

  while (currentFolder) {
    const currentFolderLevel = getLevel(allFolders, currentFolder)

    if (collection[currentFolderLevel] == null) {
      collection[currentFolderLevel] = []
    }

    if (!collection[currentFolderLevel].some((i) => i._id === currentFolder._id)) {
      collection[currentFolderLevel].push(currentFolder)
    }

    level++

    if (currentFolder.folder != null) {
      currentFolder = findFolderInSet(allFolders, currentFolder.folder.shortid)
    } else {
      currentFolder = null
    }
  }

  if (collection[level] == null) {
    collection[level] = []
  }

  if (!collection[level].some((i) => i._id === entity._id)) {
    collection[level].push(entity)
  }
}
