
module.exports = function createOrderedHierarchyCollection () {
  const hierarchyCollection = new Map()
  const elementsByHierarchyIdMap = new Map()

  return {
    add (hierarchy, item) {
      const hierarchyId = hierarchy.id
      fillHierarchy(hierarchy.parts, hierarchyCollection)

      if (!elementsByHierarchyIdMap.has(hierarchyId)) {
        elementsByHierarchyIdMap.set(hierarchyId, [])
      }

      elementsByHierarchyIdMap.get(hierarchyId).push(item)
    },
    get () {
      const ordered = []
      const orderedIdsIterator = createOrderedHierarchyIterator(hierarchyCollection)

      for (const id of orderedIdsIterator) {
        const items = elementsByHierarchyIdMap.get(id) || []

        if (items.length > 0) {
          ordered.push(...items)
        }
      }

      return ordered
    }
  }
}

function fillHierarchy (hierarchyIdParts, hierarchyCollection) {
  let target = hierarchyCollection

  for (const part of hierarchyIdParts) {
    if (!target.has(part)) {
      target.set(part, new Map())
    }

    target = target.get(part)
  }
}

function * createOrderedHierarchyIterator (hierarchyCollection) {
  const meta = { parent: null, idParts: [], targetHierarchyCollection: hierarchyCollection }

  while (meta.targetHierarchyCollection != null) {
    const { parent, idParts, targetHierarchyCollection } = meta
    const targetKeys = [...targetHierarchyCollection.keys()]

    targetKeys.sort((a, b) => {
      const targetA = parseInt(a, 10)
      const targetB = parseInt(b, 10)
      return targetA - targetB
    })

    if (parent != null) {
      const id = idParts.join('.')
      yield id
    }

    if (targetKeys.length === 0) {
      if (parent == null) {
        meta.targetHierarchyCollection = null
        continue
      }

      let nextParent = parent

      while (nextParent != null) {
        const nextIdx = nextParent.idx + 1

        if (nextIdx > nextParent.lastIdx) {
          nextParent = nextParent.parent
          continue
        }

        break
      }

      if (nextParent == null) {
        meta.targetHierarchyCollection = null
      } else {
        meta.parent = nextParent
        nextParent.idx++

        const nextKey = nextParent.keys[nextParent.idx]

        meta.idParts = [...nextParent.idParts, nextKey]
        meta.targetHierarchyCollection = nextParent.hierarchyCollection.get(nextKey)
      }

      continue
    }

    meta.parent = {
      idParts,
      hierarchyCollection: targetHierarchyCollection,
      keys: targetKeys,
      idx: 0,
      lastIdx: targetKeys.length - 1
    }

    if (parent != null) {
      meta.parent.parent = parent
    }

    meta.idParts = [...idParts, targetKeys[0]]
    meta.targetHierarchyCollection = targetHierarchyCollection.get(targetKeys[0])
  }
}
