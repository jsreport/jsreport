const cheerio = require('cheerio')
const styleAttr = require('style-attr')
const { customAlphabet } = require('nanoid')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const parseCssSides = require('parse-css-sides')
const color = require('tinycolor2')
const { lengthToPt, getDimension } = require('../../utils')
const createHierarchyIterator = require('./createHierarchyIterator')
const { HTML_NODE_TYPES, isTextElement, isInlineElement, isUnsupportedElement, getParentElementThatMatch } = require('./htmlNodeUtils')
const transformTableMeta = require('./transformTableMeta')

module.exports = function parseHtmlToDocxMeta (html, mode, sectionDetail) {
  if (mode !== 'block' && mode !== 'inline') {
    throw new Error(`Invalid parsing mode "${mode}"`)
  }

  const $ = cheerio.load(html, null, false)

  const documentNode = $.root()[0]

  return parseHtmlDocumentToMeta($, documentNode, mode, sectionDetail)
}

function parseHtmlDocumentToMeta ($, documentNode, mode, sectionDetail) {
  const hierarchyContext = {}
  const hierarchyIterator = createHierarchyIterator($, mode, documentNode, hierarchyContext)
  const containerTypes = ['paragraph', 'table', 'row', 'cell']
  const containers = [{ type: 'root', children: [] }]
  const hierarchyIdContainerMap = new Map()
  const elementDataMap = new WeakMap()
  let ignoreChildrenOf

  const processClosedItems = (closedItems, onEach) => {
    for (let idx = 0; idx < closedItems.length; idx++) {
      const closedHierarchyId = closedItems[idx]
      const container = hierarchyIdContainerMap.get(closedHierarchyId.value)

      if (container) {
        hierarchyIdContainerMap.delete(closedHierarchyId.value)
      }

      if (container?.type === 'table') {
        transformTableMeta(container, sectionDetail)
      }

      if (onEach) {
        onEach(closedHierarchyId, container)
      }
    }
  }

  for (const { currentItem, closedItems } of hierarchyIterator) {
    const { node, data, hierarchyId } = currentItem
    const nodeType = node.nodeType

    let containersToRemove = 0

    processClosedItems(closedItems, (closedHierarchyId, container) => {
      if (closedHierarchyId.value === ignoreChildrenOf) {
        ignoreChildrenOf = null
      }

      if (container != null) {
        containersToRemove++
      }
    })

    if (containersToRemove > 0 && node.previousSibling != null) {
      const previousIsInlineOrText = (
        isTextElement(node.previousSibling) ||
        isUnsupportedElement(node.previousSibling) ||
        isInlineElement(node.previousSibling)
      )

      const currentIsInlineOrText = (
        isTextElement(node) ||
        isUnsupportedElement(node) ||
        isInlineElement(node)
      )

      const someInClosedIsSibling = closedItems.find((closedHierarchyId) => closedHierarchyId.parts.length === hierarchyId.parts.length) != null

      const skipOne = previousIsInlineOrText && currentIsInlineOrText && someInClosedIsSibling

      if (skipOne) {
        containersToRemove--
      }
    }

    if (containersToRemove > 0) {
      containers.splice(containers.length - containersToRemove, containersToRemove)
    }

    if (ignoreChildrenOf != null) {
      continue
    }

    let newItem

    if (
      isTextElement(node) ||
      // unsupported element, fallback to simple text
      isUnsupportedElement(node)
    ) {
      // when an unsupported element is found we don't care about parsing its children
      if (isUnsupportedElement(node)) {
        ignoreChildrenOf = hierarchyId.value
      }

      const getTextInNode = (n) => n.nodeType === HTML_NODE_TYPES.TEXT ? n.nodeValue : $(n).text()

      newItem = []

      const parentBlockElementData = elementDataMap.get(data.parentBlockElement)
      const parentElementData = elementDataMap.get(data.parentElement)

      if (
        parentBlockElementData?.static?.breakPage?.before === true ||
        parentElementData?.static?.breakPage?.before === true
      ) {
        newItem.push(createBreak('page'))
      }

      const normalizeResult = normalizeText(getTextInNode(node), data)

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
    } else if (
      nodeType === HTML_NODE_TYPES.ELEMENT
    ) {
      inspectStylesAndApplyDataIfNeeded(data, node)

      if (isInlineElement(node)) {
        applyBoldDataIfNeeded(data, node)
        applyItalicDataIfNeeded(data, node)
        applyUnderlineDataIfNeeded(data, node)
        applySubscriptDataIfNeeded(data, node)
        applyStrikeDataIfNeeded(data, node)
        applySuperscriptDataIfNeeded(data, node)
        applyCodeDataIfNeeded(data, node)
        applyLinkDataIfNeeded(data, node)

        if (node.tagName === 'br') {
          newItem = createBreak()
        } else if (
          // only accept image as valid if there is src defined
          node.tagName === 'img' &&
          node.attribs?.src != null &&
          typeof node.attribs?.src === 'string'
        ) {
          // if width comes from style, we just use it, if not parse it from the attribute if present
          if (data.static.width == null && node.attribs?.width) {
            const parsedWidth = parseFloat(node.attribs.width)

            if (parsedWidth != null && !isNaN(parsedWidth)) {
              data.static.width = `${parsedWidth}px`
            }
          }

          if (data.static.height == null && node.attribs?.height) {
            const parsedHeight = parseFloat(node.attribs.height)

            if (parsedHeight != null && !isNaN(parsedHeight)) {
              data.static.height = `${parsedHeight}px`
            }
          }

          if (node.attribs?.alt) {
            data.static.alt = node.attribs.alt
          }

          newItem = createImage(node.attribs.src, data)
        }
      } else {
        if (mode === 'block') {
          applyListDataIfNeeded(data, node)
        }

        applyPreformattedDataIfNeeded(data, node)

        if (mode === 'block' && node.tagName === 'table') {
          // if width comes from style, we just use it, if not parse it from the attribute if present
          if (data.static.width == null && node.attribs?.width) {
            // when parsing width from attribute, we only accept px, cm and % and default to px for other cases
            const validUnits = ['px', 'cm', '%']

            const parsedWidth = getDimension(node.attribs.width, {
              units: validUnits,
              defaultUnit: 'px'
            })

            if (parsedWidth != null) {
              data.static.width = `${parsedWidth.value}${parsedWidth.unit}`
            }
          }

          newItem = createTable('table', data)
        } else if (
          mode === 'block' &&
          node.tagName === 'tr' &&
          (
            ['table', 'thead', 'tbody', 'tfoot'].includes(data.parentElement?.tagName)
          )
        ) {
          data.static.group = data.parentElement.tagName
          newItem = createTable('row', data)
        } else if (
          mode === 'block' &&
          ['td', 'th'].includes(node.tagName) &&
          data.parentElement?.tagName === 'tr'
        ) {
          if (node.attribs?.colspan != null) {
            data.static.colspan = parseInt(node.attribs?.colspan, 10)
            data.static.colspan = isNaN(data.static.colspan) ? null : data.static.colspan
          }

          if (data.static.colspan == null || data.static.colspan <= 0) {
            data.static.colspan = 1
          }

          if (node.attribs?.rowspan != null) {
            data.static.rowspan = parseInt(node.attribs?.rowspan, 10)
            data.static.rowspan = isNaN(data.static.rowspan) ? null : data.static.rowspan
          }

          if (data.static.rowspan == null || data.static.rowspan <= 0) {
            data.static.rowspan = 1
          }

          newItem = createTable('cell', data)
        }
      }
    }

    if (newItem != null) {
      const toInsert = Array.isArray(newItem) ? newItem : [newItem]

      for (const item of toInsert) {
        let container = containers[containers.length - 1]

        if (mode === 'inline') {
          container.children.push(item)
          continue
        }

        let currentItem = item

        // all inline elements (text, break, images) should always be wrapped
        // in a paragraph
        if (
          !containerTypes.includes(currentItem.type) &&
          container.type !== 'paragraph'
        ) {
          const paragraph = createParagraph()
          paragraph.children.push(currentItem)
          currentItem = paragraph
          container.children.push(currentItem)
          container = currentItem
        } else {
          container.children.push(currentItem)
        }

        applyTitleIfNeeded(container, data)
        applyListIfNeeded(container, data)
        applyBackgroundColorIfNeeded(container, data)
        applyAlignmentIfNeeded(container, data)
        applyIndentIfNeeded(container, data)
        applySpacingIfNeeded(container, data)

        if (containerTypes.includes(currentItem.type)) {
          containers.push(currentItem)
          hierarchyIdContainerMap.set(hierarchyId.value, currentItem)
        }
      }
    }

    elementDataMap.set(node, data)
  }

  processClosedItems(hierarchyContext.getLastClosedItems())

  const docxMeta = containers[0].children

  return docxMeta
}

