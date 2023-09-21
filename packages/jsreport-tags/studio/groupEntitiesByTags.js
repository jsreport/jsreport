import findTagInSet from './findTagInSet'

const { noTagGroupName, tagsGroupName } = require('../shared/reservedTagNames')

export default function createGroupEntitiesByTags () {
  const tagsCache = new WeakMap()

  return (entitySets, entities, helpers) => {
    const entitySetsNames = helpers.getSetsToRender(entitySets)

    const result = groupEntitiesByTags(entitySetsNames, entities, helpers, {
      tagsCache
    })

    return result
  }
}

function groupEntitiesByTags (entitySetsNames, entities, helpers, { tagsCache }) {
  const newItems = []
  // eslint-disable-next-line
  const allTagsEntities = [...(Studio.getReferences().tags || [])]
  const tagsByShortidMap = new Map()

  if (entities.tags != null) {
    for (const currentTagFromAll of allTagsEntities) {
      const foundIndex = entities.tags.findIndex((f) => f._id === currentTagFromAll._id)
      const foundEntity = foundIndex !== -1 ? entities.tags[foundIndex] : undefined

      let tagEntity = foundEntity

      if (currentTagFromAll !== foundEntity) {
        tagEntity = setOrGetFromCache(
          tagsCache,
          [currentTagFromAll, foundEntity],
          (t1, t2) => {
            console.log('creating new tag entity')
            return { ...t1, ...t2 }
          }
        )
      }

      if (tagEntity != null) {
        tagsByShortidMap.set(tagEntity.shortid, tagEntity)
      }
    }
  }

  const entitiesByTagAndType = {}
  const entitiesByTypeWithoutTag = {}

  // initialize all tag groups based on all tag entities
  for (const entityTag of allTagsEntities) {
    groupEntityByTagAndType(entitiesByTagAndType, tagsByShortidMap, entityTag)
  }

  for (const entitySetName of entitySetsNames) {
    if (entitySetName === 'tags') {
      continue
    }

    const entitiesInSet = entities[entitySetName]

    if (!entitiesInSet) {
      continue
    }

    const entitiesInSetCount = entitiesInSet.length

    for (let j = 0; j < entitiesInSetCount; j++) {
      const entity = entitiesInSet[j]

      if (entity.tags != null) {
        groupEntityByTagAndType(entitiesByTagAndType, tagsByShortidMap, entity)
      } else {
        entitiesByTypeWithoutTag[entity.__entitySet] = entitiesByTypeWithoutTag[entity.__entitySet] || []
        entitiesByTypeWithoutTag[entity.__entitySet].push(entity)
      }
    }
  }

  const context = {
    tagsByShortidMap,
    helpers
  }

  addItemsByTag(
    newItems,
    entitySetsNames,
    allTagsEntities,
    entities.tags,
    entitiesByTagAndType,
    entitiesByTypeWithoutTag,
    context
  )

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

function groupEntityByTagAndType (collection, tagsByShortidMap, entity) {
  if (entity.__entitySet === 'tags') {
    collection[entity.shortid] = collection[entity.shortid] || {}
  } else if (entity.tags != null) {
    for (const tag of entity.tags) {
      const tagFound = findTagInSet(tagsByShortidMap, tag.shortid)

      if (tagFound) {
        const shortid = tagFound.shortid
        collection[shortid] = collection[shortid] || {}
        collection[shortid][entity.__entitySet] = collection[shortid][entity.__entitySet] || []
        collection[shortid][entity.__entitySet].push(entity)
      }
    }
  }
}

function addItemsByTag (
  newItems,
  entitySetsNames,
  allTagEntities,
  currentTagEntities,
  entitiesByTagAndType,
  entitiesByTypeWithoutTag,
  context
) {
  const tagsWithNoEntities = []
  const { tagsByShortidMap } = context
  const { getNodeId, checkIsGroupNode, checkIsGroupEntityNode } = context.helpers

  for (const t of allTagEntities) {
    const tag = tagsByShortidMap.get(t.shortid)
    const tagName = tag.name
    const entitiesByType = entitiesByTagAndType[tag.shortid]
    const typesInTag = Object.keys(entitiesByType)

    if (
      typesInTag.length === 0 ||
      typesInTag.every((type) => entitiesByType[type].length > 0) === false
    ) {
      tagsWithNoEntities.push(tag)
      continue
    }

    let tagItem

    for (const type of entitySetsNames) {
      if (type === 'tags') {
        continue
      }

      const entities = entitiesByType[type]

      if (!tagItem) {
        tagItem = {
          name: tagName,
          isGroup: true,
          data: tag,
          items: []
        }

        newItems.push(tagItem)
      }

      if (!entities || entities.length === 0) {
        tagItem.items.push({
          name: type,
          isEntitySet: true,
          items: []
        })

        continue
      }

      const typeItem = {
        name: type,
        isEntitySet: true,
        items: []
      }

      for (const entity of entities) {
        typeItem.items.push({
          name: entity.name,
          data: entity
        })
      }

      tagItem.items.push(typeItem)
    }
  }

  for (const t of tagsWithNoEntities) {
    const tag = tagsByShortidMap.get(t.shortid)

    const tagItem = {
      name: tag.name,
      isGroup: true,
      data: tag,
      items: []
    }

    for (const type of entitySetsNames) {
      if (type === 'tags') {
        continue
      }

      tagItem.items.push({
        name: type,
        isEntitySet: true,
        items: []
      })
    }

    newItems.push(tagItem)
  }

  const noTagsItem = {
    name: noTagGroupName,
    isGroup: true,
    items: []
  }

  for (const type of entitySetsNames) {
    if (type === 'tags') {
      continue
    }

    const item = {
      name: type,
      isEntitySet: true,
      items: []
    }

    const entities = entitiesByTypeWithoutTag[type]

    if (entities) {
      for (const entity of entities) {
        item.items.push({
          name: entity.name,
          data: entity
        })
      }
    }

    noTagsItem.items.push(item)
  }

  newItems.push(noTagsItem)

  const tagsItem = {
    name: tagsGroupName,
    isEntitySet: true,
    items: []
  }

  if (currentTagEntities) {
    for (const t of currentTagEntities) {
      const tag = tagsByShortidMap.get(t.shortid)

      tagsItem.items.push({
        name: tag.name,
        data: tag
      })
    }
  }

  newItems.push(tagsItem)

  const toProcess = [{ parentId: null, items: newItems, depth: 0 }]

  while (toProcess.length > 0) {
    const { parentId, depth, items } = toProcess.shift()

    for (const item of items) {
      const isGroupEntityNode = checkIsGroupEntityNode(item)
      const isGroupNode = checkIsGroupNode(item)
      const isOnlyGroupNode = isGroupNode && !isGroupEntityNode

      // this will make tag groups with same name different
      item.id = getNodeId(item.name, isOnlyGroupNode && item.data?.shortid == null ? null : item.data, parentId, depth)

      if (item.items != null && item.items.length > 0) {
        toProcess.push({
          parentId: item.id,
          items: item.items,
          depth: depth + 1
        })
      }
    }
  }
}
