const assert = require('node:assert')
const createElementsReplacer = require('../elementsReplacer')
const createIdHandler = require('./idHandler')
const simpleCollection = require('./simpleCollection')
const instanceCollection = require('./instanceCollection')

const partTypeHandlers = new Map([
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
      assert.ok(Array.isArray(partDef.idAttrs), `Part "${partName}" - idAttrs must be an array`)
      assert.ok(partDef.idAttrs.length > 0, `Part "${partName}" - idAttrs must have at least one id attribute defined`)

      const newPartDef = {
        type: partDef.type,
        idAttrs: createIdHandler(partDef.idAttrs, ATTRIBUTE_SEPARATOR)
      }

      partsContainer.set(partName, newPartDef)

      if (isTopLevel) {
        baseItems.set(partName, new Map())
        // ensure the top level parts exists no matter if there are not items in it
        manager.parts.set(partName, createPartCollection(newPartDef, baseItems.get(partName)))
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
    onInit: options.onInit,
    onElement: (el, ctx) => {
      const [baseItemsPartsContainer, partsDefs] = ctx.data.activeData.at(-1)
      const partDef = partsDefs.get(el.nodeName)

      if (partDef == null) {
        return
      }

      if (!hasValidItem(partDef, el)) {
        return
      }

      if (!baseItemsPartsContainer.has(el.nodeName)) {
        baseItemsPartsContainer.set(el.nodeName, new Map())
      }

      const targetBaseItems = baseItemsPartsContainer.get(el.nodeName)

      const idValue = partDef.idAttrs.getValue(Array.from(partDef.idAttrs).map((attr) => el.getAttribute(attr)))

      const baseItem = {
        data: {},
        parts: new Map()
      }

      targetBaseItems.set(idValue, baseItem)

      ctx.addMatch()

      ctx.partDef = partDef
      ctx.baseItemData = baseItem.data

      options.onElementPart?.(el, ctx)

      if (partDef.parts != null) {
        ctx.data.activeData.push([targetBaseItems.get(idValue).parts, partDef.parts])

        ctx.addOnFinish(() => {
          ctx.data.activeData.pop()
        })
      }
    }
  })

  // call onSetup for the top level parts
  for (const [partName, partCollection] of manager.parts) {
    partTypeHandlers.get(partCollection.type).onSetup?.(baseItems.get(partName), partCollection)
  }

  manager.render = () => {
    return contentReplacer.render({
      onMatch: (tItem, ctx) => {
        const partsContainer = ctx ?? manager.parts
        const partCollection = partsContainer.get(tItem.name)

        if (!partCollection) {
          throw new Error(`Part "${tItem.name}" not found for match `)
        }

        const idAttrsArr = Array.from(partCollection.idAttrs)
        const baseId = partCollection.idAttrs.getValue(idAttrsArr.map((attr) => tItem.getAttribute(attr)))
        const itemsIds = partCollection.getInstances(baseId)

        const output = []

        for (const itemId of itemsIds) {
          const item = partCollection.get(itemId)
          const idValues = partCollection.idAttrs.parseValue(itemId)

          let attributes = new Map()

          for (let idx = 0; idx < idAttrsArr.length; idx++) {
            const idAttr = idAttrsArr[idx]
            const idValue = idValues[idx]
            attributes.set(idAttr, idValue)
          }

          const { attributes: elAttributes, ...elRest } = item.data

          if (elAttributes != null) {
            attributes = new Map([...attributes, ...elAttributes])
          }

          output.push({
            attributes,
            ...elRest,
            ctx: partCollection.get(itemId)?.parts ?? new Map(),
            extend: true
          })
        }

        return output
      },
      onSlot: (slotName, ctx) => {
        const partsContainer = ctx ?? manager.parts
        const partCollection = partsContainer.get(slotName)

        if (!partCollection) {
          throw new Error(`Part "${slotName}" not found for slot `)
        }

        const idAttrsArr = Array.from(partCollection.idAttrs)

        const output = []

        for (const newItemId of partCollection.getNewItems()) {
          const item = partCollection.get(newItemId)
          const idValues = partCollection.idAttrs.parseValue(newItemId)

          let attributes = new Map()

          for (let idx = 0; idx < idAttrsArr.length; idx++) {
            const idAttr = idAttrsArr[idx]
            const idValue = idValues[idx]
            attributes.set(idAttr, idValue)
          }

          const { attributes: elAttributes, ...elRest } = item.data

          if (elAttributes != null) {
            attributes = new Map([...attributes, ...elAttributes])
          }

          output.push({ name: slotName, attributes, ...elRest })
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
      const newItem = createPartItem(partDef, baseItems.get(baseId)?.parts ?? new Map(), data)
      items.set(id, newItem)

      if (baseId != null) {
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
    getBase (_baseKey) {
      const baseKey = partDef.idAttrs.getValue(_baseKey)
      return baseItems.get(baseKey)
    },
    hasBase (_baseKey) {
      const baseKey = partDef.idAttrs.getValue(_baseKey)
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

  const partCollectionType = partTypeHandlers.get(partDef.type).createPartCollection(
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

function createPartItem (partDef, baseItemParts, data) {
  const item = {}

  item.data = data

  if (partDef.parts != null) {
    const parts = new Map()

    for (const [childPartName, childPartDef] of partDef.parts) {
      const childBaseItems = baseItemParts.get(childPartName) ?? new Map()
      const partCollection = createPartCollection(childPartDef, childBaseItems)

      // call onSetup for the child level parts
      partTypeHandlers.get(partDef.type).onSetup?.(childBaseItems, partCollection)

      parts.set(childPartName, partCollection)
    }

    item.parts = parts
  }

  return item
}

function hasValidItem (partDef, el) {
  return Array.from(partDef.idAttrs).every((attr) => el.hasAttribute(attr))
}
