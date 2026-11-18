const assert = require('node:assert')
const createElementsReplacer = require('../elementsReplacer')
const createIdHandler = require('./idHandler')
const simpleCollection = require('./simpleCollection')
const instanceCollection = require('./instanceCollection')

/**
 * - "base" renders the instances in the position of its base element,
 * - "sequence" renders all the instances (in the order they were added)
 *    in the position of the first base element of the part, the base elements are just used as templates
 */
const PLACEMENTS = ['base', 'sequence']

// internal method to add items to a base items collection, the collection is read-only for the outside
const addBaseItem = Symbol('addBaseItem')

const partTypeHandlers = new Map([
  ['singleItem', {
    createPart: createSinglePart,
    onSetup: (baseItems, singlePart) => {
      // for a single part if the base item has data, the single
      // part should be initialized
      if (baseItems.size > 0) {
        singlePart.set({})
      }
    }
  }],
  ['simpleCollection', simpleCollection],
  ['instanceCollection', instanceCollection]
])

module.exports.createContentCollectionManager = function createContentCollectionManager () {
  const collection = new Map()

  return {
    has (key) {
      assert.ok(key != null, 'key is required')
      return collection.has(key)
    },
    get (key) {
      assert.ok(key != null, 'key is required')
      return collection.get(key)
    },
    set (key, managerSpec) {
      assert.ok(key != null, 'key is required')
      assert.ok(managerSpec != null, 'managerSpec is required')

      const manager = createContentManager(managerSpec)
      collection.set(key, manager)
      return manager
    },
    all () {
      return collection.entries()
    }
  }
}

module.exports.createContentManager = createContentManager

