const { DOMParser } = require('@xmldom/xmldom')

function assertOk (valid, message) {
  if (!valid) {
    throw new Error(message)
  }
}

function renderDataItems (doc, dataItems, meta, outputFullDocument = true) {
  const domParser = new DOMParser()

  for (const dataItem of dataItems) {
    const pending = []

    let newItem

    if (meta?.prepareItem != null) {
      newItem = meta.prepareItem(dataItem)

      if (newItem == null) {
        throw new Error('prepareItem should return an item object')
      }
    } else {
      newItem = dataItem
    }

    pending.push({
      containerEl: doc.documentElement,
      type: newItem.type,
      item: newItem
    })

    while (pending.length > 0) {
      const { containerEl, type, parentItem, item } = pending.shift()
      let itemType = type

      if (itemType == null) {
        if (meta?.getDefaultItemType) {
          itemType = meta.getDefaultItemType(parentItem)
        }
      }

      if (itemType == null) {
        throw new Error('Data item .type is not defined')
      }

      let el

      if (itemType === '#raw') {
        const tmpDoc = domParser.parseFromString(`<fragment>${item.value}</fragment>`)

        for (const childNode of Array.from(tmpDoc.documentElement.childNodes)) {
          containerEl.appendChild(doc.importNode(childNode, true))
        }

        continue
      }

      if (itemType === '#text') {
        el = doc.createTextNode(item.value)
      } else if (itemType === '#comment') {
        el = doc.createComment(item.value)
      } else {
        el = doc.createElement(itemType)
      }

      const attributeListsToProcess = []

      if (item.attributes != null) {
        attributeListsToProcess.push({
          origin: 'attributes',
          list: item.attributes
        })
      }

      if (item.customAttributes != null) {
        attributeListsToProcess.push({
          origin: 'customAttributes',
          list: item.customAttributes
        })
      }

      for (const { origin, list } of attributeListsToProcess) {
        for (const [_attrName, _attrValue] of list) {
          let attrName = _attrName
          let attrValue = _attrValue

          if (meta?.processAttribute != null) {
            const attrResult = meta.processAttribute(origin, itemType, attrName, attrValue)

            if (attrResult != null) {
              [attrName, attrValue] = attrResult
            }
          }

          if (attrValue == null) {
            el.removeAttribute(attrName)
          } else {
            el.setAttribute(attrName, attrValue)
          }
        }
      }

      containerEl.appendChild(el)

      if (!item.children || item.children.length === 0) {
        continue
      }

      pending.unshift(...item.children.map((childItem) => {
        const childItemType = childItem.type

        if (childItemType == null) {
          throw new Error('Data child item .type is not defined')
        }

        return {
          containerEl: el,
          type: childItemType,
          parentItem: item,
          item: childItem
        }
      }))
    }
  }

  if (!outputFullDocument) {
    const parts = []

    for (const el of Array.from(doc.documentElement.childNodes)) {
      parts.push(el.toString())
    }

    return parts.join('')
  }

  return doc.toString()
}

function getAttributeFromElementTypeAttributes (elementTypeAttributesMap, itemType, attrNameIdx, attrValueIdx) {
  const elementAttributes = elementTypeAttributesMap.get(itemType)

  if (!elementAttributes) {
    throw new Error(`No attributes found for element type "${itemType}"`)
  }

  const attributeStore = elementAttributes[attrNameIdx]
  const attributeName = attributeStore[0]
  const attributeValue = attributeStore[1][attrValueIdx]

  return [attributeName, attributeValue]
}

module.exports.assertOk = assertOk
module.exports.renderDataItems = renderDataItems
module.exports.getAttributeFromElementTypeAttributes = getAttributeFromElementTypeAttributes
