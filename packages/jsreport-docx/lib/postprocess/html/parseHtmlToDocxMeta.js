const cheerio = require('cheerio')
const { customAlphabet } = require('nanoid')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
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
    let childNodes

    if (
      nodeType === NODE_TYPES.TEXT ||
      // unsupported element, fallback to simple text
      (nodeType === NODE_TYPES.ELEMENT && !SUPPORTED_ELEMENTS.includes(currentNode.tagName))
    ) {
      const getTextInNode = (n) => n.nodeType === NODE_TYPES.TEXT ? n.nodeValue : $(n).text()

      newItem = createText(getTextInNode(currentNode), data)

      if (mode === 'block') {
        applyTitleIfNeeded(parent, data)
        applyListIfNeeded(parent, data)
      }
    } else if (
      (nodeType === NODE_TYPES.DOCUMENT && !documentEvaluated) ||
      nodeType === NODE_TYPES.ELEMENT
    ) {
      if (nodeType === NODE_TYPES.DOCUMENT) {
        documentEvaluated = true
      }

      if (INLINE_ELEMENTS.includes(currentNode.tagName)) {
        applyBoldDataIfNeeded(data, currentNode)
        applyItalicDataIfNeeded(data, currentNode)
        applyUnderlineDataIfNeeded(data, currentNode)
        applySubscriptDataIfNeeded(data, currentNode)
        applyStrikeDataIfNeeded(data, currentNode)
        applySuperscriptDataIfNeeded(data, currentNode)

        if (currentNode.tagName === 'br') {
          newItem = createLineBreak()
        }
      } else {
        if (mode === 'block') {
          applyListDataIfNeeded(data, currentNode)
        }
      }

      childNodes = [...currentNode.childNodes]
    }

    if (newItem != null) {
      if (mode === 'inline') {
        collection.push(newItem)
      } else {
        if (parent != null) {
          parent.children.push(newItem)
        }
      }
    }

    if (
      childNodes == null ||
      childNodes.length === 0
    ) {
      continue
    }

    const pendingItemsInCurrent = []
    let targetCollection = collection
    let prevChildNode
    let newParent

    if (mode === 'block' && nodeType !== NODE_TYPES.DOCUMENT) {
      newParent = parent
    }

    if (mode === 'inline') {
      targetCollection = []
      collection.push(targetCollection)
    }

    if (isBlockElement(currentNode)) {
      data.parentBlockElement = currentNode
    }

    data.parentElement = currentNode

    for (const [cIdx, childNode] of childNodes.entries()) {
      const pendingItem = {
        item: childNode,
        data
      }

      if (
        (mode === 'block') &&
        ((
          prevChildNode != null &&
          isBlockElement(prevChildNode)
        ) ||
        (
          isBlockElement(childNode) &&
          newParent != null &&
          (newParent.children.length > 0 || cIdx !== 0)
        ) ||
        (
          nodeType === NODE_TYPES.DOCUMENT &&
          cIdx === 0
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

  if (data.subscript === true) {
    textItem.subscript = data.subscript
  }

  if (data.strike === true) {
    textItem.strike = data.strike
  }

  if (data.superscript === true) {
    textItem.superscript = data.superscript
  }

  return textItem
}

function createLineBreak () {
  return {
    type: 'lineBreak'
  }
}

function applyBoldDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const isBold = node.tagName === 'b' || node.tagName === 'strong'

  if (!isBold) {
    return
  }

  data.bold = true
}

function applyItalicDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const isItalic = node.tagName === 'i' || node.tagName === 'em'

  if (!isItalic) {
    return
  }

  data.italic = true
}

function applyUnderlineDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const isUnderline = node.tagName === 'u' || node.tagName === 'ins'

  if (!isUnderline) {
    return
  }

  data.underline = true
}

function applySubscriptDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const isSubscript = node.tagName === 'sub' || node.tagName === 'small'

  if (!isSubscript) {
    return
  }

  data.subscript = true
}

function applyStrikeDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const isStrike = node.tagName === 's' || node.tagName === 'del'

  if (!isStrike) {
    return
  }

  data.strike = true
}

function applySuperscriptDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const isSuperscript = node.tagName === 'sup'

  if (!isSuperscript) {
    return
  }

  data.superscript = true
}

function applyListDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  if (
    node.tagName === 'ul' ||
    node.tagName === 'ol'
  ) {
    data.listContainerId = `list_${generateRandomId()}`
  } else if (node.tagName === 'li') {
    if (
      data.parentElement?.tagName !== 'ul' &&
      data.parentElement?.tagName !== 'ol'
    ) {
      return
    }

    if (data.listContainerId == null) {
      return
    }

    const isNested = data.list != null

    if (isNested) {
      if (data.parentElement?.parentNode?.tagName !== 'li') {
        return
      }
    }

    data.list = {
      id: data.listContainerId,
      type: data.parentElement.tagName,
      level: isNested ? data.list.level + 1 : 1
    }
  }
}

function isBlockElement (node) {
  return (
    node.nodeType === NODE_TYPES.ELEMENT &&
    BLOCK_ELEMENTS.includes(node.tagName)
  )
}

function applyTitleIfNeeded (parentMeta, data) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (data.parentBlockElement == null) {
    return
  }

  const node = data.parentBlockElement

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

function applyListIfNeeded (parentMeta, data) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (data.parentBlockElement == null) {
    return
  }

  const node = data.parentBlockElement

  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  if (node.tagName !== 'li' || data.list == null) {
    return
  }

  parentMeta.list = data.list
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
