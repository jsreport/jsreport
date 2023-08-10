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

function isWorksheetFile (filePath) {
  return path.posix.dirname(filePath) === 'xl/worksheets' && filePath.endsWith('.xml')
}

function isWorksheetRelsFile (sheetFilename, filePath) {
  return filePath === `xl/worksheets/_rels/${sheetFilename}.rels`
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

module.exports.serializeXml = (doc) => new XMLSerializer().serializeToString(doc).replace(/ xmlns(:[a-z0-9]+)?=""/g, '')
module.exports.getNewRelId = getNewRelId
module.exports.getNewRelIdFromBaseId = getNewRelIdFromBaseId
module.exports.getNewIdFromBaseId = getNewIdFromBaseId
module.exports.getChartEl = getChartEl
module.exports.getClosestEl = getClosestEl
module.exports.getSheetInfo = getSheetInfo
module.exports.findOrCreateChildNode = findOrCreateChildNode
module.exports.findChildNode = findChildNode
module.exports.nodeListToArray = nodeListToArray
module.exports.isWorksheetFile = isWorksheetFile
module.exports.isWorksheetRelsFile = isWorksheetRelsFile
