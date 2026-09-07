/* global structuredClone */
const { DOMParser } = require('@xmldom/xmldom')

module.exports = function createElementsReplacer (getElements, opts) {
  const itemsRegistry = []
  let textRegistry = createTextRegistry()
  const topLevelOrder = []
  const itemsMatches = new Map()

  {
    const elementDataMap = new WeakMap()
    let activeOrder = topLevelOrder

    const addSlot = (slotName) => {
      const idx = itemsRegistry.length
      activeOrder.push(idx)
      itemsRegistry.push({ slot: slotName })
    }

    const ctxData = {}

    const els = getElements({ data: ctxData })

    if (opts.onInit) {
      opts.onInit(els, { addSlot, data: ctxData })
    }

    walkElements(els, (el, parentEl) => {
      const name = el.nodeName
      const elementData = processElement(name, el, textRegistry)

      if (parentEl && elementDataMap.has(parentEl)) {
        const parentElementData = elementDataMap.get(parentEl)

        if (parentElementData.children == null) {
          parentElementData.children = []
        }

        activeOrder = parentElementData.children
      } else {
        activeOrder = topLevelOrder
      }

      const idx = itemsRegistry.length
      activeOrder.push(idx)
      itemsRegistry.push(elementData)
      elementDataMap.set(el, elementData)

      if (opts.onElement) {
        const finishCbs = []

        opts.onElement(el, {
          parentEl,
          registryIdx: idx,
          addSlot,
          addMatch: (matchData) => {
            itemsMatches.set(idx, matchData)
          },
          addOnFinish: (cb) => {
            finishCbs.push(cb)
          },
          data: ctxData
        })

        if (finishCbs.length > 0) {
          return () => {
            for (const finishCb of finishCbs) {
              finishCb()
            }
          }
        }
      }
    })
  }

  // unpack the registry data structure to the simpler values
  textRegistry = textRegistry.unpack()

  return {
    itemsRegistry,
    textRegistry,
    render (renderOpts = {}) {
      const domParser = new DOMParser()
      const doc = domParser.parseFromString('<fragment />')

      const pending = []

      if (topLevelOrder.length > 0) {
        // start with the top level items in the original content
        pending.push(...topLevelOrder.map((dataItem) => ({
          containerEl: doc.documentElement,
          item: dataItem
        })))
      }

      while (pending.length > 0) {
        const { containerEl, item, ctx } = pending.shift()
        let fromMainBase = false
        let createElement = true
        let baseItem
        let itemName
        let itemValue
        let customAttributes
        let itemChildren
        const itemChildrenCtx = new WeakMap()

        if (typeof item === 'number') {
          const currentItem = itemsRegistry[item]

          if (currentItem.slot != null) {
            createElement = false

            if (renderOpts.onSlot) {
              itemChildren = renderOpts.onSlot(ctx, currentItem.slot)
            }
          } else {
            fromMainBase = true
            baseItem = getItemFromRegistry(itemsRegistry, textRegistry, item)
            itemName = baseItem.name
            itemValue = baseItem.value
            itemChildren = baseItem.children
          }
        } else if (item.extend != null) {
          const { extend, ...restOfItem } = item
          baseItem = getItemFromRegistry(itemsRegistry, textRegistry, extend)
          itemName = restOfItem.name ?? baseItem.name
          itemValue = restOfItem.value ?? baseItem.value
          customAttributes = restOfItem.attributes
          itemChildren = restOfItem.children ?? baseItem.children
        } else {
          itemName = item.name
          itemValue = item.value
          customAttributes = item.attributes
          itemChildren = item.children
        }

        if (createElement) {
          if (typeof itemName === 'number') {
            itemName = textRegistry[itemName]
          }

          if (itemName == null || typeof itemName !== 'string') {
            throw new Error('Data item has invalid .name ')
          }

          // if this condition passes, then here "item" is the original item index
          if (fromMainBase && baseItem && itemsMatches.has(item)) {
            // only items taken from the template can be matched,
            // otherwise we would be matching already rendered items
            if (renderOpts.onMatch) {
              const matchResult = renderOpts.onMatch(ctx, {
                name: itemName,
                getAttribute (attrName) {
                  return baseItem.attributes?.get(attrName)
                }
              }, itemsMatches.get(item))

              if (matchResult != null) {
                createElement = false
                // replace { extend: "true" } entries for the original item index, so we can reuse the
                // original item when it gets processed
                itemChildren = matchResult.map(({ ctx, ...restOfMatch }) => {
                  const normalizedMatch = restOfMatch

                  if (normalizedMatch.extend === true) {
                    normalizedMatch.extend = item
                  }

                  if (ctx != null) {
                    itemChildrenCtx.set(normalizedMatch, ctx)
                  }

                  return normalizedMatch
                })
              }
            }
          }
        }

        let containerForChildrenEl = containerEl

        if (createElement) {
          let el

          if (itemName === '#raw') {
            const tmpDoc = domParser.parseFromString(`<fragment>${itemValue}</fragment>`)

            for (const childNode of Array.from(tmpDoc.documentElement.childNodes)) {
              containerEl.appendChild(doc.importNode(childNode, true))
            }

            continue
          }

          if (itemName === '#text') {
            el = doc.createTextNode(itemValue)
          } else if (itemName === '#comment') {
            el = doc.createComment(itemValue)
          } else {
            el = doc.createElement(itemName)
          }

          containerEl.appendChild(el)

          let attributes = baseItem?.attributes ?? new Map()

          if (customAttributes) {
            attributes = new Map([...attributes, ...customAttributes])
          }

          for (const [attrName, attrValue] of attributes) {
            if (attrValue == null) {
              // if the attribute value is explicit null, we remove the attribute
              // from the element
              el.removeAttribute(attrName)
            } else {
              el.setAttribute(attrName, attrValue)
            }
          }

          containerForChildrenEl = el
        }

        if (itemChildren?.length > 0) {
          pending.unshift(...itemChildren.map((childItem) => {
            return {
              containerEl: containerForChildrenEl,
              item: childItem,
              ctx: itemChildrenCtx.get(childItem) ?? ctx
            }
          }))
        }
      }

      const parts = []

      for (const el of Array.from(doc.documentElement.childNodes)) {
        parts.push(el.toString())
      }

      return parts.join('')
    }
  }
}

