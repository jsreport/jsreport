const cheerio = require('cheerio')
const styleAttr = require('style-attr')
const { customAlphabet } = require('nanoid')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const { BLOCK_ELEMENTS, INLINE_ELEMENTS, SUPPORTED_ELEMENTS } = require('./supportedElements')
const parseCssSides = require('parse-css-sides')
const color = require('tinycolor2')
const { lengthToPt } = require('../../utils')

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
  const elementDataMap = new WeakMap()
  let documentEvaluated = false

  while (pending.length > 0) {
    const { parent, collection, data: inheritedData, item: currentNode } = pending.shift()
    const nodeType = currentNode.nodeType
    const data = Object.assign({}, inheritedData)

    // static properties are only available per element,
    // it won't be inherited for its children, we initialize the object
    // here so other parts just set properties on it
    data.static = {}

    let newItem
    let childNodes

    if (
      nodeType === NODE_TYPES.TEXT ||
      // unsupported element, fallback to simple text
      (nodeType === NODE_TYPES.ELEMENT && !SUPPORTED_ELEMENTS.includes(currentNode.tagName))
    ) {
      const getTextInNode = (n) => n.nodeType === NODE_TYPES.TEXT ? n.nodeValue : $(n).text()

      newItem = []

      const parentBlockElementData = elementDataMap.get(data.parentBlockElement)
      const parentElementData = elementDataMap.get(data.parentElement)

      if (
        parentBlockElementData?.static?.breakPage?.before === true ||
        parentElementData?.static?.breakPage?.before === true
      ) {
        newItem.push(createBreak('page'))
      }

      const normalizeResult = normalizeText(getTextInNode(currentNode), data)

      if (Array.isArray(normalizeResult)) {
        newItem.push(...normalizeResult)
      } else {
        newItem.push(normalizeResult)
      }

      if (
        parentBlockElementData?.static?.breakPage?.after === true ||
        parentElementData?.static?.breakPage?.after === true
      ) {
        newItem.push(createBreak('page'))
      }

      if (mode === 'block') {
        applyTitleIfNeeded(parent, data)
        applyListIfNeeded(parent, data)
        applyBackgroundColorIfNeeded(parent, data)
        applyAlignmentIfNeeded(parent, data)
        applyIndentIfNeeded(parent, data)
        applySpacingIfNeeded(parent, data)
      }
    } else if (
      (nodeType === NODE_TYPES.DOCUMENT && !documentEvaluated) ||
      nodeType === NODE_TYPES.ELEMENT
    ) {
      if (nodeType === NODE_TYPES.DOCUMENT) {
        documentEvaluated = true
      }

      inspectStylesAndApplyDataIfNeeded(data, currentNode)

      if (INLINE_ELEMENTS.includes(currentNode.tagName)) {
        applyBoldDataIfNeeded(data, currentNode)
        applyItalicDataIfNeeded(data, currentNode)
        applyUnderlineDataIfNeeded(data, currentNode)
        applySubscriptDataIfNeeded(data, currentNode)
        applyStrikeDataIfNeeded(data, currentNode)
        applySuperscriptDataIfNeeded(data, currentNode)
        applyCodeDataIfNeeded(data, currentNode)
        applyLinkDataIfNeeded(data, currentNode)

        if (currentNode.tagName === 'br') {
          newItem = createBreak()
        }
      } else {
        if (mode === 'block') {
          applyListDataIfNeeded(data, currentNode)
        }

        applyPreformattedDataIfNeeded(data, currentNode)
      }

      childNodes = [...currentNode.childNodes]
    }

    if (newItem != null) {
      const toInsert = Array.isArray(newItem) ? newItem : [newItem]

      if (mode === 'inline') {
        collection.push(...toInsert)
      } else {
        if (parent != null) {
          parent.children.push(...toInsert)
        }
      }
    }

    elementDataMap.set(currentNode, data)

    childNodes = normalizeChildNodes($, mode, data, childNodes)

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

    const childData = Object.assign({}, data)

    // remove static properties so it won't get inherited for children
    delete childData.static

    if (isBlockElement(currentNode)) {
      childData.parentBlockElement = currentNode
    }

    childData.parentElement = currentNode

    for (const [cIdx, childNode] of childNodes.entries()) {
      const pendingItem = {
        item: childNode,
        data: childData
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

// normalization implies ignoring nodes that we don't need and normalizing
// spaces, line breaks, tabs according to like a browser would do
// https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace
function normalizeChildNodes ($, mode, data, childNodes) {
  let newChildNodes = []

  if (childNodes == null) {
    return newChildNodes
  }

  for (const childNode of childNodes) {
    if (childNode.nodeType === NODE_TYPES.TEXT) {
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

          if (result != null && result.nodeType === NODE_TYPES.ELEMENT) {
            isValidInlineSibling = mode === 'block' ? isInlineElement(result) : true
          }

          if (isValidInlineSibling) {
            nextSiblingNode = result
          }
        }

        const nextSiblingNodeFirstChild = getFirstChildNodeNotIgnorable(nextSiblingNode)

        if (nextSiblingNodeFirstChild?.nodeType === NODE_TYPES.TEXT) {
          nextSiblingNode.childNodes[0].nodeValue = nextSiblingNode.childNodes[0].nodeValue.replace(/^[ ]+([^ ]+)/, '$1')
        }
      }
    } else if (childNode.nodeType === NODE_TYPES.ELEMENT) {
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

    if (firstChildNode?.nodeType === NODE_TYPES.TEXT) {
      firstChildNode.nodeValue = firstChildNode.nodeValue.replace(/^[ ]+([^ ]*)/, '$1')

      // the next sibling here should be already normalized (so it will be either text or element)
      const nextSiblingNode = firstChildNode.nextSibling
      let normalizeExtraSpace = false

      if (nextSiblingNode != null && nextSiblingNode.nodeType === NODE_TYPES.ELEMENT) {
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

    if (lastChildNode?.nodeType === NODE_TYPES.TEXT) {
      lastChildNode.nodeValue = lastChildNode.nodeValue.replace(/([^ ]*)[ ]+$/, '$1')

      // the previous sibling here should be already normalized (so it will be either text or element)
      const previousSiblingNode = lastChildNode.previousSibling
      let normalizeExtraSpace = false

      if (previousSiblingNode != null && previousSiblingNode.nodeType === NODE_TYPES.ELEMENT) {
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
      if (childNode.nodeType !== NODE_TYPES.TEXT) {
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

function getFirstChildNodeNotIgnorable (node) {
  let childNode = node?.firstChild

  while (childNode != null) {
    if (
      childNode.nodeType === NODE_TYPES.ELEMENT ||
      childNode.nodeType === NODE_TYPES.TEXT
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
      siblingNode.nodeType === NODE_TYPES.ELEMENT ||
      siblingNode.nodeType === NODE_TYPES.TEXT
    ) {
      return siblingNode
    }

    siblingNode = siblingNode.nextSibling
  }

  return null
}

function normalizeText (text, data) {
  if (data.preformatted === true) {
    const newItems = []
    let currentText = text

    do {
      const match = currentText.match(/(\r?\n)/)

      if (match == null) {
        newItems.push(createText(currentText, data))
        currentText = ''
      } else {
        const textBeforeLineBreak = currentText.slice(0, match.index)
        const rest = currentText.slice(match.index + 1)

        if (textBeforeLineBreak !== '') {
          newItems.push(createText(textBeforeLineBreak, data))
        }

        newItems.push(createBreak())

        currentText = rest
      }
    } while (currentText !== '')

    return newItems
  }

  return createText(text, data)
}

function createText (text, data) {
  const textItem = {
    type: 'text',
    value: text != null ? text : ''
  }

  const boolProperties = [
    'bold', 'italic', 'underline', 'subscript', 'strike', 'superscript',
    'preformatted', 'code'
  ]

  const notNullProperties = [
    'link', 'fontSize', 'fontFamily', 'color', 'backgroundColor'
  ]

  for (const prop of boolProperties) {
    if (data[prop] === true) {
      textItem[prop] = data[prop]
    }
  }

  for (const prop of notNullProperties) {
    if (data[prop] != null) {
      textItem[prop] = data[prop]
    }
  }

  return textItem
}

function createBreak (target = 'line') {
  if (target !== 'line' && target !== 'page') {
    throw new Error(`Invalid break target "${target}"`)
  }

  return {
    type: 'break',
    target
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

function applyCodeDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const isCode = node.tagName === 'code'

  if (!isCode) {
    return
  }

  data.code = true
}

function applyLinkDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const isLink = node.tagName === 'a'

  if (!isLink) {
    return
  }

  data.link = {
    target: ''
  }

  if (node.attribs?.href != null && node.attribs?.href !== '') {
    data.link.target = node.attribs.href
  }
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

function applyPreformattedDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  if (node.tagName !== 'pre') {
    return
  }

  data.preformatted = true
}

function inspectStylesAndApplyDataIfNeeded (data, node) {
  if (node.nodeType !== NODE_TYPES.ELEMENT) {
    return
  }

  const styleVal = node.attribs?.style

  if (styleVal == null || styleVal === '') {
    return
  }

  const styles = styleAttr.parse(styleVal)

  if (Object.keys(styles).length === 1 && styles[''] != null) {
    return
  }

  if (styles['font-size'] != null) {
    const parsedFontSize = lengthToPt(styles['font-size'])

    if (parsedFontSize != null) {
      data.fontSize = parsedFontSize
    }
  }

  if (styles['font-family'] != null) {
    const fontFamily = styles['font-family'].replace(/^"/, '').replace(/"$/, '')
    data.fontFamily = fontFamily
  }

  if (styles.color != null) {
    const parsedColor = color(styles.color)

    if (parsedColor.isValid()) {
      data.color = parsedColor.toHexString().toUpperCase()
    }
  }

  if (styles['background-color'] != null) {
    const parsedBackgroundColor = color(styles['background-color'])

    if (parsedBackgroundColor.isValid()) {
      data.backgroundColor = parsedBackgroundColor.toHexString().toUpperCase()
    }
  }

  if (styles['text-decoration'] != null) {
    const textDecoration = styles['text-decoration']

    if (textDecoration === 'underline') {
      data.underline = true
    } else if (textDecoration === 'line-through') {
      data.strike = true
    }
  }

  if (styles['text-align'] != null) {
    const textAlign = styles['text-align']

    data.alignment = data.alignment || {}

    if (textAlign === 'left') {
      data.alignment.horizontal = 'left'
    } else if (textAlign === 'center') {
      data.alignment.horizontal = 'center'
    } else if (textAlign === 'right') {
      data.alignment.horizontal = 'right'
    } else if (textAlign === 'justify') {
      data.alignment.horizontal = 'both'
    }
  }

  if (styles.padding != null) {
    const parsedPadding = parseCssSides(styles.padding)

    data.indent = data.indent || {}
    data.spacing = data.spacing || {}

    const parsedPaddingLeft = lengthToPt(parsedPadding.left)

    if (parsedPaddingLeft != null) {
      data.indent.left = parsedPaddingLeft
    }

    const parsedPaddingRight = lengthToPt(parsedPadding.right)

    if (parsedPaddingRight != null) {
      data.indent.right = parsedPaddingRight
    }

    const parsedPaddingTop = lengthToPt(parsedPadding.top)

    if (parsedPaddingTop != null) {
      data.spacing.before = parsedPaddingTop
    }

    const parsedPaddingBottom = lengthToPt(parsedPadding.bottom)

    if (parsedPaddingBottom != null) {
      data.spacing.after = parsedPaddingBottom
    }
  }

  if (styles['padding-left'] != null) {
    const parsedPaddingLeft = lengthToPt(styles['padding-left'])

    if (parsedPaddingLeft != null) {
      data.indent = data.indent || {}
      data.indent.left = parsedPaddingLeft
    }
  }

  if (styles['padding-right'] != null) {
    const parsedPaddingRight = lengthToPt(styles['padding-right'])

    if (parsedPaddingRight != null) {
      data.indent = data.indent || {}
      data.indent.right = parsedPaddingRight
    }
  }

  if (styles['padding-top'] != null) {
    const parsedPaddingTop = lengthToPt(styles['padding-top'])

    if (parsedPaddingTop != null) {
      data.spacing = data.spacing || {}
      data.spacing.before = parsedPaddingTop
    }
  }

  if (styles['padding-bottom'] != null) {
    const parsedPaddingBottom = lengthToPt(styles['padding-bottom'])

    if (parsedPaddingBottom != null) {
      data.spacing = data.spacing || {}
      data.spacing.after = parsedPaddingBottom
    }
  }

  if (styles.margin != null) {
    const parsedMargin = parseCssSides(styles.margin)

    data.indent = data.indent || {}
    data.spacing = data.spacing || {}

    const parsedMarginLeft = lengthToPt(parsedMargin.left)

    if (parsedMarginLeft != null) {
      data.indent.left = parsedMarginLeft
    }

    const parsedMarginRight = lengthToPt(parsedMargin.right)

    if (parsedMarginRight != null) {
      data.indent.right = parsedMarginRight
    }

    const parsedMarginTop = lengthToPt(parsedMargin.top)

    if (parsedMarginTop != null) {
      data.spacing.before = parsedMarginTop
    }

    const parsedMarginBottom = lengthToPt(parsedMargin.bottom)

    if (parsedMarginBottom != null) {
      data.spacing.after = parsedMarginBottom
    }
  }

  if (styles['margin-left'] != null) {
    const parsedMarginLeft = lengthToPt(styles['margin-left'])

    if (parsedMarginLeft != null) {
      data.indent = data.indent || {}
      data.indent.left = parsedMarginLeft
    }
  }

  if (styles['margin-right'] != null) {
    const parsedMarginRight = lengthToPt(styles['margin-right'])

    if (parsedMarginRight != null) {
      data.indent = data.indent || {}
      data.indent.right = parsedMarginRight
    }
  }

  if (styles['margin-top'] != null) {
    const parsedMarginTop = lengthToPt(styles['margin-top'])

    if (parsedMarginTop != null) {
      data.spacing = data.spacing || {}
      data.spacing.before = parsedMarginTop
    }
  }

  if (styles['margin-bottom'] != null) {
    const parsedMarginBottom = lengthToPt(styles['margin-bottom'])

    if (parsedMarginBottom != null) {
      data.spacing = data.spacing || {}
      data.spacing.after = parsedMarginBottom
    }
  }

  if (styles['break-before'] != null) {
    if (styles['break-before'] === 'page') {
      data.static.breakPage = data.static.breakPage || {}
      data.static.breakPage.before = true
    }
  }

  if (styles['break-after'] != null) {
    if (styles['break-after'] === 'page') {
      data.static.breakPage = data.static.breakPage || {}
      data.static.breakPage.after = true
    }
  }
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

function applyBackgroundColorIfNeeded (parentMeta, data) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (data.backgroundColor == null) {
    return
  }

  parentMeta.backgroundColor = data.backgroundColor
}

function applyAlignmentIfNeeded (parentMeta, data) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (data.alignment == null) {
    return
  }

  parentMeta.alignment = data.alignment
}

function applyIndentIfNeeded (parentMeta, data) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (data.indent == null) {
    return
  }

  parentMeta.indent = data.indent
}

function applySpacingIfNeeded (parentMeta, data) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (data.spacing == null) {
    return
  }

  parentMeta.spacing = data.spacing
}

function isInlineElement (node) {
  if (node == null) {
    return false
  }

  return (
    node.nodeType === NODE_TYPES.ELEMENT &&
    INLINE_ELEMENTS.includes(node.tagName)
  )
}

function isBlockElement (node) {
  if (node == null) {
    return false
  }

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
