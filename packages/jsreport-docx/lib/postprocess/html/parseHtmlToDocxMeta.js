const cheerio = require('cheerio')

const NODE_TYPES = {
  ELEMENT: 1,
  TEXT: 3
}

const BLOCK_ELEMENTS = ['p', 'div']
const INLINE_ELEMENTS = ['span']
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
    const { parent, item: currentNode, collection } = pending.shift()
    const nodeType = currentNode.nodeType
    let meta

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
        meta = createText(getTextInNode(currentNode))
        collection.push(meta)
      } else {
        if (!parent) {
          meta = createParagraph()
          collection.push(meta)
          pending.unshift({ item: currentNode, parent: meta, collection })
        } else {
          meta = createText(getTextInNode(currentNode))
        }
      }
    } else if (nodeType === NODE_TYPES.ELEMENT) {
      let newParent

      if (INLINE_ELEMENTS.includes(currentNode.tagName)) {
        if (mode === 'block') {
          if (!parent) {
            meta = createParagraph()
            collection.push(meta)
            newParent = meta
          } else {
            newParent = parent
          }
        }
      } else if (mode === 'block') {
        if (!parent) {
          meta = createParagraph()
          collection.push(meta)
          newParent = meta
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
          collection: targetCollection
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
            collection: targetCollection
          })

          prevChildNode = childNode
        }
      }

      if (pendingItemsInCurrent.length > 0) {
        pending.unshift(...pendingItemsInCurrent)
      }
    }

    if (meta == null) {
      continue
    }

    if (parent != null) {
      parent.children.push(meta)
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

function createText (text) {
  return {
    type: 'text',
    value: text != null ? text : ''
  }
}

function isBlockElement (node) {
  return (
    node.nodeType === NODE_TYPES.ELEMENT &&
    BLOCK_ELEMENTS.includes(node.tagName)
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
