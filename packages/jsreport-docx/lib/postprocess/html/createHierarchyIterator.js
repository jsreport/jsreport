const { isBlockElement, normalizeChildNodes } = require('./htmlNodeUtils')

module.exports = function * createHierarchyIterator ($, mode, documentNode, ctx) {
  // iterates the child nodes based on hierarchy order:
  // [0, 0.0, 0.0.0, 0.0.1, 0.1.0, 0.1.1, 1, ...]
  const meta = { parent: null, idParts: [], targetCollection: [...documentNode.childNodes] }
  const parentDataMap = new WeakMap()
  const activeHierarchy = []
  const lastClosedItems = []
  let previousItem

  const createHierarchyId = (parts) => ({
    parts: parts,
    value: parts.join('.')
  })

  ctx.getLastClosedItems = () => lastClosedItems

  while (meta.targetCollection != null) {
    const { parent, idParts } = meta
    let currentData = {}

    if (parent != null) {
      let closedItems = []
      const currentIdx = idParts[idParts.length - 1]
      const currentNode = parent.collection[currentIdx]
      const inheritedData = parentDataMap.get(parent.parent)?.get(parent.parent?.idx)

      currentData = Object.assign({}, inheritedData)

      // static properties are not inherited, unique per item
      currentData.static = {}

      const hierarchyId = createHierarchyId(idParts)

      const currentItem = {
        hierarchyId,
        node: currentNode,
        data: currentData
      }

      if (previousItem != null) {
        const previousIdPartsLength = previousItem.hierarchyId.parts.length
        let idx = 0
        let toPreserve = 0

        do {
          const currentIdPart = previousItem.hierarchyId.parts[idx]
          const newIdPart = idParts[idx]

          if (currentIdPart === newIdPart) {
            toPreserve++
          } else if (newIdPart > currentIdPart) {
            break
          } else {
            throw new Error('Invalid hierarchy detected')
          }

          idx++
        } while (idx < previousIdPartsLength)

        if (previousIdPartsLength !== toPreserve) {
          closedItems = activeHierarchy.splice(toPreserve, previousIdPartsLength - toPreserve).reverse()

          // NOTE: enable it for debugging
          // for (const closedHierarchyId of closedItems) {
          //   console.log('closing', closedHierarchyId.value)
          // }
        }
      }

      // NOTE: enable it for debugging
      // console.log('opening', hierarchyId.value)
      activeHierarchy.push(hierarchyId)

      yield { currentItem, activeHierarchy, closedItems }

      previousItem = {
        hierarchyId: currentItem.hierarchyId
      }

      const childData = Object.assign({}, currentData)

      if (isBlockElement(currentNode)) {
        childData.parentBlockElement = currentNode
      }

      childData.parentElement = currentNode

      if (!parentDataMap.has(parent)) {
        parentDataMap.set(parent, new Map())
      }

      const parentItemDataMap = parentDataMap.get(parent)

      if (!parentItemDataMap.has(parent.idx)) {
        parentItemDataMap.set(parent.idx, {})
      }

      parentItemDataMap.set(currentIdx, childData)
    }

    // normalize white space in child nodes
    const targetCollection = normalizeChildNodes($, mode, currentData, meta.targetCollection)
    const targetKeys = [...targetCollection.keys()]

    if (targetKeys.length === 0) {
      if (parent == null) {
        meta.targetCollection = null
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
        meta.targetCollection = null
      } else {
        meta.parent = nextParent
        nextParent.idx++

        const nextIdx = nextParent.idx

        meta.idParts = [...nextParent.idParts, nextIdx]
        meta.targetCollection = nextParent.collection[nextIdx].childNodes ? [...nextParent.collection[nextIdx].childNodes] : []
      }

      continue
    }

    meta.parent = {
      idParts,
      collection: targetCollection,
      idx: 0,
      lastIdx: targetKeys.length - 1
    }

    if (parent != null) {
      meta.parent.parent = parent
    }

    // always start with the first item
    meta.idParts = [...idParts, 0]
    meta.targetCollection = targetCollection[0].childNodes ? [...targetCollection[0].childNodes] : []
  }

  const finalParts = previousItem != null ? previousItem.hierarchyId.parts.length : 0

  for (let untilIdx = finalParts; untilIdx > 0; untilIdx--) {
    const hierarchyIdParts = previousItem.hierarchyId.parts.slice(0, untilIdx)
    const hierarchyId = createHierarchyId(hierarchyIdParts)
    lastClosedItems.push(hierarchyId)
    // NOTE: enable it for debugging
    // console.log('closing', hierarchyId.value)
  }
}