function createContentManager (options = {}) {
  const { prepare } = options

  assert.ok(prepare != null, 'prepare must be provided')

  const ATTRIBUTE_SEPARATOR = '\n'

  const manager = {
    parts: new Map()
  }

  const baseItems = new Map()
  const lastSimpleCollectionEls = new WeakSet()
  // the first element of each sequence part (in its container) mapped to the data of the slot placed on it
  const sequenceSlotDataByFirstEl = new WeakMap()
  // the nodes between the elements of a sequence part (in its container) mapped to the data of the slot
  // of the part, these nodes are rendered from the slot
  const sequenceSlotDataByNode = new WeakMap()

  // register the slots of the parts in a container:
  // - the new items of simpleCollection parts are rendered from a slot placed after the last element of the part
  //   in the container, or at the start of the container when there are no elements of the part
  // - the instances of sequence parts are rendered from a slot placed at the first element of the part in
  //   the container, the nodes between the elements of the part are rendered from the slot too, so they keep
  //   its order relative to the instances
  const registerContainerSlots = (containerNodes, partsDefs, addStartSlot) => {
    const lastElByPart = new Map()
    const partNodesIndexes = new Map()

    for (let nodeIdx = 0; nodeIdx < containerNodes.length; nodeIdx++) {
      const node = containerNodes[nodeIdx]
      const partDef = partsDefs.get(node.nodeName)

      if (partDef?.type === 'simpleCollection') {
        lastElByPart.set(node.nodeName, node)
      } else if (partDef?.placement === 'sequence' && hasValidBaseItem(partDef, node)) {
        if (!partNodesIndexes.has(node.nodeName)) {
          partNodesIndexes.set(node.nodeName, [])
        }

        partNodesIndexes.get(node.nodeName).push(nodeIdx)
      }
    }

    for (const [partName, partDef] of partsDefs) {
      if (partDef.type === 'simpleCollection') {
        if (lastElByPart.has(partName)) {
          lastSimpleCollectionEls.add(lastElByPart.get(partName))
        } else {
          addStartSlot(partName)
        }
      } else if (partDef.placement === 'sequence' && partNodesIndexes.has(partName)) {
        const nodesIndexes = partNodesIndexes.get(partName)
        const firstNodeIdx = nodesIndexes[0]
        const lastNodeIdx = nodesIndexes.at(-1)
        // registry indexes of the nodes that are rendered from the slot
        const slotData = { nodes: [] }

        sequenceSlotDataByFirstEl.set(containerNodes[firstNodeIdx], slotData)

        for (let nodeIdx = firstNodeIdx + 1; nodeIdx < lastNodeIdx; nodeIdx++) {
          if (!nodesIndexes.includes(nodeIdx)) {
            sequenceSlotDataByNode.set(containerNodes[nodeIdx], slotData)
          }
        }
      }
    }
  }

  const contentReplacer = createElementsReplacer((ctx) => {
    const { elements, parts: rawPartsDefs } = prepare(ctx)

    if (rawPartsDefs == null) {
      throw new Error('Setting parts definition is required for content manager')
    }

    const partsDefs = new Map()

    const pendingParts = [...Object.entries(rawPartsDefs)].map(([partName, partDef]) => {
      return [partName, partDef, partsDefs]
    })

    while (pendingParts.length > 0) {
      const [partName, partDef, partsContainer] = pendingParts.shift()
      const isTopLevel = partsContainer === partsDefs

      assert.ok(partDef.type != null, `Part "${partName}" - type must be provided`)
      assert.ok(partTypeHandlers.has(partDef.type), `Part "${partName}" - type "${partDef.type}" is not supported`)

      if (partDef.type !== 'singleItem') {
        assert.ok(Array.isArray(partDef.idAttrs), `Part "${partName}" - idAttrs must be an array`)
        assert.ok(partDef.idAttrs.length > 0, `Part "${partName}" - idAttrs must have at least one id attribute defined`)
      }

      const newPartDef = {
        type: partDef.type
      }

      if (partDef.type !== 'singleItem') {
        newPartDef.idAttrs = createIdHandler(partDef.idAttrs, ATTRIBUTE_SEPARATOR)
      }

      if (partDef.placement != null) {
        assert.ok(partDef.type === 'instanceCollection', `Part "${partName}" - placement is only supported for instanceCollection type`)
        assert.ok(PLACEMENTS.includes(partDef.placement), `Part "${partName}" - placement "${partDef.placement}" is not supported`)
      }

      if (partDef.type === 'instanceCollection') {
        newPartDef.placement = partDef.placement ?? 'base'
      } else {
        newPartDef.placement = 'base'
      }

      partsContainer.set(partName, newPartDef)

      if (isTopLevel) {
        baseItems.set(partName, createBaseItemsCollection(newPartDef.idAttrs))

        let part

        if (partDef.type !== 'singleItem') {
          part = createPartCollection(newPartDef, baseItems.get(partName))
        } else {
          part = createSinglePart(newPartDef, baseItems.get(partName))
        }

        // ensure the top level parts exists no matter if there are not items in it
        manager.parts.set(partName, part)
      }

      if (partDef.parts != null) {
        newPartDef.parts = new Map()

        const childParts = [...Object.entries(partDef.parts)].map(([childPartName, childPartDef]) => {
          return [childPartName, childPartDef, newPartDef.parts]
        })

        pendingParts.unshift(...childParts)
      }
    }

    if (manager.parts.size === 0) {
      throw new Error('No parts found for content manager')
    }

    ctx.data.activeData = [[baseItems, partsDefs]]

    return elements
  }, {
    onInit: (els, ctx) => {
      const [, partsDefs] = ctx.data.activeData[0]

      // the walk has not started yet, so ctx.addSlot places the slot at the start of the top level elements
      registerContainerSlots(els, partsDefs, ctx.addSlot)

      options.onInit?.(els, ctx)
    },
    onElement: (el, ctx) => {
      const [baseItemsPartsContainer, partsDefs] = ctx.data.activeData.at(-1)
      const partDef = partsDefs.get(el.nodeName)

      // the node is between the elements of a sequence part, it is going to be rendered from the slot of the part
      if (sequenceSlotDataByNode.has(el)) {
        ctx.detach()
        sequenceSlotDataByNode.get(el).nodes.push(ctx.registryIdx)
      }

      if (partDef == null) {
        return
      }

      if (partDef.type === 'simpleCollection' && lastSimpleCollectionEls.has(el)) {
        ctx.addSlot(el.nodeName)
      }

      if (!hasValidBaseItem(partDef, el)) {
        return
      }

      const targetBaseItems = baseItemsPartsContainer.get(el.nodeName)

      // for sequence placement, the instances are rendered from a slot placed
      // at the first base element of the part in the container
      if (sequenceSlotDataByFirstEl.has(el)) {
        ctx.addSlot(el.nodeName, sequenceSlotDataByFirstEl.get(el))
      }

      let idValue

      if (partDef.type !== 'singleItem') {
        idValue = getIdValueFromBaseEl(partDef.idAttrs, el, targetBaseItems.size)
      } else {
        idValue = '0'
      }

      const baseItem = {
        index: targetBaseItems.size,
        // reference to the base element, used to produce elements from it
        registryIdx: ctx.registryIdx,
        data: {},
        parts: createBaseItemsParts(partDef)
      }

      targetBaseItems[addBaseItem](idValue, baseItem)

      ctx.addMatch(baseItem)

      ctx.partDef = partDef
      ctx.baseItemData = baseItem.data

      options.onElementPart?.(el, ctx)

      if (partDef.parts != null) {
        registerContainerSlots(Array.from(el.childNodes), partDef.parts, ctx.addChildSlot)

        ctx.data.activeData.push([baseItem.parts, partDef.parts])

        ctx.addOnFinish(() => {
          ctx.data.activeData.pop()
        })
      }
    }
  })

  // call onSetup for the top level parts
  for (const [partName, part] of manager.parts) {
    partTypeHandlers.get(part.type).onSetup?.(baseItems.get(partName), part)
  }

  manager.render = () => {
    return contentReplacer.render({
      onMatch: (ctx, tItem, baseItem) => {
        const partsContainer = ctx ?? manager.parts
        const part = partsContainer.get(tItem.name)

        if (!part) {
          throw new Error(`Part "${tItem.name}" not found for match `)
        }

        const output = []

        if (part.placement === 'sequence') {
          // when using "sequence" the instances are rendered from the slot,
          // no on match
          return output
        }

        if (part.type === 'singleItem') {
          const item = part.get()

          if (item) {
            output.push({
              ...item.data,
              ctx: part.get()?.parts ?? new Map(),
              extend: true
            })
          }
        } else {
          const idToAttributes = createIdToAttributes(part.idAttrs)
          const baseId = getIdValueFromBaseEl(part.idAttrs, tItem, baseItem.index)
          const itemsIds = part.getInstances(baseId)

          for (const itemId of itemsIds) {
            output.push(createInstanceOutput({
              part,
              idToAttributes,
              itemId,
              extend: true
            }))
          }
        }

        return output
      },
      onSlot: (ctx, slotName, slotData) => {
        const partsContainer = ctx ?? manager.parts
        const part = partsContainer.get(slotName)

        if (!part) {
          throw new Error(`Part "${slotName}" not found for slot `)
        }

        const output = []

        if (part.type === 'singleItem') {
          if (part.has()) {
            output.push({ name: slotName, ...part.get().data })
          }
        } else if (part.placement === 'sequence') {
          const idToAttributes = createIdToAttributes(part.idAttrs)
          // the nodes between the elements of the part, the registry indexes follow the order of
          // the nodes in the container, so we can compare them with the registry index of the base elements
          const nodes = slotData?.nodes ?? []
          let nodeIdx = 0

          // .all() returns the instances in the order they were added
          for (const [itemId, item] of part.all()) {
            const baseRegistryIdx = part.getBase(item.baseId).registryIdx

            // render the nodes that are before the base element of the instance
            while (nodeIdx < nodes.length && nodes[nodeIdx] < baseRegistryIdx) {
              output.push(nodes[nodeIdx])
              nodeIdx++
            }

            output.push(createInstanceOutput({
              part,
              idToAttributes,
              itemId,
              extend: baseRegistryIdx
            }))
          }

          // render the remaining nodes
          output.push(...nodes.slice(nodeIdx))
        } else {
          const idToAttributes = createIdToAttributes(part.idAttrs)

          for (const newItemId of part.getNewItems()) {
            const item = part.get(newItemId)
            let attributes = idToAttributes(newItemId)

            const { attributes: elAttributes, ...elRest } = item.data

            if (elAttributes != null) {
              attributes = new Map([...attributes, ...elAttributes])
            }

            output.push({ name: slotName, attributes, ...elRest })
          }
        }

        return output
      }
    })
  }

  return manager
}

