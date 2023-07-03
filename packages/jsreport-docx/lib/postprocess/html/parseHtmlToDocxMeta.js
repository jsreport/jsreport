const cheerio = require('cheerio')
const styleAttr = require('style-attr')
const { customAlphabet } = require('nanoid')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const parseCssSides = require('parse-css-sides')
const color = require('tinycolor2')
const { lengthToPt, getDimension } = require('../../utils')
const transformTableMeta = require('./transformTableMeta')
const { BLOCK_ELEMENTS, INLINE_ELEMENTS, SUPPORTED_ELEMENTS } = require('./supportedElements')

const NODE_TYPES = {
  DOCUMENT: 9,
  ELEMENT: 1,
  TEXT: 3
}

module.exports = function parseHtmlToDocxMeta (html, mode, sectionDetail) {
  if (mode !== 'block' && mode !== 'inline') {
    throw new Error(`Invalid parsing mode "${mode}"`)
  }

  const $ = cheerio.load(html, null, false)
  const documentNode = $.root()[0]

  return parseHtmlDocumentToMeta($, documentNode, mode, sectionDetail)
}

function parseHtmlDocumentToMeta ($, documentNode, mode, sectionDetail) {
  const result = []
  const pending = [{ item: documentNode, collection: result }]
  const elementDataMap = new WeakMap()
  let documentEvaluated = false

  while (pending.length > 0) {
    const { parents = [], collection, data: inheritedData, item: currentNode } = pending.shift()
    const parent = parents.length > 0 ? parents[parents.length - 1] : undefined
    const nodeType = currentNode.nodeType
    const data = Object.assign({}, inheritedData)

    // static properties are only available per element,
    // it won't be inherited for its children, we initialize the object
    // here so other parts just set properties on it
    data.static = {}

    let newItem
    let childNodes

    if (
      isTextElement(currentNode) ||
      // unsupported element, fallback to simple text
      isUnsupportedElement(currentNode)
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
        } else if (
          // only accept image as valid if there is src defined
          currentNode.tagName === 'img' &&
          currentNode.attribs?.src != null &&
          typeof currentNode.attribs?.src === 'string'
        ) {
          // if width comes from style, we just use it, if not parse it from the attribute if present
          if (data.static.width == null && currentNode.attribs?.width) {
            const parsedWidth = parseFloat(currentNode.attribs.width)

            if (parsedWidth != null && !isNaN(parsedWidth)) {
              data.static.width = `${parsedWidth}px`
            }
          }

          if (data.static.height == null && currentNode.attribs?.height) {
            const parsedHeight = parseFloat(currentNode.attribs.height)

            if (parsedHeight != null && !isNaN(parsedHeight)) {
              data.static.height = `${parsedHeight}px`
            }
          }

          if (currentNode.attribs?.alt) {
            data.static.alt = currentNode.attribs.alt
          }

          newItem = createImage(currentNode.attribs.src, data)
        }
      } else {
        if (mode === 'block') {
          applyListDataIfNeeded(data, currentNode)
        }

        applyPreformattedDataIfNeeded(data, currentNode)

        if (currentNode.tagName === 'table') {
          // if width comes from style, we just use it, if not parse it from the attribute if present
          if (data.static.width == null && currentNode.attribs?.width) {
            // when parsing width from attribute, we only accept px, cm and % and default to px for other cases
            const validUnits = ['px', 'cm', '%']

            const parsedWidth = getDimension(currentNode.attribs.width, {
              units: validUnits,
              defaultUnit: 'px'
            })

            if (parsedWidth != null) {
              data.static.width = `${parsedWidth.value}${parsedWidth.unit}`
            }
          }

          // parent in this case for the table element is the table itself
          if (parent != null && data.static.width) {
            parent.width = data.static.width
          }
        } else if (
          currentNode.tagName === 'tr' &&
          (
            ['table', 'thead', 'tbody', 'tfoot'].includes(data.parentElement?.tagName)
          )
        ) {
          data.static.group = data.parentElement.tagName
          newItem = createTable('row', data)
        } else if (
          ['td', 'th'].includes(currentNode.tagName) &&
          data.parentElement?.tagName === 'tr'
        ) {
          if (currentNode.attribs?.colspan != null) {
            data.static.colspan = parseInt(currentNode.attribs?.colspan, 10)
            data.static.colspan = isNaN(data.static.colspan) ? null : data.static.colspan
          }

          if (data.static.colspan == null || data.static.colspan <= 0) {
            data.static.colspan = 1
          }

          if (currentNode.attribs?.rowspan != null) {
            data.static.rowspan = parseInt(currentNode.attribs?.rowspan, 10)
            data.static.rowspan = isNaN(data.static.rowspan) ? null : data.static.rowspan
          }

          if (data.static.rowspan == null || data.static.rowspan <= 0) {
            data.static.rowspan = 1
          }

          newItem = createTable('cell', data)
        }
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
      newParent = newItem != null && newItem.children != null ? newItem : parent
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

      const createExtraElementResolvers = [rootExtraElementResolver, tableExtraElementResolver, paragraphExtraElementResolver]

      let extraElementResultFromResolver

      if (mode === 'block') {
        // parents that are created from resolvers are going to be inserted as siblings
        // of the current parent
        for (const extraElementResolver of createExtraElementResolvers) {
          const elementResult = extraElementResolver({
            node: currentNode,
            parent: newParent,
            childNode,
            childNodeIndex: cIdx,
            prevChildNode
          })

          if (elementResult != null) {
            if (elementResult.element == null) {
              throw new Error('Element resolver must return a element')
            }

            if (elementResult.target == null) {
              throw new Error('Element resolver must return a target')
            }

            if (elementResult.target !== 'sibling' && elementResult.target === 'children') {
              throw new Error('Element resolver must return a valid target')
            }

            extraElementResultFromResolver = elementResult
            break
          }
        }
      }

      if (extraElementResultFromResolver) {
        if (extraElementResultFromResolver.target === 'sibling') {
          newParent = extraElementResultFromResolver.element
          targetCollection = [newParent]
          collection.push(targetCollection)
        } else if (extraElementResultFromResolver.target === 'parent') {
          newParent.children.push(extraElementResultFromResolver.element)
          newParent = extraElementResultFromResolver.element
        }
      }

      if (mode === 'block') {
        pendingItem.parents = newParent !== parent ? [...parents, newParent] : [...parents]
      }

      pendingItem.collection = targetCollection

      pendingItemsInCurrent.push(pendingItem)
      prevChildNode = childNode
    }

    if (pendingItemsInCurrent.length > 0) {
      pending.unshift(...pendingItemsInCurrent)
    }
  }

  return transformMeta(result, sectionDetail)
}