function createTextRegistry () {
  const data = []
  const valueToIndex = new Map()

  return {
    add (value) {
      let idx = valueToIndex.get(value)

      if (idx == null) {
        idx = data.length
        data.push(value)
        valueToIndex.set(value, idx)
      }

      return idx
    },
    unpack () {
      return data
    }
  }
}

function walkElements (_els, onElement) {
  const pending = [..._els].map((el) => ({ parentEl: null, el }))

  const activeOnFinishCollection = []

  while (pending.length > 0) {
    const { parentEl, el } = pending.shift()

    const childEls = Array.from(el.childNodes ?? []).filter((node) => {
      // we only care about element, text and comment nodes
      return node.nodeType === 1 || node.nodeType === 3 || node.nodeType === 8
    })

    let listenToFinishCb

    if (onElement) {
      listenToFinishCb = onElement(el, parentEl)
    }

    if (listenToFinishCb) {
      activeOnFinishCollection.push({
        lastEl: el,
        cb: listenToFinishCb
      })
    }

    const activeOnFinish = activeOnFinishCollection.at(-1)

    if (childEls.length === 0) {
      if (activeOnFinish?.lastEl === el) {
        activeOnFinishCollection.pop()
        activeOnFinish.cb()
      }
      continue
    }

    if (activeOnFinish?.lastEl === el) {
      activeOnFinish.lastEl = childEls.at(-1)
    }

    pending.unshift(...childEls.map((childEl) => ({ parentEl: el, el: childEl })))
  }
}

function processElement (elementName, element, textRegistry) {
  const elementMetadata = {}

  elementMetadata.name = textRegistry.add(elementName)

  if (elementName === '#text' || elementName === '#comment') {
    elementMetadata.value = element.nodeValue
  }

  const attributesList = Array.from(element.attributes ?? [])

  for (const attr of attributesList) {
    if (elementMetadata.attributes == null) {
      elementMetadata.attributes = new Map()
    }

    const attrNameIndex = textRegistry.add(attr.name)
    const attrValueIndex = textRegistry.add(attr.value)

    elementMetadata.attributes.set(attrNameIndex, attrValueIndex)
  }

  return elementMetadata
}

function getItemFromRegistry (itemsRegistry, textRegistry, targetIdx) {
  const baseItem = itemsRegistry[targetIdx]

  if (baseItem == null) {
    throw new Error(`No base item for ${targetIdx} found`)
  }

  const newItem = structuredClone(baseItem)

  newItem.name = textRegistry[newItem.name]

  if (newItem.attributes != null) {
    const newAttributes = new Map()

    for (const [_attrName, _attrValue] of newItem.attributes) {
      let attrName = _attrName
      let attrValue = _attrValue

      const attrResult = [textRegistry[attrName], textRegistry[attrValue]]

      if (attrResult != null) {
        [attrName, attrValue] = attrResult
      }

      if (attrName == null || attrValue == null) {
        throw new Error(`Base item has invalid attribute name or value for "${attrName}"`)
      }

      newAttributes.set(attrName, attrValue)
    }

    newItem.attributes = newAttributes
  }

  return newItem
}
