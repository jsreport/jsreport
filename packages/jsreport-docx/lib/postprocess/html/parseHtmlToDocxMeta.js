const cheerio = require('cheerio')
const { BLOCK_ELEMENTS, INLINE_ELEMENTS, SUPPORTED_ELEMENTS } = require('./supportedElements')

const NODE_TYPES = {
  DOCUMENT: 9,
  ELEMENT: 1,
  TEXT: 3
}

module.exports = function parseHtmlToDocxMeta (html, mode) {
  if (mode !== 'block' && mode !== 'inline') {
    throw new Error(`Invalid parsing mode "${mode}"`)
  }

  const $ = cheerio.load(html, null, false)
  const documentNode = $.root()[0]

  return parseHtmlDocumentToMeta($, documentNode, mode)
}

function parseHtmlDocumentToMeta ($, documentNode, mode) {
  const result = []
  const pending = [{ item: documentNode, collection: result }]
  let documentEvaluated = false

  while (pending.length > 0) {
    const { parent, collection, data: inheritedData, item: currentNode } = pending.shift()
    const nodeType = currentNode.nodeType
    const data = Object.assign({}, inheritedData)
    let newItem

    // skip empty nodes
    if (
      (nodeType === NODE_TYPES.DOCUMENT || nodeType === NODE_TYPES.ELEMENT) &&
      currentNode.childNodes.length === 0
    ) {
      continue
    }

    if (
      nodeType === NODE_TYPES.TEXT ||
      // unsupported element, fallback to simple text
      (nodeType === NODE_TYPES.ELEMENT && !SUPPORTED_ELEMENTS.includes(currentNode.tagName))
    ) {
      const getTextInNode = (n) => n.nodeType === NODE_TYPES.TEXT ? n.nodeValue : $(n).text()

      if (mode === 'inline') {
        newItem = createText(getTextInNode(currentNode), data)
        collection.push(newItem)
      } else {
        if (!parent) {
          newItem = createParagraph()
          collection.push(newItem)
          pending.unshift({ item: currentNode, parent: newItem, collection, data })
        } else {
          newItem = createText(getTextInNode(currentNode), data)

          if (data.parentBlockElement != null) {
            applyTitleIfNeeded(parent, data.parentBlockElement)
          }
        }
      }
    } else if (
      (nodeType === NODE_TYPES.DOCUMENT && !documentEvaluated) ||
      nodeType === NODE_TYPES.ELEMENT
    ) {
      let newParent

      if (nodeType === NODE_TYPES.DOCUMENT) {
        documentEvaluated = true
      }

      if (INLINE_ELEMENTS.includes(currentNode.tagName)) {
        if (isBoldElement(currentNode)) {
          data.bold = true
        }

        if (isItalicElement(currentNode)) {
          data.italic = true
        }

        if (isUnderlineElement(currentNode)) {
          data.underline = true
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
      let prevChildNode

      if (mode === 'inline') {
        targetCollection = []
        collection.push(targetCollection)
      }

      for (const [cIdx, childNode] of currentNode.childNodes.entries()) {
        const pendingItem = {
          item: childNode,
          data
        }

        if (isBlockElement(currentNode)) {
          pendingItem.data.parentBlockElement = currentNode
        }

        if (
          (mode === 'block') &&
          ((
            prevChildNode != null &&
            isBlockElement(prevChildNode)
          ) ||
          (
            isBlockElement(childNode) &&
            (newParent.children.length > 0 || cIdx !== 0)
          ))
        ) {
          newParent = createParagraph()
          targetCollection = [newParent]
          collection.push(targetCollection)
        }

        if (mode === 'block') {
          pendingItem.parent = newParent
        }

        pendingItem.collection = targetCollection

        pendingItemsInCurrent.push(pendingItem)
        prevChildNode = childNode
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

function createText (text, data) {
  const textItem = {
    type: 'text',
    value: text != null ? text : ''
  }

  if (data.bold === true) {
    textItem.bold = data.bold
  }

  if (data.italic === true) {
    textItem.italic = data.italic
  }

  if (data.underline === true) {
    textItem.underline = data.underline
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

function applyTitleIfNeeded (parentMeta, node) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  if (
    [
      'h1', 'h2', 'h3',
      'h4', 'h5', 'h6'
    ].includes(node.tagName) === false
  ) {
    return
  }

  const headingRegexp = /^h([1-6])$/
  const match = node.tagName.match(headingRegexp)

  if (match == null) {
    return
  }

  parentMeta.title = match[1]
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