function createPartCollection (partDef, baseItems) {
  const items = new Map()
  const newItemsIds = new Set()
  const baseToItemsIds = new Map()

  const linkBaseAndItem = (baseId, id) => {
    if (!baseItems.has(baseId)) {
      throw new Error(`Base item with key ${baseId} does not exist`)
    }

    if (!baseToItemsIds.has(baseId)) {
      baseToItemsIds.set(baseId, new Set())
    }

    baseToItemsIds.get(baseId).add(id)
  }

  const upsertItem = (baseId, id, data) => {
    if (items.has(id)) {
      items.get(id).data = data
    } else {
      // new items (no base) does not have base items for child parts
      const newItem = createPartItem(partDef, baseId != null ? baseItems.get(baseId)?.parts : null, data)
      items.set(id, newItem)

      if (baseId != null) {
        newItem.baseId = baseId
        linkBaseAndItem(baseId, id)
      } else {
        newItemsIds.add(id)
      }
    }
  }

  const partCollection = {
    get type () {
      return partDef.type
    },
    get idAttrs () {
      return partDef.idAttrs
    },
    get placement () {
      return partDef.placement
    },
    getBase (baseKey) {
      return baseItems.get(baseKey)
    },
    hasBase (baseKey) {
      return baseItems.has(baseKey)
    },
    has (_key) {
      const key = partDef.idAttrs.getValue(_key)
      return items.has(key)
    },
    get (_key) {
      const key = partDef.idAttrs.getValue(_key)
      return items.get(key)
    },
    getInstances (baseId) {
      if (!baseItems.has(baseId)) {
        throw new Error(`Base item with key ${baseId} does not exist`)
      }

      return (baseToItemsIds.get(baseId) ?? new Set()).values()
    },
    getNewItems () {
      return newItemsIds.values()
    },
    get size () {
      return items.size
    },
    all () {
      return items.entries()
    }
  }

  const partCollectionType = partTypeHandlers.get(partDef.type).createPart(
    partDef.idAttrs,
    {
      baseItems,
      items,
      upsertItem
    }
  )

  Object.assign(partCollection, partCollectionType)

  return partCollection
}

