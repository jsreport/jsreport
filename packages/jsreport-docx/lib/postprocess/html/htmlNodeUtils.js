const { BLOCK_ELEMENTS, INLINE_ELEMENTS, META_ELEMENTS, SUPPORTED_ELEMENTS } = require('./supportedElements')

const HTML_NODE_TYPES = {
  DOCUMENT: 9,
  ELEMENT: 1,
  TEXT: 3
}

function isTextElement (node) {
  if (node == null) {
    return false
  }

  return node.nodeType === HTML_NODE_TYPES.TEXT
}

function isInlineElement (node) {
  if (node == null) {
    return false
  }

  return (
    node.nodeType === HTML_NODE_TYPES.ELEMENT &&
    INLINE_ELEMENTS.includes(node.tagName)
  )
}

function isBlockElement (node) {
  if (node == null) {
    return false
  }

  return (
    node.nodeType === HTML_NODE_TYPES.ELEMENT &&
    BLOCK_ELEMENTS.includes(node.tagName)
  )
}

function isUnsupportedElement (node) {
  return node.nodeType === HTML_NODE_TYPES.ELEMENT && !SUPPORTED_ELEMENTS.includes(node.tagName)
}

function isMetaElement (node) {
  return node.nodeType === HTML_NODE_TYPES.ELEMENT && META_ELEMENTS.includes(node.tagName)
}

function isTableItemElement (node) {
  if (node == null) {
    return false
  }

  return (
    node.nodeType === HTML_NODE_TYPES.ELEMENT &&
    ['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'].includes(node.tagName)
  )
}

function getFirstChildNodeNotIgnorable (node) {
  let childNode = node?.firstChild

  while (childNode != null) {
    if (
      childNode.nodeType === HTML_NODE_TYPES.ELEMENT ||
      childNode.nodeType === HTML_NODE_TYPES.TEXT
    ) {
      return childNode
    }

    childNode = childNode.nextSibling
  }

  return null
}

function getNextSiblingNodeNotIgnorable (node) {
  let siblingNode = node.nextSibling

  while (siblingNode != null) {
    if (
      siblingNode.nodeType === HTML_NODE_TYPES.ELEMENT ||
      siblingNode.nodeType === HTML_NODE_TYPES.TEXT
    ) {
      return siblingNode
    }

    siblingNode = siblingNode.nextSibling
  }

  return null
}

function getParentElementThatMatch (node, checkFn) {
  let currentNode = node

  do {
    const result = checkFn(currentNode)

    if (result) {
      break
    }

    currentNode = currentNode.parentNode
  } while (currentNode != null)

  return currentNode
}

