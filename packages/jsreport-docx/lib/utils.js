const path = require('path')
const { XMLSerializer } = require('@xmldom/xmldom')

function nodeListToArray (nodes) {
  const arr = []
  for (let i = 0; i < nodes.length; i++) {
    arr.push(nodes[i])
  }
  return arr
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

function getHeaderFooterDocs (headerFooterReferences, documentFilePath, documentRelsDoc, files) {
  const result = []
  const relationshipEls = nodeListToArray(documentRelsDoc.getElementsByTagName('Relationship'))

  for (const { type, referenceEl } of headerFooterReferences) {
    const rid = referenceEl.getAttribute('r:id')

    const relationshipEl = relationshipEls.find(r => (
      r.getAttribute('Id') === rid &&
      r.getAttribute('Type') === `http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}`
    ))

    if (relationshipEl == null) {
      continue
    }

    const referenceFilePath = path.posix.join(path.posix.dirname(documentFilePath), relationshipEl.getAttribute('Target'))
    const resolvedDoc = files.find((file) => file.path === referenceFilePath)?.doc

    if (resolvedDoc == null) {
      continue
    }

    result.push({ type, doc: resolvedDoc, referenceEl })
  }

  return result
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

  if (targetType !== 'parent' && targetType !== 'previous') {
    throw new Error(`Invalid target type "${targetType}"`)
  }

  do {
    if (targetType === 'parent') {
      currentEl = currentEl.parentNode
    } else if (targetType === 'previous') {
      currentEl = currentEl.previousSibling
    }

    if (currentEl != null && nodeTest(currentEl)) {
      parentEl = currentEl
    }
  } while (currentEl != null && !nodeTest(currentEl))

  return parentEl
}

function clearEl (el, filterFn) {
  // by default we clear all children
  const testFn = filterFn || (() => false)
  const childEls = nodeListToArray(el.childNodes)

  for (const childEl of childEls) {
    const result = testFn(childEl)

    if (result === true) {
      continue
    }

    childEl.parentNode.removeChild(childEl)
  }
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

function findChildNode (nodeNameOrFn, targetNode, allNodes = false) {
  const result = []

  let testFn

  if (typeof nodeNameOrFn === 'string') {
    testFn = (n) => n.nodeName === nodeNameOrFn
  } else {
    testFn = nodeNameOrFn
  }

  for (let i = 0; i < targetNode.childNodes.length; i++) {
    let found = false
    const childNode = targetNode.childNodes[i]
    const testResult = testFn(childNode)

    if (testResult) {
      found = true
      result.push(childNode)
    }

    if (found && !allNodes) {
      break
    }
  }

  return allNodes ? result : result[0]
}

function createNode (doc, name, opts = {}) {
  const attributes = opts.attributes || {}
  const children = opts.children || []
  const newEl = doc.createElement(name)

  for (const [attrName, attrValue] of Object.entries(attributes)) {
    newEl.setAttribute(attrName, attrValue)
  }

  for (const child of children) {
    newEl.appendChild(child)
  }

  return newEl
}

function pxToEMU (val) {
  return Math.round(val * 914400 / 96)
}

function cmToEMU (val) {
  // cm to dxa
  // eslint-disable-next-line no-loss-of-precision
  const dxa = val * 567.058823529411765
  // dxa to EMU
  return Math.round(dxa * 914400 / 72 / 20)
}

function pxToPt (val) {
  if (typeof val !== 'number') {
    return null
  }

  return val * 72 / 96
}

function ptToHalfPoint (val) {
  if (typeof val !== 'number') {
    return null
  }

  return val * 2
}

// pt to twentieths of a point (dxa)
function ptToTOAP (val) {
  if (typeof val !== 'number') {
    return null
  }

  return val * 20
}

function lengthToPx (value) {
  if (!value) {
    return null
  }

  if (typeof value === 'number') {
    return value
  }

  const pt = value.match(/([.\d]+)pt/i)

  if (pt && pt.length === 2) {
    return parseFloat(pt[1], 10) * 96 / 72
  }

  const em = value.match(/([.\d]+)r?em/i)

  if (em && em.length === 2) {
    return parseFloat(em[1], 10) * 16
  }

  let px = value.match(/([.\d]+)px/i)

  if (px && px.length === 2) {
    return parseFloat(px[1], 10)
  }

  const pe = value.match(/([.\d]+)%/i)

  if (pe && pe.length === 2) {
    return (parseFloat(pe[1], 10) / 100) * 16
  }

  // if no unit is specified and number, assume px
  px = value.match(/([.\d]+)/i)

  if (px && px.length === 2) {
    return parseFloat(px[1], 10)
  }

  return null
}

module.exports.findDefaultStyleIdForName = (stylesDoc, name, type = 'paragraph') => {
  const styleEls = nodeListToArray(stylesDoc.getElementsByTagName('w:style'))

  const styleEl = styleEls.find((styleEl) => {
    const wNameEl = nodeListToArray(styleEl.childNodes).find((el) => el.nodeName === 'w:name')

    return (
      styleEl.getAttribute('w:type') === type &&
      wNameEl != null &&
      wNameEl.getAttribute('w:val') === name
    )
  })

  if (!styleEl) {
    return
  }

  return styleEl.getAttribute('w:styleId')
}

module.exports.contentIsXML = (content) => {
  if (!Buffer.isBuffer(content) && typeof content !== 'string') {
    return false
  }

  const str = content.toString()

  return str.startsWith('<?xml') || (/^\s*<[\s\S]*>/).test(str)
}

module.exports.lengthToPt = (value) => {
  const sizeInPx = lengthToPx(value)

  if (sizeInPx == null) {
    return sizeInPx
  }

  return pxToPt(sizeInPx)
}

module.exports.pxToEMU = pxToEMU
module.exports.cmToEMU = cmToEMU
module.exports.ptToHalfPoint = ptToHalfPoint
module.exports.ptToTOAP = ptToTOAP
module.exports.serializeXml = (doc) => new XMLSerializer().serializeToString(doc).replace(/ xmlns(:[a-z0-9]+)?=""/g, '')
module.exports.getNewRelId = getNewRelId
module.exports.getNewRelIdFromBaseId = getNewRelIdFromBaseId
module.exports.getNewIdFromBaseId = getNewIdFromBaseId
module.exports.getChartEl = getChartEl
module.exports.getHeaderFooterDocs = getHeaderFooterDocs
module.exports.getClosestEl = getClosestEl
module.exports.clearEl = clearEl
module.exports.findOrCreateChildNode = findOrCreateChildNode
module.exports.findChildNode = findChildNode
module.exports.createNode = createNode
module.exports.nodeListToArray = nodeListToArray
