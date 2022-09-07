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

          applyTitleIfNeeded(parent, data)
          applyListIfNeeded(parent, data)
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
        applyBoldDataIfNeeded(data, currentNode)
        applyItalicDataIfNeeded(data, currentNode)
        applyUnderlineDataIfNeeded(data, currentNode)

        if (mode === 'block') {
          if (!parent) {
            newItem = createParagraph()
            collection.push(newItem)
            newParent = newItem
          } else {
            newParent = parent
          }
        }
      } else {
        applyListDataIfNeeded(data, currentNode)

        if (mode === 'block' && nodeType !== NODE_TYPES.DOCUMENT) {
          if (!parent) {
            newItem = createParagraph()
            collection.push(newItem)
            newParent = newItem
          } else {
            newParent = parent
          }
        }
      }

      const pendingItemsInCurrent = []
      let targetCollection = collection
      let prevChildNode

      if (mode === 'inline') {
        targetCollection = []
        collection.push(targetCollection)
      }

      if (isBlockElement(currentNode)) {
        data.parentBlockElement = currentNode
      }

      data.parentElement = currentNode

      for (const [cIdx, childNode] of currentNode.childNodes.entries()) {
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

  const isUnderline = node.tagName === 'u'

  if (!isUnderline) {
    return
  }

  data.underline = true
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
