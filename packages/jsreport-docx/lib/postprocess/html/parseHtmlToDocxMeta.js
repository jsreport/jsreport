const cheerio = require('cheerio')

const NODE_TYPES = {
  ELEMENT: 1,
  TEXT: 3
}

const BLOCK_ELEMENTS = ['p', 'div']
const INLINE_ELEMENTS = ['span', 'b', 'strong', 'i', 'em', 'u']
const SUPPORTED_ELEMENTS = [...BLOCK_ELEMENTS, ...INLINE_ELEMENTS]

module.exports = function parseHtmlToDocxMeta (html, mode) {
  if (mode !== 'block' && mode !== 'inline') {
    throw new Error(`Invalid parsing mode "${mode}"`)
  }

  const $ = cheerio.load(html, null, false)
  const targetTopLevelNodes = $.root()[0].childNodes
  const result = []

  for (const topLevelNode of targetTopLevelNodes) {
    const parsedResult = parseHtmlNodeToMeta($, topLevelNode, mode)

    if (parsedResult.length > 0) {
      result.push(...parsedResult)
    }
  }

  return result
}

function parseHtmlNodeToMeta ($, node, mode) {
  const result = []
  const pending = [{ item: node, collection: result }]

  while (pending.length > 0) {
    const { parent, collection, meta = {}, item: currentNode } = pending.shift()
    const nodeType = currentNode.nodeType
    let newItem

    // skip empty nodes
    if (nodeType === NODE_TYPES.ELEMENT && currentNode.childNodes.length === 0) {
      continue
    }

    if (
      nodeType === NODE_TYPES.TEXT ||
      // unsupported element, fallback to simple text
      (nodeType === NODE_TYPES.ELEMENT && !SUPPORTED_ELEMENTS.includes(currentNode.tagName))
    ) {
      const getTextInNode = (n) => n.nodeType === NODE_TYPES.TEXT ? n.nodeValue : $(n).text()

      if (mode === 'inline') {
        newItem = createText(getTextInNode(currentNode), meta)
        collection.push(newItem)
      } else {
        if (!parent) {
          newItem = createParagraph()
          collection.push(newItem)
          pending.unshift({ item: currentNode, parent: newItem, collection, meta })
        } else {
          newItem = createText(getTextInNode(currentNode), meta)
        }
      }
    } else if (nodeType === NODE_TYPES.ELEMENT) {
      let newParent

      if (INLINE_ELEMENTS.includes(currentNode.tagName)) {
        if (isBoldElement(currentNode)) {
          meta.bold = true
        }

        if (isItalicElement(currentNode)) {
          meta.italic = true
        }

        if (isUnderlineElement(currentNode)) {
          meta.underline = true
        }

        if (mode === 'block') {
          if (!parent) {
            newItem = createParagraph()
            collection.push(newItem)
            newParent = newItem
          } else {
            newParent = parent
          }
        }
      } else if (mode === 'block') {
        if (!parent) {
          newItem = createParagraph()
          collection.push(newItem)
          newParent = newItem
        } else {
          newParent = parent
        }
      }

      const pendingItemsInCurrent = []

      let targetCollection = collection

      if (mode === 'inline') {
        targetCollection = []
        collection.push(targetCollection)

        pendingItemsInCurrent.push(...currentNode.childNodes.map((childNode) => ({
          item: childNode,
          collection: targetCollection,
          meta
        })))
      } else {
        let prevChildNode

        for (const [cIdx, childNode] of currentNode.childNodes.entries()) {
          if (
            (
              prevChildNode != null &&
              isBlockElement(prevChildNode)
            ) ||
            (
              isBlockElement(childNode) &&
              (newParent.children.length > 0 || cIdx !== 0)
            )
          ) {
            newParent = createParagraph()
            targetCollection = [newParent]
            collection.push(targetCollection)
          }

          pendingItemsInCurrent.push({
            item: childNode,
            parent: newParent,
            collection: targetCollection,
            meta
          })

          prevChildNode = childNode
        }
      }

      if (pendingItemsInCurrent.length > 0) {
        pending.unshift(...pendingItemsInCurrent)
      }
    }

    if (newItem == null) {
      continue
    }

    if (parent != null) {
      parent.children.push(newItem)
    }
  }

  return normalizeMeta(result)
}

function createParagraph () {
  return {
    type: 'paragraph',
    children: []
  }
}

function createText (text, meta) {
  const textItem = {
    type: 'text',
    value: text != null ? text : ''
  }

  if (meta.bold === true) {
    textItem.bold = meta.bold
  }

  if (meta.italic === true) {
    textItem.italic = meta.italic
  }

  if (meta.underline === true) {
    textItem.underline = meta.underline
  }

  return textItem
}

function isBlockElement (node) {
  return (
    node.nodeType === NODE_TYPES.ELEMENT &&
    BLOCK_ELEMENTS.includes(node.tagName)
  )
}

function isBoldElement (node) {
  return (
    node.nodeType === NODE_TYPES.ELEMENT &&
    (node.tagName === 'b' || node.tagName === 'strong')
  )
}

function isItalicElement (node) {
  return (
    node.nodeType === NODE_TYPES.ELEMENT &&
    (node.tagName === 'i' || node.tagName === 'em')
  )
}

function isUnderlineElement (node) {
  return (
    node.nodeType === NODE_TYPES.ELEMENT &&
    node.tagName === 'u'
  )
}

function normalizeMeta (fullMeta) {
  const normalized = []
  const pending = fullMeta

  while (pending.length > 0) {
    const currentItem = pending.shift()

    if (currentItem == null) {
      continue
    }

    if (Array.isArray(currentItem)) {
      pending.unshift(...currentItem)
    } else {
      if (
        currentItem.children == null ||
        (
          currentItem.children != null &&
          currentItem.children.length > 0
        )
      ) {
        normalized.push(currentItem)
      }
    }
  }

  return normalized
}