// normalization implies ignoring nodes that we don't need and normalizing
// spaces, line breaks, tabs according to like a browser would do
// https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace
function normalizeChildNodes ($, mode, data, childNodes) {
  let newChildNodes = []

  if (childNodes == null) {
    return newChildNodes
  }

  for (const childNode of childNodes) {
    if (childNode.nodeType === HTML_NODE_TYPES.TEXT) {
      newChildNodes.push(childNode)

      if (data.preformatted !== true) {
        // replace all spaces, tabs before and after a line break to single line break
        childNode.nodeValue = childNode.nodeValue.replace(/([ \t])*\r?\n([ \t])*/g, '\n')
        // replace tabs and line breaks are converted to space
        childNode.nodeValue = childNode.nodeValue.replace(/[\t\n]/g, ' ')
        // replace multiple spaces to single space
        childNode.nodeValue = childNode.nodeValue.replace(/[ ]+ /g, ' ')

        let nextSiblingNode

        // if the text ends in space we check if the next sibling is inline and start with space
        // if it is true then we ignore such space
        if (/ $/.test(childNode.nodeValue)) {
          const result = getNextSiblingNodeNotIgnorable(childNode)
          let isValidInlineSibling = false

          if (result != null && result.nodeType === HTML_NODE_TYPES.ELEMENT) {
            isValidInlineSibling = mode === 'block' ? isInlineElement(result) : true
          }

          if (isValidInlineSibling) {
            nextSiblingNode = result
          }
        }

        const nextSiblingNodeFirstChild = getFirstChildNodeNotIgnorable(nextSiblingNode)

        if (nextSiblingNodeFirstChild?.nodeType === HTML_NODE_TYPES.TEXT) {
          nextSiblingNode.childNodes[0].nodeValue = nextSiblingNode.childNodes[0].nodeValue.replace(/^[ ]+([^ ]+)/, '$1')
        }
      }
    } else if (childNode.nodeType === HTML_NODE_TYPES.ELEMENT) {
      newChildNodes.push(childNode)
    } else {
      $(childNode).remove()
    }
  }

  if (data.preformatted !== true) {
    // now we check if first and last child are space, if it is then ignore it
    const firstChildNode = newChildNodes[0]
    const lastChildNode = newChildNodes.at(-1)
    const middleNodes = newChildNodes.length > 2 ? newChildNodes.slice(1, -1) : []

    if (firstChildNode?.nodeType === HTML_NODE_TYPES.TEXT) {
      let normalizeStartingSpace = true

      // if the parent is not block element and the previous sibling of parent is text or element then don't normalize
      if (
        firstChildNode?.parentNode?.nodeType === HTML_NODE_TYPES.ELEMENT &&
        !(mode === 'block' ? isBlockElement(firstChildNode?.parentNode) : false)
      ) {
        const isTextOrElement = (
          isTextElement(firstChildNode.parentNode.previousSibling) ||
          firstChildNode.parentNode.previousSibling?.nodeType === HTML_NODE_TYPES.ELEMENT
        )

        if (isTextOrElement) {
          normalizeStartingSpace = false
        }
      }

      if (normalizeStartingSpace) {
        firstChildNode.nodeValue = firstChildNode.nodeValue.replace(/^[ ]+([^ ]*)/, '$1')
      }

      // the next sibling here should be already normalized (so it will be either text or element)
      const nextSiblingNode = firstChildNode.nextSibling
      let normalizeExtraSpace = false

      if (nextSiblingNode != null && nextSiblingNode.nodeType === HTML_NODE_TYPES.ELEMENT) {
        normalizeExtraSpace = mode === 'block' ? isBlockElement(nextSiblingNode) : false
      }

      // if the next sibling of this text node is not inline we normalize ending space too
      if (normalizeExtraSpace) {
        firstChildNode.nodeValue = firstChildNode.nodeValue.replace(/([^ ]*)[ ]+$/, '$1')
      }

      if (firstChildNode.nodeValue === '') {
        $(firstChildNode).remove()
        newChildNodes = newChildNodes.slice(1)
      }
    }

    if (lastChildNode?.nodeType === HTML_NODE_TYPES.TEXT) {
      let normalizeEndingSpace = true

      // if the parent is not block element and the next sibling of parent is text or element then don't normalize
      if (
        lastChildNode?.parentNode?.nodeType === HTML_NODE_TYPES.ELEMENT &&
        !(mode === 'block' ? isBlockElement(lastChildNode?.parentNode) : false)
      ) {
        const isTextOrElement = (
          isTextElement(lastChildNode.parentNode.nextSibling) ||
          lastChildNode.parentNode.nextSibling?.nodeType === HTML_NODE_TYPES.ELEMENT
        )

        if (isTextOrElement) {
          normalizeEndingSpace = false
        }
      }

      if (normalizeEndingSpace) {
        lastChildNode.nodeValue = lastChildNode.nodeValue.replace(/([^ ]*)[ ]+$/, '$1')
      }

      // the previous sibling here should be already normalized (so it will be either text or element)
      const previousSiblingNode = lastChildNode.previousSibling
      let normalizeExtraSpace = false

      if (previousSiblingNode != null && previousSiblingNode.nodeType === HTML_NODE_TYPES.ELEMENT) {
        normalizeExtraSpace = mode === 'block' ? isBlockElement(previousSiblingNode) : false
      }

      // if the previous sibling of this text node is not inline we normalize starting space too
      if (normalizeExtraSpace) {
        lastChildNode.nodeValue = lastChildNode.nodeValue.replace(/^[ ]+([^ ]*)/, '$1')
      }

      if (lastChildNode.nodeValue === '') {
        $(lastChildNode).remove()
        newChildNodes = newChildNodes.slice(0, -1)
      }
    }

    // if the nodes in the middle are text then we treat as block, which means that we
    // remove space at the start and end of the text, and if it produces empty text then
    // we remove it
    for (const childNode of middleNodes) {
      if (childNode.nodeType !== HTML_NODE_TYPES.TEXT) {
        continue
      }

      // if text contains at least one character that is not white space then ignore
      // the normalization
      if (childNode.nodeValue !== '' && /[^ ]/.test(childNode.nodeValue)) {
        continue
      }

      childNode.nodeValue = childNode.nodeValue.replace(/^[ ]+([^ ]*)/, '$1')
      childNode.nodeValue = childNode.nodeValue.replace(/([^ ]*)[ ]+$/, '$1')

      if (childNode.nodeValue === '') {
        const idx = newChildNodes.indexOf(childNode)
        $(childNode).remove()
        newChildNodes = [...newChildNodes.slice(0, idx), ...newChildNodes.slice(idx + 1)]
      }
    }
  }

  return newChildNodes
}

module.exports.HTML_NODE_TYPES = HTML_NODE_TYPES
module.exports.isTextElement = isTextElement
module.exports.isInlineElement = isInlineElement
module.exports.isBlockElement = isBlockElement
module.exports.isUnsupportedElement = isUnsupportedElement
module.exports.isMetaElement = isMetaElement
module.exports.isTableItemElement = isTableItemElement
module.exports.getFirstChildNodeNotIgnorable = getFirstChildNodeNotIgnorable
module.exports.getNextSiblingNodeNotIgnorable = getNextSiblingNodeNotIgnorable
module.exports.getParentElementThatMatch = getParentElementThatMatch
module.exports.normalizeChildNodes = normalizeChildNodes
