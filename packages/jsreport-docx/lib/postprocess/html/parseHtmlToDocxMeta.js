const cheerio = require('cheerio')
const styleAttr = require('style-attr')
const { customAlphabet } = require('nanoid')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const parseCssSides = require('parse-css-sides')
const color = require('tinycolor2')
const { lengthToPt, getDimension } = require('../../utils')
const createHierarchyIterator = require('./createHierarchyIterator')
const borderStyles = require('./borderStyles')
const { HTML_NODE_TYPES, isTextElement, isInlineElement, isUnsupportedElement, getParentElementThatMatch, isMetaElement } = require('./htmlNodeUtils')
const transformTableMeta = require('./transformTableMeta')

const VALID_CSS_BORDER_STYLES = [...borderStyles.keys()]

module.exports = function parseHtmlToDocxMeta (html, mode, sectionColsWidth, transformFn) {
  if (mode !== 'block' && mode !== 'inline') {
    throw new Error(`Invalid parsing mode "${mode}"`)
  }

  const $ = cheerio.load(html, null, false)

  const documentNode = $.root()[0]

  return parseHtmlDocumentToMeta($, documentNode, mode, sectionColsWidth, transformFn)
}

function parseHtmlDocumentToMeta ($, documentNode, mode, sectionColsWidth, transformFn) {
  const hierarchyContext = {}
  const hierarchyIterator = createHierarchyIterator($, mode, documentNode, hierarchyContext)
  const containerTypes = ['paragraph', 'table', 'row', 'cell']
  const activeContainers = [{ type: 'root', children: [] }]
  const containerMetaMap = new WeakMap()
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
        transformTableMeta(container, sectionColsWidth)
      }

      // NOTE: calling transformFn here only works for block mode, for inline we just do
      // it directly when processing nodes
      if (container?.children && transformFn) {
        for (const element of container.children) {
          if (containerTypes.includes(element.type)) {
            continue
          }

          transformFn(element)
        }
      }

      if (container && transformFn) {
        transformFn(container)
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

    let updateHierarchyForContainer = false

    // this is to preserve having multiple sibling inline elements into the same paragraph
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
        // since we are going to reuse a container, we need to do some handling
        updateHierarchyForContainer = true
        containersToRemove--
      }
    }

    if (containersToRemove > 0) {
      activeContainers.splice(activeContainers.length - containersToRemove, containersToRemove)
    }

    // when reusing the container we need to mark the container as item that needs
    // hierarchy update, this will update our internal map the next time we find a
    // new item for this container. this is needed in order to properly close the container
    // and be able to move to the next active container during processing of nodes
    if (updateHierarchyForContainer) {
      const lastActiveContainer = activeContainers[activeContainers.length - 1]
      let containerMeta = containerMetaMap.get()

      if (containerMeta == null) {
        containerMeta = {}
        containerMetaMap.set(lastActiveContainer, containerMeta)
      }

      containerMeta.updateHierarchy = true
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
      // we only parse styles and put it in data for elements
      // that are not meta elements, this is to ensure styles are not
      // inherited by children, when it is not wanted
      if (!isMetaElement(node)) {
        inspectStylesAndApplyDataIfNeeded(data, node)
      }

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
          // this initialize colgroups and reset when a nested table is found
          data.colgroups = []

          if (
            data.static.border == null &&
            (node.attribs?.border != null || node.attribs?.bordercolor != null)
          ) {
            data.static.border = data.static.border || {
              base: {},
              top: {},
              right: {},
              bottom: {},
              left: {}
            }

            // if border width definition comes from style, we just use it, if not parse it from the attribute if present
            if (node.attribs?.border != null) {
              const borderWidth = parseBorder(node.attribs.border, 'border-width')?.width

              if (borderWidth != null) {
                data.static.border.base.width = borderWidth
                data.static.border.top.width = borderWidth
                data.static.border.right.width = borderWidth
                data.static.border.bottom.width = borderWidth
                data.static.border.left.width = borderWidth
              }
            }

            // if border color definition comes from style, we just use it, if not parse it from the attribute if present
            if (node.attribs?.bordercolor != null) {
              const borderColor = parseBorder(node.attribs.bordercolor, 'border-color')?.color

              if (borderColor != null) {
                data.static.border.base.color = borderColor
                data.static.border.top.color = borderColor
                data.static.border.right.color = borderColor
                data.static.border.bottom.color = borderColor
                data.static.border.left.color = borderColor
              }
            }
          }

          data.static.border = data.static.border || {
            top: {},
            right: {},
            bottom: {},
            left: {}
          }

          for (const borderSide of ['top', 'right', 'bottom', 'left']) {
            // default border width
            if (data.static.border?.[borderSide]?.width == null) {
              data.static.border[borderSide] = data.static.border[borderSide] || {}
              data.static.border[borderSide].width = 0.5
            }

            // default border style
            if (data.static.border?.[borderSide]?.style == null) {
              data.static.border[borderSide] = data.static.border[borderSide] || {}
              data.static.border[borderSide].style = 'solid'
            }
          }

          if (data.indent == null && data.spacing == null && node.attribs?.cellpadding != null) {
            const cellPadding = parseMarginOrPadding(node.attribs.cellpadding, 'top')?.top
            data.indent = data.indent || {}
            data.indent.left = cellPadding
            data.indent.right = cellPadding
            data.spacing = data.spacing || {}
            data.spacing.before = cellPadding
            data.spacing.after = cellPadding
          }

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

          // TODO: we are missing support for table <caption> tag,
          // right now we just parse it and do nothing, however we should create the captions
          // in docx for the proper support
          newItem = createTable('table', data)
          // creating a link here, modifications to the data.colgroups will be applied to the table
          newItem.colgroups = data.colgroups
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

        if (mode === 'block') {
          const parentTableNode = getParentElementThatMatch(node, (currentNode) => currentNode.tagName === 'table')

          if (parentTableNode != null) {
            applyTableColgroupDataIfNeeded(data, elementDataMap.get(parentTableNode), node)
          }
        }
      }
    }

    if (newItem != null) {
      const toInsert = Array.isArray(newItem) ? newItem : [newItem]

      for (const item of toInsert) {
        let container = activeContainers[activeContainers.length - 1]

        if (mode === 'inline') {
          container.children.push(item)
          // NOTE: calling transformFn here only works for inline mode, for block we just do
          // it directly when processing closing nodes
          if (transformFn) {
            transformFn(item)
          }

          continue
        }

        let currentItem = item

        const parentsToProcess = []

        if (
          !containerTypes.includes(currentItem.type) &&
          container.type !== 'paragraph'
        ) {
          // all inline elements (text, break, images) should always be wrapped
          // in a paragraph
          const paragraph = createParagraph()
          paragraph.children.push(currentItem)
          currentItem = paragraph
          container.children.push(currentItem)
          parentsToProcess.push(container)
          container = currentItem
          parentsToProcess.push(container)
        } else {
          container.children.push(currentItem)
          parentsToProcess.push(container)
        }

        if (containerMetaMap.get(container)?.updateHierarchy) {
          containerMetaMap.delete(container)
          hierarchyIdContainerMap.set(hierarchyId.value, container)
        }

        for (const parent of parentsToProcess) {
          applyTitleIfNeeded(parent, data)
          applyListIfNeeded(parent, data)
          applyBackgroundColorIfNeeded(parent, data)
          applyAlignmentIfNeeded(parent, data)
          applyIndentIfNeeded(parent, data)
          applySpacingIfNeeded(parent, data)
        }

        if (containerTypes.includes(currentItem.type)) {
          activeContainers.push(currentItem)
          hierarchyIdContainerMap.set(hierarchyId.value, currentItem)
        }
      }
    }

    elementDataMap.set(node, data)
  }

  processClosedItems(hierarchyContext.getLastClosedItems())

  const docxMeta = activeContainers[0].children

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
    const allNotNullStaticPropertiesMap = {
      table: ['width', 'border'],
      row: ['height', 'group'],
      cell: ['colspan', 'rowspan', 'width', 'height', 'border']
    }

    // properties here will be removed once applied to table item,
    // so children does not inherit them, if some exception needs to be made
    // then be aware and add logic for it here
    const allNotNullPropertiesMap = {
      cell: ['backgroundColor', 'indent', 'spacing']
    }

    const staticNotNullProperties = allNotNullStaticPropertiesMap[type] || []

    for (const prop of staticNotNullProperties) {
      if (data.static[prop] != null) {
        props[prop] = data.static[prop]
      }
    }

    const normalNotNullProperties = allNotNullPropertiesMap[type] || []

    for (const prop of normalNotNullProperties) {
      if (data[prop] != null) {
        props[prop] = data[prop]
        delete data[prop]
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
    // we create a new id always and don't care about re-using same id for nested lists
    // because we want to match output of html which allows a list to have both ordered
    // and unordered lists at different levels,
    // in docx this is not possible if you re-use the same id
    data.listContainerId = `list_${generateRandomId()}`

    let start = node.tagName === 'ol' ? node.attribs?.start : null

    if (start != null) {
      start = parseInt(start, 10)
      start = isNaN(start) ? null : start
    }

    if (start != null) {
      data.listStart = start
    } else {
      // important to do this to prevent nested list to inherit the start
      data.listStart = null
    }
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

    if (data.listStart != null) {
      data.list.start = data.listStart
    }
  }
}

