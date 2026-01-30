const path = require('path')
const { decode: decodeHtmlEntities } = require('html-entities')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')

const XML_ESCAPE_CHARACTERS = {
  '>': '&gt;',
  '<': '&lt;',
  "'": '&apos;',
  '"': '&quot;',
  '&': '&amp;'
}

function nodeListToArray (nodes) {
  const arr = []
  for (let i = 0; i < nodes.length; i++) {
    arr.push(nodes[i])
  }
  return arr
}

// we dont use the encode function of html-entities because want to have the chance to
// escape just some characters
function encodeXML (str, mode = 'all') {
  let pattern

  switch (mode) {
    case 'all':
      pattern = /([&"<>'])/g
      break
    case 'basic':
      pattern = /([&<>])/g
      break
    default:
      throw new Error('Invalid mode for encodeXML')
  }

  const output = str.replace(pattern, (_, item) => {
    return XML_ESCAPE_CHARACTERS[item]
  })

  return output
}

function decodeXML (str) {
  return decodeHtmlEntities(str, { level: 'xml' })
}

function parseXML (xmlStr) {
  return new DOMParser().parseFromString(xmlStr)
}

function getNewRelId (relsDoc) {
  const itemsMap = new Map()
  const baseId = 'rId0'

  // inserting fake item to always get new id
  itemsMap.set(0, 1)

  return getNewRelIdFromBaseId(relsDoc, itemsMap, baseId)
}

function getNewRelIdFromBaseId (relsDoc, itemsMap, baseId) {
  const relationsNodes = nodeListToArray(relsDoc.getElementsByTagName('Relationship'))

  const getId = (id) => {
    const regExp = /^rId(\d+)$/
    const match = regExp.exec(id)

    if (!match || !match[1]) {
      return null
    }

    return parseInt(match[1], 10)
  }

  const maxId = relationsNodes.reduce((lastId, node) => {
    const nodeId = node.getAttribute('Id')
    const num = getId(nodeId)

    if (num == null) {
      return lastId
    }

    if (num > lastId) {
      return num
    }

    return lastId
  }, 0)

  const baseIdNum = getId(baseId)

  if (baseIdNum == null) {
    throw new Error(`Unable to get numeric id from rel id "${baseId}"`)
  }

  let newId = getNewIdFromBaseId(itemsMap, baseIdNum, maxId)

  newId = `rId${newId}`

  return newId
}

function getNewIdFromBaseId (itemsMap, baseId, maxId) {
  const counter = itemsMap.get(baseId) || 0

  itemsMap.set(baseId, counter + 1)

  if (counter === 0) {
    return baseId
  }

  return maxId + 1
}

function findOrCreateChildNode (docNode, nodeName, targetNode) {
  let result
  const existingNode = findChildNode(nodeName, targetNode)

  if (!existingNode) {
    result = docNode.createElement(nodeName)
    targetNode.appendChild(result)
  } else {
    result = existingNode
  }

  return result
}

function findChildNode (nodeName, targetNode, allNodes = false) {
  const result = []

  for (let i = 0; i < targetNode.childNodes.length; i++) {
    let found = false
    const childNode = targetNode.childNodes[i]

    if (childNode.nodeName === nodeName) {
      found = true
      result.push(childNode)
    }

    if (found && !allNodes) {
      break
    }
  }

  return allNodes ? result : result[0]
}

function recreateNodeWithNewDoc (node, tmpDoc) {
  const pending = [{
    container: null,
    type: node.nodeName,
    baseEl: node
  }]

  let resultEl

  while (pending.length > 0) {
    const { container, type, baseEl } = pending.shift()
    let newEl

    if (type === '#text') {
      newEl = tmpDoc.createTextNode(baseEl.nodeValue)
    } else if (type === '#comment') {
      newEl = tmpDoc.createComment(baseEl.nodeValue)
    } else {
      newEl = tmpDoc.createElement(type)
    }

    const attributesList = Array.from(baseEl.attributes ?? [])

    for (const attr of attributesList) {
      newEl.setAttribute(attr.name, attr.value)
    }

    if (container) {
      container.appendChild(newEl)
    } else {
      resultEl = newEl
    }

    const childEls = Array.from(baseEl.childNodes ?? []).filter((node) => {
      // we only care about element, text and comment nodes
      return node.nodeType === 1 || node.nodeType === 3 || node.nodeType === 8
    })

    if (childEls.length > 0) {
      pending.unshift(...childEls.map((childEl) => ({
        container: newEl,
        type: childEl.nodeName,
        baseEl: childEl
      })))
    }
  }

  return resultEl
}

function getClosestEl (el, targetNodeNameOrFn, targetType = 'parent') {
  let currentEl = el
  let parentEl

  const nodeTest = (n) => {
    if (typeof targetNodeNameOrFn === 'string') {
      return n.nodeName === targetNodeNameOrFn
    } else {
      return targetNodeNameOrFn(n)
    }
  }

  if (targetType !== 'parent' && targetType !== 'previous' && targetType !== 'next') {
    throw new Error(`Invalid target type "${targetType}"`)
  }

  do {
    if (targetType === 'parent') {
      currentEl = currentEl.parentNode
    } else if (targetType === 'previous') {
      currentEl = currentEl.previousSibling
    } else if (targetType === 'next') {
      currentEl = currentEl.nextSibling
    }

    if (currentEl != null && nodeTest(currentEl)) {
      parentEl = currentEl
    }
  } while (currentEl != null && !nodeTest(currentEl))

  return parentEl
}

function getChartEl (drawingEl) {
  let parentEl = drawingEl.parentNode

  const inlineEl = nodeListToArray(drawingEl.childNodes).find((el) => el.nodeName === 'wp:inline')

  if (!inlineEl) {
    return
  }

  const graphicEl = nodeListToArray(inlineEl.childNodes).find((el) => el.nodeName === 'a:graphic')

  if (!graphicEl) {
    return
  }

  const graphicDataEl = nodeListToArray(graphicEl.childNodes).find(el => el.nodeName === 'a:graphicData')

  if (!graphicDataEl) {
    return
  }

  let chartDrawingEl = nodeListToArray(graphicDataEl.childNodes).find(el => (
    el.nodeName === 'c:chart' || el.nodeName === 'cx:chart'
  ))

  if (!chartDrawingEl) {
    return
  }

  while (parentEl != null) {
    // ignore charts that are part of Fallback tag
    if (parentEl.nodeName === 'mc:Fallback') {
      chartDrawingEl = null
      break
    }

    parentEl = parentEl.parentNode
  }

  return chartDrawingEl
}

function getCellInfo (cellEl, sharedStringsEls, sheetFilepath) {
  let type
  let value
  let contentEl
  const extra = {}

  if (cellEl.childNodes.length === 0) {
    return
  }

  const explicitType = cellEl.getAttribute('t')
  const childEls = nodeListToArray(cellEl.childNodes)

  if (explicitType != null && explicitType !== '') {
    type = explicitType

    switch (explicitType) {
      case 'b':
      case 'd':
      case 'n': {
        const vEl = childEls.find((el) => el.nodeName === 'v')

        if (vEl != null) {
          value = vEl.textContent
          contentEl = vEl
        }

        break
      }
      case 'inlineStr': {
        const isEl = childEls.find((el) => el.nodeName === 'is')
        let tEl

        if (isEl != null) {
          tEl = nodeListToArray(isEl.childNodes).find((el) => el.nodeName === 't')
        }

        if (tEl != null) {
          const textDetails = extractTextDetailsFromEl(isEl)
          const textDetailsStr = textDetails.getText()

          value = textDetailsStr
          extra.textDetails = textDetails
          contentEl = isEl
        }

        break
      }
      case 's': {
        const vEl = childEls.find((el) => el.nodeName === 'v')
        let sharedIndex

        if (vEl != null) {
          sharedIndex = parseInt(vEl.textContent, 10)
        }

        let sharedStringEl

        if (sharedIndex != null && !isNaN(sharedIndex)) {
          sharedStringEl = sharedStringsEls[sharedIndex]
        }

        if (sharedStringEl == null) {
          throw new Error(`Unable to find shared string with index ${sharedIndex}, sheet: ${sheetFilepath}`)
        }

        // the "t" node can be also wrapped in <si> and <r> when the text is styled
        // so we search for the first <t> node
        const tEl = sharedStringEl.getElementsByTagName('t')[0]

        if (tEl != null) {
          const textDetails = extractTextDetailsFromEl(sharedStringEl)
          const textDetailsStr = textDetails.getText()

          value = textDetailsStr
          extra.textDetails = textDetails
          contentEl = vEl
        }

        break
      }
      // we check for "e" because the xlsx can
      // contain formula with error
      case 'e':
      case 'str': {
        if (explicitType === 'e') {
          type = 'str'
        }

        const fEl = childEls.find((el) => el.nodeName === 'f')

        if (fEl != null) {
          value = fEl.textContent
          extra.formulaEl = fEl
          contentEl = fEl

          const vEl = childEls.find((el) => el.nodeName === 'v')

          if (vEl != null) {
            extra.cachedValue = vEl.textContent
          }
        } else {
          // field is error but no formula definition was found, so we can not
          // parse this
          return
        }

        break
      }
    }
  } else {
    // checking if the cell is inline string value
    const isEl = childEls.find((el) => el.nodeName === 'is')

    if (isEl != null) {
      const tEl = nodeListToArray(isEl.childNodes).find((el) => el.nodeName === 't')

      if (tEl != null) {
        const textDetails = extractTextDetailsFromEl(isEl)
        const textDetailsStr = textDetails.getText()

        type = 'inlineStr'
        value = textDetailsStr
        extra.textDetails = textDetails
        contentEl = isEl
      }
    }

    // now checking if the cell is formula value
    const fEl = childEls.find((el) => el.nodeName === 'f')

    if (type == null && fEl != null) {
      type = 'str'
      value = fEl.textContent
      extra.formulaEl = fEl
      contentEl = fEl

      const vEl = childEls.find((el) => el.nodeName === 'v')

      if (vEl != null) {
        extra.cachedValue = vEl.textContent
      }
    }

    const vEl = childEls.find((el) => el.nodeName === 'v')
    const excelNumberAndDecimalRegExp = /^-?\d+(\.\d+)?(E-\d+)?$/

    // finally checking if the cell is number value
    if (type == null && vEl != null && excelNumberAndDecimalRegExp.test(vEl.textContent)) {
      type = 'n'
      value = vEl.textContent
      contentEl = vEl
    }
  }

  if (value == null) {
    throw new Error(`Expected value to be found in cell, sheet: ${sheetFilepath}`)
  }

  return {
    type,
    value,
    extra,
    contentEl
  }
}

function extractTextDetailsFromEl (targetEl) {
  const results = []
  const stack = []
  let richTextFound = false

  const clonedTargetEl = targetEl.cloneNode(true)
  const childEls = nodeListToArray(clonedTargetEl.childNodes)

  for (const childEl of childEls) {
    stack.push(childEl)
  }

  while (stack.length) {
    const el = stack.shift()

    // check if the element is different than element
    if (el.nodeType !== 1) {
      continue
    }

    if (el.nodeName === 't') {
      const shouldPreserveSpace = el.getAttribute('xml:space') === 'preserve'
      const childEls = nodeListToArray(el.childNodes)

      for (const childEl of childEls) {
        // check if the element is different than text node
        if (childEl.nodeType !== 3) {
          continue
        }

        let text = childEl.nodeValue ?? ''

        if (!shouldPreserveSpace) {
          text = text.trim()
        }

        results.push({
          text,
          tEl: el
        })
      }
    } else if (el.nodeName === 'r') {
      const childEls = nodeListToArray(el.childNodes)

      for (const childEl of childEls) {
        if (childEl.nodeName !== 't') {
          continue
        }

        richTextFound = true

        stack.unshift(childEl)
      }
    }
  }

  return {
    [Symbol.iterator]: () => results.values(),
    hasRichText: () => richTextFound,
    hasText: () => results.length > 0,
    getContentElements: () => {
      const childNodes = nodeListToArray(clonedTargetEl.childNodes)
      const result = []

      for (const childNode of childNodes) {
        // we only care about pure text content, skip the rest (Phonetic Run, Phonetic Properties)
        if (childNode.nodeName !== 't' && childNode.nodeName !== 'r') {
          continue
        }

        result.push(childNode.cloneNode(true))
      }

      return result
    },
    getText: () => {
      let str = ''

      for (const item of results) {
        str += item.text
      }

      return str
    }
  }
}

function getSheetInfo (_sheetPath, workbookSheetsEls, workbookRelsEls) {
  const sheetPath = _sheetPath.startsWith('xl/') ? _sheetPath.replace(/^xl\//, '') : _sheetPath

  const sheetRefEl = workbookRelsEls.find((el) => (
    el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet' &&
    el.getAttribute('Target') === sheetPath
  ))

  if (sheetRefEl == null) {
    return
  }

  const sheetEl = workbookSheetsEls.find((el) => el.getAttribute('r:id') === sheetRefEl.getAttribute('Id'))

  if (sheetEl == null) {
    return
  }

  return {
    id: sheetEl.getAttribute('sheetId'),
    name: sheetEl.getAttribute('name'),
    rId: sheetRefEl.getAttribute('Id'),
    path: sheetPath
  }
}

function getStyleFile (files) {
  const workbookRelsDoc = files.find((file) => file.path === 'xl/_rels/workbook.xml.rels')?.doc

  if (workbookRelsDoc == null) {
    return
  }

  const workbookRelsEls = nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship'))

  const styleRel = workbookRelsEls.find((el) => el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles')

  if (styleRel == null) {
    return
  }

  const stylePath = path.posix.join(path.posix.dirname('xl/workbook.xml'), styleRel.getAttribute('Target'))
  const stylesFile = files.find((file) => file.path === stylePath)

  if (stylesFile == null) {
    return
  }

  return stylesFile
}

function getStyleInfo (styleDoc) {
  if (styleDoc == null) {
    return
  }

  const cellXfsEls = nodeListToArray(styleDoc.getElementsByTagName('cellXfs')[0]?.getElementsByTagName('xf'))
  const cellStyleXfsEls = nodeListToArray(styleDoc.getElementsByTagName('cellStyleXfs')[0]?.getElementsByTagName('xf'))
  const fontEls = nodeListToArray(styleDoc.getElementsByTagName('fonts')[0]?.getElementsByTagName('font'))

  return {
    doc: styleDoc,
    cellXfsEls,
    cellStyleXfsEls,
    fontEls
  }
}

function isWorksheetFile (filePath) {
  return path.posix.dirname(filePath) === 'xl/worksheets' && filePath.endsWith('.xml')
}

function isWorksheetRelsFile (sheetFilename, filePath) {
  return filePath === `xl/worksheets/_rels/${sheetFilename}.rels`
}

const dataHelperName = '_D'

function getDataHelperCall (type, props, { isBlock = true, valuePart = '', content, asPart = '' } = {}) {
  let callStr = `{{${isBlock ? '#' : ''}${dataHelperName}`
  const targetProps = props || {}
  const keys = Object.keys(targetProps)

  // we dont check for the type of valuePart, because we want to allow to pass literals too
  if (valuePart != null && valuePart !== '') {
    callStr += ` ${valuePart}`
  }

  callStr += ` t='${type}'`

  for (const key of keys) {
    const value = targetProps[key]

    if (value == null) {
      continue
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      callStr += ` ${key}=${value}`
    } else {
      callStr += ` ${key}='${value}'`
    }
  }

  if (asPart != null && asPart !== '') {
    callStr += ` ${asPart}`
  }

  callStr += '}}'

  const endCall = getDataHelperBlockEndCall()

  if (isBlock && content != null) {
    callStr += `${content}${endCall}`
  }

  return callStr
}

function getDataHelperBlockEndCall () {
  return `{{/${dataHelperName}}}`
}

function normalizeAttributeAndTextNodeForHandlebars (node) {
  if (node.nodeType === 2 && node.nodeValue && node.nodeValue.includes('{{')) {
    // we need to decode the xml entities for the attributes for handlebars to work ok
    const str = new XMLSerializer().serializeToString(node)
    return decodeXML(str)
  } else if (
    // we need to decode the xml entities in text nodes for handlebars to work ok with partials
    node.nodeType === 3 && node.nodeValue &&
    (node.nodeValue.includes('{{>') || node.nodeValue.includes('{{#>'))
  ) {
    const str = new XMLSerializer().serializeToString(node)

    return str.replace(/{{#?&gt;/g, (m) => {
      return decodeXML(m)
    })
  }

  return node
}

function serializeXmlAsHandlebarsSafeOutput (docOrNode) {
  return new XMLSerializer().serializeToString(
    docOrNode,
    undefined,
    normalizeAttributeAndTextNodeForHandlebars
  )
}

module.exports.contentIsXML = (content) => {
  if (!Buffer.isBuffer(content) && typeof content !== 'string') {
    return false
  }

  const str = content.toString()

  return str.startsWith('<?xml') || (/^\s*<[\s\S]*>/).test(str)
}

module.exports.pxToEMU = (val) => {
  return Math.round(val * 914400 / 96)
}

module.exports.cmToEMU = (val) => {
  // cm to dxa
  // eslint-disable-next-line no-loss-of-precision
  const dxa = val * 567.058823529411765
  // dxa to EMU
  return Math.round(dxa * 914400 / 72 / 20)
}

module.exports.encodeXML = encodeXML
module.exports.decodeXML = decodeXML
module.exports.parseXML = parseXML
module.exports.serializeXml = (doc) => new XMLSerializer().serializeToString(doc).replace(/ xmlns(:[a-z0-9]+)?=""/g, '')
module.exports.serializeXmlAsHandlebarsSafeOutput = serializeXmlAsHandlebarsSafeOutput
module.exports.getNewRelId = getNewRelId
module.exports.getNewRelIdFromBaseId = getNewRelIdFromBaseId
module.exports.getNewIdFromBaseId = getNewIdFromBaseId
module.exports.getChartEl = getChartEl
module.exports.getCellInfo = getCellInfo
module.exports.getClosestEl = getClosestEl
module.exports.getSheetInfo = getSheetInfo
module.exports.getStyleFile = getStyleFile
module.exports.getStyleInfo = getStyleInfo
module.exports.findOrCreateChildNode = findOrCreateChildNode
module.exports.findChildNode = findChildNode
module.exports.recreateNodeWithNewDoc = recreateNodeWithNewDoc
module.exports.nodeListToArray = nodeListToArray
module.exports.isWorksheetFile = isWorksheetFile
module.exports.isWorksheetRelsFile = isWorksheetRelsFile
module.exports.getDataHelperCall = getDataHelperCall
module.exports.getDataHelperBlockEndCall = getDataHelperBlockEndCall