function createParagraph () {
  return {
    type: 'paragraph',
    children: []
  }
}

function createTable (type, data) {
  if (type !== 'table' && type !== 'row' && type !== 'cell') {
    throw new Error(`Invalid table type target "${type}"`)
  }

  const props = {}

  if (data != null) {
    const allNotNullPropertiesMap = {
      table: ['width'],
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
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  const isBold = node.tagName === 'b' || node.tagName === 'strong'

  if (!isBold) {
    return
  }

  data.bold = true
}

function applyItalicDataIfNeeded (data, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  const isItalic = node.tagName === 'i' || node.tagName === 'em'

  if (!isItalic) {
    return
  }

  data.italic = true
}

function applyUnderlineDataIfNeeded (data, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  const isUnderline = node.tagName === 'u' || node.tagName === 'ins'

  if (!isUnderline) {
    return
  }

  data.underline = true
}

function applySubscriptDataIfNeeded (data, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  const isSubscript = node.tagName === 'sub' || node.tagName === 'small'

  if (!isSubscript) {
    return
  }

  data.subscript = true
}

function applyStrikeDataIfNeeded (data, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  const isStrike = node.tagName === 's' || node.tagName === 'del'

  if (!isStrike) {
    return
  }

  data.strike = true
}

function applySuperscriptDataIfNeeded (data, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  const isSuperscript = node.tagName === 'sup'

  if (!isSuperscript) {
    return
  }

  data.superscript = true
}

function applyCodeDataIfNeeded (data, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  const isCode = node.tagName === 'code'

  if (!isCode) {
    return
  }

  data.code = true
}

function applyLinkDataIfNeeded (data, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
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
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
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
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  if (node.tagName !== 'pre') {
    return
  }

  data.preformatted = true
}

function inspectStylesAndApplyDataIfNeeded (data, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
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

  let node = data.parentBlockElement

  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  node = getParentElementThatMatch(node, (currentNode) => (
    [
      'h1', 'h2', 'h3',
      'h4', 'h5', 'h6'
    ].includes(currentNode.tagName)
  ))

  if (node == null) {
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

  if (data.parentBlockElement == null || data.list == null) {
    return
  }

  let node = data.parentBlockElement

  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  node = getParentElementThatMatch(node, (currentNode) => currentNode.tagName === 'li')

  if (node == null) {
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