function createParagraph () {
  return {
    type: 'paragraph',
    children: []
  }
}

function createTable (type = 'table', data) {
  if (type !== 'table' && type !== 'row' && type !== 'cell') {
    throw new Error(`Invalid table type target "${type}"`)
  }

  const props = {}

  if (data != null) {
    const allNotNullPropertiesMap = {
      row: ['height', 'group'],
      cell: ['colspan', 'rowspan', 'width', 'height']
    }

    const staticNotNullProperties = allNotNullPropertiesMap[type] || []

    for (const prop of staticNotNullProperties) {
      if (data.static[prop] != null) {
        props[prop] = data.static[prop]
      }
    }
  }

  return {
    type,
    children: [],
    ...props
  }
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

function createImage (src, data) {
  const imageItem = {
    type: 'image',
    src
  }

  const staticNotNullProperties = [
    'width', 'height', 'alt'
  ]

  const notNullProperties = [
    'link'
  ]

  for (const prop of staticNotNullProperties) {
    if (data.static[prop] != null) {
      imageItem[prop] = data.static[prop]
    }
  }

  for (const prop of notNullProperties) {
    if (data[prop] != null) {
      imageItem[prop] = data[prop]
    }
  }

  return imageItem
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
      let normalizeStartingSpace = true

      // if the parent is not block element and the previous sibling of parent is text or element then don't normalize
      if (
        firstChildNode?.parentNode?.nodeType === NODE_TYPES.ELEMENT &&
        !(mode === 'block' ? isBlockElement(firstChildNode?.parentNode) : false)
      ) {
        const isTextOrElement = (
          isTextElement(firstChildNode.parentNode.previousSibling) ||
          firstChildNode.parentNode.previousSibling?.nodeType === NODE_TYPES.ELEMENT
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
      let normalizeEndingSpace = true

      // if the parent is not block element and the next sibling of parent is text or element then don't normalize
      if (
        lastChildNode?.parentNode?.nodeType === NODE_TYPES.ELEMENT &&
        !(mode === 'block' ? isBlockElement(lastChildNode?.parentNode) : false)
      ) {
        const isTextOrElement = (
          isTextElement(lastChildNode.parentNode.nextSibling) ||
          lastChildNode.parentNode.nextSibling?.nodeType === NODE_TYPES.ELEMENT
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

  if (styles.width != null) {
    const parseArgs = [styles.width]

    if (node.tagName === 'table' || node.tagName === 'td' || node.tagName === 'th') {
      parseArgs.push({
        units: ['px', 'cm', '%']
      })
    }

    const parsedWidth = getDimension(...parseArgs)

    if (parsedWidth != null) {
      data.static.width = styles.width
    }
  }

  if (styles.height != null) {
    const parsedHeight = getDimension(styles.height)

    if (parsedHeight != null) {
      data.static.height = styles.height
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

function isTextElement (node) {
  if (node == null) {
    return false
  }

  return node.nodeType === NODE_TYPES.TEXT
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

function isUnsupportedElement (node) {
  return node.nodeType === NODE_TYPES.ELEMENT && !SUPPORTED_ELEMENTS.includes(node.tagName)
}

function isTableItemElement (node) {
  if (node == null) {
    return false
  }

  return (
    node.nodeType === NODE_TYPES.ELEMENT &&
    ['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'].includes(node.tagName)
  )
}

function transformMeta (fullMeta, sectionDetail) {
  const normalized = []
  const pending = [{ item: fullMeta, collection: normalized }]

  while (pending.length > 0) {
    const { item: currentItem, collection } = pending.shift()

    if (currentItem == null) {
      continue
    }

    if (Array.isArray(currentItem)) {
      pending.unshift(...currentItem.map((cItem) => ({ item: cItem, collection })))
    } else {
      if (
        currentItem.children == null ||
        (
          currentItem.children != null &&
          currentItem.children.length > 0
        )
      ) {
        if (currentItem.type === 'table') {
          transformTableMeta(currentItem, sectionDetail)
        }

        collection.push(currentItem)

        if (currentItem.children != null) {
          pending.unshift(...currentItem.children.map((cItem) => ({ item: cItem, collection: [] })))
        }
      }
    }
  }

  return normalized
}

function rootExtraElementResolver ({ node, childNode, childNodeIndex }) {
  if (node.nodeType === NODE_TYPES.DOCUMENT && childNodeIndex === 0) {
    const element = childNode.tagName === 'table' ? createTable() : createParagraph()

    return {
      element,
      target: 'sibling'
    }
  }
}

function tableExtraElementResolver ({ parent, childNode, childNodeIndex, prevChildNode }) {
  let element

  if (
    childNode.tagName === 'table' &&
    parent != null &&
    (parent.children.length > 0 || childNodeIndex !== 0)
  ) {
    element = createTable()
  }

  if (element == null) {
    return
  }

  return {
    element,
    target: 'sibling'
  }
}

function paragraphExtraElementResolver ({ parent, childNode, childNodeIndex, prevChildNode }) {
  const testsMatches = [
    () => {
      if (
        prevChildNode != null &&
        isBlockElement(prevChildNode) &&
        !isTableItemElement(prevChildNode)
      ) {
        return { target: 'sibling' }
      }
    },
    () => {
      if (
        isBlockElement(childNode) &&
        !isTableItemElement(childNode) &&
        parent != null &&
        (parent.children.length > 0 || childNodeIndex !== 0)
      ) {
        return { target: 'sibling' }
      }
    },
    () => {
      if (
        parent != null &&
        parent.children.length === 0 &&
        parent.type !== 'paragraph' &&
        (
          isTextElement(childNode) ||
          isInlineElement(childNode) ||
          isUnsupportedElement(childNode)
        )
      ) {
        return { target: 'parent' }
      }
    }
  ]

  for (const testMatch of testsMatches) {
    const match = testMatch()

    if (match != null) {
      return {
        element: createParagraph(),
        target: match.target
      }
    }
  }
}