function applyTableColgroupDataIfNeeded (data, parentTableData, node) {
  if (node.nodeType !== HTML_NODE_TYPES.ELEMENT) {
    return
  }

  if (node.tagName !== 'colgroup' && node.tagName !== 'col') {
    return
  }

  if (data.colgroups == null) {
    return
  }

  if (
    node.tagName === 'colgroup' &&
    data.parentElement?.tagName !== 'table'
  ) {
    return
  }

  if (
    node.tagName === 'col' &&
    data.parentElement?.tagName !== 'colgroup'
  ) {
    return
  }

  let cols
  let targetNode

  if (parentTableData == null) {
    return
  }

  if (node.tagName === 'colgroup') {
    cols = []

    if (node.childNodes.length === 0) {
      targetNode = node
    }

    parentTableData.colgroups.push({
      cols
    })
  } else if (node.tagName === 'col') {
    const latestColgroup = parentTableData.colgroups[parentTableData.colgroups.length - 1]

    cols = latestColgroup.cols
    targetNode = node
  }

  if (targetNode != null && cols != null) {
    // we clone to prevent mutating nested objects
    // eslint-disable-next-line no-undef
    const customData = structuredClone(pick(parentTableData, ['backgroundColor', 'border', 'minWidth', 'width', 'static']))

    const dataFromStyles = inspectStylesAndApplyDataIfNeeded(
      customData,
      targetNode,
      ['backgroundColor', 'border', 'minWidth', 'width']
    )

    const staticProps = dataFromStyles?.static

    if (dataFromStyles != null) {
      delete dataFromStyles.static
    }

    cols.push({
      span: node.attribs?.span != null && node.attribs.span !== '' ? parseInt(node.attribs.span, 10) : 1,
      ...dataFromStyles,
      ...staticProps
    })
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

function inspectStylesAndApplyDataIfNeeded (data, node, explicitProperties = null) {
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

  const allStyleProperties = [
    'fontSize', 'fontFamily', 'color', 'backgroundColor',
    'underline', 'strike', 'alignment', 'border',
    'indent', 'spacing', 'minWidth', 'width',
    'height', 'breakPage'
  ]

  const styleProperties = explicitProperties ?? allStyleProperties

  for (const styleProp of styleProperties) {
    switch (styleProp) {
      case 'fontSize': {
        if (styles['font-size'] == null) {
          break
        }

        const parsedFontSize = lengthToPt(styles['font-size'])

        if (parsedFontSize != null) {
          data.fontSize = parsedFontSize
        }

        break
      }

      case 'fontFamily': {
        if (styles['font-family'] == null) {
          break
        }

        const fontFamily = styles['font-family'].replace(/^"/, '').replace(/"$/, '')
        data.fontFamily = fontFamily
        break
      }

      case 'color': {
        if (styles.color == null) {
          break
        }

        const parsedColor = color(styles.color)

        if (parsedColor.isValid()) {
          data.color = parsedColor.toHexString().toUpperCase()
        }

        break
      }

      case 'backgroundColor': {
        if (styles['background-color'] == null) {
          break
        }

        const parsedBackgroundColor = color(styles['background-color'])

        if (parsedBackgroundColor.isValid()) {
          data.backgroundColor = parsedBackgroundColor.toHexString().toUpperCase()
        }

        break
      }

      case 'underline':
      case 'strike': {
        if (styles['text-decoration'] == null) {
          break
        }

        const textDecoration = styles['text-decoration']

        if (styleProp === 'underline' && textDecoration === 'underline') {
          data.underline = true
        } else if (styleProp === 'strike' && textDecoration === 'line-through') {
          data.strike = true
        }

        break
      }

      case 'alignment': {
        if (styles['text-align'] == null && styles['vertical-align'] == null) {
          break
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

        if (styles['vertical-align'] != null) {
          const verticalAlign = styles['vertical-align']

          data.alignment = data.alignment || {}

          if (verticalAlign === 'top') {
            data.alignment.vertical = 'top'
          } else if (verticalAlign === 'middle') {
            data.alignment.vertical = 'center'
          } else if (verticalAlign === 'bottom') {
            data.alignment.vertical = 'bottom'
          }
        }

        break
      }

      case 'border': {
        const mainBorderPropMap = new Map([
          ['border', 'base'],
          ['border-top', 'top'],
          ['border-right', 'right'],
          ['border-bottom', 'bottom'],
          ['border-left', 'left']
        ])

        const borderProps = [...mainBorderPropMap.keys()].flatMap((mainProp) => {
          const target = mainBorderPropMap.get(mainProp)

          return [
            { key: mainProp, target },
            { key: `${mainProp}-width`, target },
            { key: `${mainProp}-style`, target },
            { key: `${mainProp}-color`, target }
          ]
        })

        for (const { key: borderProp, target } of borderProps) {
          if (styles[borderProp] == null) {
            continue
          }

          const value = styles[borderProp]
          const parseArgs = [value]

          if (!mainBorderPropMap.has(borderProp)) {
            const borderPropParts = borderProp.split('-')
            parseArgs.push(`border-${borderPropParts[borderPropParts.length - 1]}`)
          }

          const parsedValue = parseBorder(...parseArgs)

          if (parsedValue == null) {
            continue
          }

          data.static.border = data.static.border || {}
          data.static.border[target] = Object.assign({}, data.static.border[target], parsedValue)

          if (target === 'base') {
            data.static.border.top = Object.assign({}, data.static.border[target], parsedValue)
            data.static.border.right = Object.assign({}, data.static.border[target], parsedValue)
            data.static.border.bottom = Object.assign({}, data.static.border[target], parsedValue)
            data.static.border.left = Object.assign({}, data.static.border[target], parsedValue)
          }
        }

        break
      }

      case 'indent':
      case 'spacing': {
        const parsedPadding = parseMarginOrPadding(styles.padding)
        const parsedMargin = parseMarginOrPadding(styles.margin)

        if (styleProp === 'indent') {
          data.indent = data.indent || {}

          const parsedPaddingLeft = parsedPadding?.left

          if (parsedPaddingLeft != null) {
            data.indent.left = parsedPaddingLeft
          }

          const parsedPaddingRight = parsedPadding?.right

          if (parsedPaddingRight != null) {
            data.indent.right = parsedPaddingRight
          }

          if (styles['padding-left'] != null) {
            const parsedPaddingLeft = parseMarginOrPadding(styles['padding-left'], 'left')?.left

            if (parsedPaddingLeft != null) {
              data.indent = data.indent || {}
              data.indent.left = parsedPaddingLeft
            }
          }

          if (styles['padding-right'] != null) {
            const parsedPaddingRight = parseMarginOrPadding(styles['padding-right'], 'right')?.right

            if (parsedPaddingRight != null) {
              data.indent = data.indent || {}
              data.indent.right = parsedPaddingRight
            }
          }

          const parsedMarginLeft = parsedMargin?.left

          if (parsedMarginLeft != null) {
            data.indent.left = parsedMarginLeft
          }

          const parsedMarginRight = parsedMargin?.right

          if (parsedMarginRight != null) {
            data.indent.right = parsedMarginRight
          }

          if (styles['margin-left'] != null) {
            const parsedMarginLeft = parseMarginOrPadding(styles['margin-left'], 'left')?.left

            if (parsedMarginLeft != null) {
              data.indent = data.indent || {}
              data.indent.left = parsedMarginLeft
            }
          }

          if (styles['margin-right'] != null) {
            const parsedMarginRight = parseMarginOrPadding(styles['margin-right'], 'right')?.right

            if (parsedMarginRight != null) {
              data.indent = data.indent || {}
              data.indent.right = parsedMarginRight
            }
          }
        } else if (styleProp === 'spacing') {
          data.spacing = data.spacing || {}

          const parsedPaddingTop = parsedPadding?.top

          if (parsedPaddingTop != null) {
            data.spacing.before = parsedPaddingTop
          }

          const parsedPaddingBottom = parsedPadding?.bottom

          if (parsedPaddingBottom != null) {
            data.spacing.after = parsedPaddingBottom
          }

          if (styles['padding-top'] != null) {
            const parsedPaddingTop = parseMarginOrPadding(styles['padding-top'], 'top')?.top

            if (parsedPaddingTop != null) {
              data.spacing = data.spacing || {}
              data.spacing.before = parsedPaddingTop
            }
          }

          if (styles['padding-bottom'] != null) {
            const parsedPaddingBottom = parseMarginOrPadding(styles['padding-bottom'], 'bottom')?.bottom

            if (parsedPaddingBottom != null) {
              data.spacing = data.spacing || {}
              data.spacing.after = parsedPaddingBottom
            }
          }

          const parsedMarginTop = parsedMargin?.top

          if (parsedMarginTop != null) {
            data.spacing.before = parsedMarginTop
          }

          const parsedMarginBottom = parsedMargin?.bottom

          if (parsedMarginBottom != null) {
            data.spacing.after = parsedMarginBottom
          }

          if (styles['margin-top'] != null) {
            const parsedMarginTop = parseMarginOrPadding(styles['margin-top'], 'top')?.top

            if (parsedMarginTop != null) {
              data.spacing = data.spacing || {}
              data.spacing.before = parsedMarginTop
            }
          }

          if (styles['margin-bottom'] != null) {
            const parsedMarginBottom = parseMarginOrPadding(styles['margin-bottom'], 'bottom')?.bottom

            if (parsedMarginBottom != null) {
              data.spacing = data.spacing || {}
              data.spacing.after = parsedMarginBottom
            }
          }
        }

        break
      }

      case 'width': {
        if (styles.width == null) {
          break
        }

        const parseArgs = [styles.width]

        if (
          node.tagName === 'table' ||
          node.tagName === 'td' ||
          node.tagName === 'th' ||
          node.tagName === 'colgroup' ||
          node.tagName === 'col'
        ) {
          parseArgs.push({
            units: ['px', 'cm', '%']
          })
        }

        const parsedWidth = getDimension(...parseArgs)

        if (parsedWidth != null) {
          data.static.width = styles.width
        }

        break
      }

      case 'minWidth': {
        if (styles['min-width'] == null) {
          break
        }

        const parseArgs = [styles['min-width']]

        if (
          node.tagName === 'table' ||
          node.tagName === 'td' ||
          node.tagName === 'th' ||
          node.tagName === 'colgroup' ||
          node.tagName === 'col'
        ) {
          parseArgs.push({
            units: ['px', 'cm', '%']
          })
        }

        const parsedMinWidth = getDimension(...parseArgs)

        if (parsedMinWidth != null) {
          data.static.minWidth = styles['min-width']
        }

        break
      }

      case 'height': {
        if (styles.height == null) {
          break
        }

        const parsedHeight = getDimension(styles.height)

        if (parsedHeight != null) {
          data.static.height = styles.height
        }

        break
      }

      case 'breakPage': {
        if (styles['break-before'] == null && styles['break-after'] == null) {
          break
        }

        if (styles['break-before'] === 'page') {
          data.static.breakPage = data.static.breakPage || {}
          data.static.breakPage.before = true
        }

        if (styles['break-after'] === 'page') {
          data.static.breakPage = data.static.breakPage || {}
          data.static.breakPage.after = true
        }

        break
      }

      default:
        throw new Error(`Style property "${styleProp}" is not supported`)
    }
  }

  return data
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
  if (parentMeta.type !== 'paragraph' && parentMeta.type !== 'cell') {
    return
  }

  if (data.alignment == null) {
    return
  }

  if (parentMeta.type === 'paragraph' && data.alignment.horizontal != null) {
    parentMeta.alignment = {
      horizontal: data.alignment.horizontal
    }
  }

  if (parentMeta.type === 'cell' && data.alignment.vertical != null) {
    parentMeta.alignment = {
      vertical: data.alignment.vertical
    }

    // vertical alignment should be removed once applied to cell item
    // so children does not inherit it
    delete data.alignment.vertical
  }

  if (Object.keys(data.alignment).length === 0) {
    delete data.alignment
  }
}

function applyIndentIfNeeded (parentMeta, data) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (data.indent == null) {
    return
  }

  parentMeta.indent = data.indent
  // indent should be removed once applied to paragraph item
  // so children does not inherit it
  delete data.indent
}

function applySpacingIfNeeded (parentMeta, data) {
  if (parentMeta.type !== 'paragraph') {
    return
  }

  if (data.spacing == null) {
    return
  }

  parentMeta.spacing = data.spacing
  // spacing should be removed once applied to paragraph item
  // so children does not inherit it
  delete data.spacing
}

function parseBorder (borderStyle, targetType) {
  if (borderStyle == null || borderStyle === '') {
    return null
  }

  const isFull = targetType == null
  const validTargets = ['border-width', 'border-style', 'border-color']
  const targets = []

  if (isFull) {
    const inputParts = borderStyle.split(/\s+/)

    if (inputParts.length < 2) {
      return null
    }

    targets.push(...validTargets.map((t, idx) => [t, inputParts[idx]]))
  } else {
    targets.push([targetType, borderStyle])
  }

  const result = {}

  for (const [target, value] of targets) {
    if (!validTargets.includes(target)) {
      throw new Error(`Invalid target "${target}" for border parsing`)
    }

    switch (target) {
      case 'border-width': {
        const parsedWidth = getDimension(value, {
          validUnits: ['px'],
          defaultUnit: 'px'
        })

        if (parsedWidth != null) {
          result.width = parsedWidth.value
        }

        break
      }

      case 'border-style': {
        if (!VALID_CSS_BORDER_STYLES.includes(value)) {
          break
        }

        result.style = value
        break
      }

      case 'border-color': {
        const pColor = color(value)

        if (!pColor.isValid()) {
          break
        }

        result.color = pColor.toHexString().toUpperCase()
        break
      }

      default:
        break
    }
  }

  if (Object.keys(result).length === 0) {
    return null
  }

  return result
}

function parseMarginOrPadding (marginOrPaddingStyle, sideType) {
  if (marginOrPaddingStyle == null || marginOrPaddingStyle === '') {
    return null
  }

  const isFull = sideType == null
  const validTargets = ['top', 'right', 'bottom', 'left']
  const targets = []

  if (isFull) {
    const parsePaddingMargin = parseCssSides(marginOrPaddingStyle)
    targets.push(...validTargets.map((t, idx) => [t, parsePaddingMargin[t]]))
  } else {
    targets.push([sideType, marginOrPaddingStyle])
  }

  const result = {}

  for (const [target, value] of targets) {
    if (!validTargets.includes(target)) {
      throw new Error(`Invalid target "${target}" for padding, margin parsing`)
    }

    const parsedValue = lengthToPt(value)

    if (parsedValue == null) {
      continue
    }

    result[target] = parsedValue
  }

  if (Object.keys(result).length === 0) {
    return null
  }

  return result
}

function pick (obj, keys) {
  const result = {}

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }

  return result
}
