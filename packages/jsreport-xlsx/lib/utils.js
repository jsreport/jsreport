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

function findOrCreateChildNode (docNode, nodeNameDef, targetNode) {
  let nodeName
  let beforeRefs

  if (Array.isArray(nodeNameDef)) {
    [nodeName, beforeRefs] = nodeNameDef
  } else {
    nodeName = nodeNameDef
  }

  let result
  const existingNode = findChildNode(nodeName, targetNode)

  if (!existingNode) {
    result = docNode.createElement(nodeName)

    let refNode

    if (beforeRefs) {
      const targetRefs = Array.isArray(beforeRefs) ? beforeRefs : [beforeRefs]

      for (let idx = targetRefs.length - 1; idx >= 0; idx--) {
        const ref = targetRefs[idx]
        refNode = findChildNode(ref, targetNode)

        if (refNode) {
          break
        }
      }
    }

    if (refNode) {
      targetNode.insertBefore(result, refNode.nextSibling)
    } else {
      targetNode.appendChild(result)
    }
  } else {
    result = existingNode
  }

  return result
}

function findChildNode (anyOfNodeName, targetNode, allNodes = false) {
  const targetNodeNames = Array.isArray(anyOfNodeName) ? anyOfNodeName : [anyOfNodeName]
  const result = []

  for (let i = 0; i < targetNode.childNodes.length; i++) {
    let found = false
    const childNode = targetNode.childNodes[i]

    if (targetNodeNames.includes(childNode.nodeName)) {
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

    if (typeof value === 'object') {
      callStr += ` ${key}=${value.value}`
    } else if (typeof value === 'number' || typeof value === 'boolean') {
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
  let targets = docOrNode

  if (!Array.isArray(docOrNode)) {
    targets = [docOrNode]
  }

  const output = []

  for (const target of targets) {
    output.push(new XMLSerializer().serializeToString(
      target,
      undefined,
      normalizeAttributeAndTextNodeForHandlebars
    ))
  }

  return output.join('')
}

function processOpeningTag (doc, refElement, helperCall) {
  const fakeElement = doc.createElement('xlsxRemove')
  fakeElement.textContent = helperCall

  if (refElement !== false) {
    refElement.parentNode.insertBefore(fakeElement, refElement)
  }

  return fakeElement
}

function processClosingTag (doc, refElement, closeCall) {
  const fakeElement = doc.createElement('xlsxRemove')
  fakeElement.textContent = closeCall

  if (refElement !== false) {
    refElement.parentNode.insertBefore(fakeElement, refElement.nextSibling)
  }

  return fakeElement
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
module.exports.getClosestEl = getClosestEl
module.exports.getStyleFile = getStyleFile
module.exports.findOrCreateChildNode = findOrCreateChildNode
module.exports.findChildNode = findChildNode
module.exports.recreateNodeWithNewDoc = recreateNodeWithNewDoc
module.exports.nodeListToArray = nodeListToArray
module.exports.processOpeningTag = processOpeningTag
module.exports.processClosingTag = processClosingTag
module.exports.isWorksheetFile = isWorksheetFile
module.exports.isWorksheetRelsFile = isWorksheetRelsFile
module.exports.getDataHelperCall = getDataHelperCall
module.exports.getDataHelperBlockEndCall = getDataHelperBlockEndCall