function createSinglePart (partDef, baseItems) {
  const singleName = '0'

  return {
    get type () {
      return partDef.type
    },
    get () {
      return baseItems.get(singleName)
    },
    set (data) {
      baseItems[addBaseItem](singleName, createPartItem(partDef, baseItems.get(singleName)?.parts, data))
    },
    has () {
      return baseItems.has(singleName)
    }
  }
}

function createPartItem (partDef, baseItemParts, data) {
  const item = {}

  item.data = data

  if (partDef.parts != null) {
    const parts = new Map()

    for (const [childPartName, childPartDef] of partDef.parts) {
      const childBaseItems = baseItemParts?.get(childPartName) ?? createBaseItemsCollection(childPartDef.idAttrs)
      let part

      if (childPartDef.type !== 'singleItem') {
        part = createPartCollection(childPartDef, childBaseItems)
      } else {
        part = createSinglePart(childPartDef, childBaseItems)
      }

      // call onSetup for the child level parts
      partTypeHandlers.get(childPartDef.type).onSetup?.(childBaseItems, part)

      parts.set(childPartName, part)
    }

    item.parts = parts
  }

  return item
}

// the base items (items from the original elements) of a part, ids are normalized
// in the same way than in the part collections
function createBaseItemsCollection (idAttrs) {
  const items = new Map()
  // singleItem parts does not have id attributes
  const normalizeId = (id) => idAttrs != null ? idAttrs.getValue(id) : id

  return {
    get size () {
      return items.size
    },
    has (id) {
      return items.has(normalizeId(id))
    },
    get (id) {
      return items.get(normalizeId(id))
    },
    keys () {
      return items.keys()
    },
    all () {
      return items.entries()
    },
    [addBaseItem] (id, item) {
      items.set(normalizeId(id), item)
    }
  }
}

// the base items collections of the child parts, created for all the child parts
// no matter if there are elements for it
function createBaseItemsParts (partDef) {
  const parts = new Map()

  for (const [childPartName, childPartDef] of partDef.parts ?? []) {
    parts.set(childPartName, createBaseItemsCollection(childPartDef.idAttrs))
  }

  return parts
}

function hasValidBaseItem (partDef, el) {
  if (partDef.type === 'singleItem') {
    return true
  }

  return Array.from(partDef.idAttrs).every((attr) => {
    if (attr === '@index') {
      return true
    }

    return el.hasAttribute(attr)
  })
}

function getIdValueFromBaseEl (idAttrs, el, elIdx) {
  return idAttrs.getValue(Array.from(idAttrs).map((attr) => {
    if (attr === '@index') {
      return elIdx
    }

    return el.getAttribute(attr)
  }))
}

function createIdToAttributes (idAttrs) {
  const idAttrsArr = Array.from(idAttrs)

  return (id) => {
    const idValues = idAttrs.parseValue(id)

    const attributes = new Map()

    for (let idx = 0; idx < idAttrsArr.length; idx++) {
      const idAttr = idAttrsArr[idx]

      if (idAttr === '@index') {
        continue
      }

      const idValue = idValues[idx]
      attributes.set(idAttr, idValue)
    }

    return attributes
  }
}

function createInstanceOutput ({ part, idToAttributes, itemId, extend }) {
  const item = part.get(itemId)
  let attributes = idToAttributes(itemId)

  const { attributes: elAttributes, ...elRest } = item.data

  if (elAttributes != null) {
    attributes = new Map([...attributes, ...elAttributes])
  }

  return {
    attributes,
    ...elRest,
    ctx: item.parts ?? new Map(),
    extend
  }
}
