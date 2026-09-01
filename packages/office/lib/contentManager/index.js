const assert = require('node:assert')
const createElementsReplacer = require('../elementsReplacer')
const createIdHandler = require('./idHandler')
const simpleCollection = require('./simpleCollection')
const instanceCollection = require('./instanceCollection')

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

      partsContainer.set(partName, newPartDef)

      if (isTopLevel) {
        baseItems.set(partName, new Map())

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
      options.onInit?.(els, ctx)
    },
    onElement: (el, ctx) => {
      const [baseItemsPartsContainer, partsDefs] = ctx.data.activeData.at(-1)
      const partDef = partsDefs.get(el.nodeName)

      if (partDef == null) {
        return
      }

      if (!hasValidBaseItem(partDef, el)) {
        return
      }

      if (!baseItemsPartsContainer.has(el.nodeName)) {
        baseItemsPartsContainer.set(el.nodeName, new Map())
      }

      const targetBaseItems = baseItemsPartsContainer.get(el.nodeName)

      let idValue

      if (partDef.type !== 'singleItem') {
        idValue = getIdValueFromBaseEl(partDef.idAttrs, el, targetBaseItems.size)
      } else {
        idValue = '0'
      }

      const baseItem = {
        index: targetBaseItems.size,
        data: {},
        parts: new Map()
      }

      targetBaseItems.set(idValue, baseItem)

      ctx.addMatch(baseItem)

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
            const item = part.get(itemId)
            let attributes = idToAttributes(itemId)

            const { attributes: elAttributes, ...elRest } = item.data

            if (elAttributes != null) {
              attributes = new Map([...attributes, ...elAttributes])
            }

            output.push({
              attributes,
              ...elRest,
              ctx: part.get(itemId)?.parts ?? new Map(),
              extend: true
            })
          }
        }

        return output
      },
      onSlot: (ctx, slotName) => {
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
      baseItems.set(singleName, createPartItem(partDef, baseItems.get(singleName)?.parts, data))
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
      const childBaseItems = baseItemParts.get(childPartName) ?? new Map()
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
