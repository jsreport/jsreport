const path = require('path')
const { XMLSerializer } = require('@xmldom/xmldom')
const { col2num } = require('xlsx-coordinates')

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

function isWorksheetFile (filePath) {
  return path.posix.dirname(filePath) === 'xl/worksheets' && filePath.endsWith('.xml')
}

function isWorksheetRelsFile (sheetFilename, filePath) {
  return filePath === `xl/worksheets/_rels/${sheetFilename}.rels`
}

function parseCellRef (cellRef) {
  const cellRefRegexp = /^(\$?[A-Z]+)(\$?\d+)$/
  const matches = cellRef.match(cellRefRegexp)

  if (matches == null || matches[1] == null) {
    throw new Error(`"${cellRef}" is not a valid cell reference`)
  }

  const lockedColumn = matches[1].startsWith('$')
  const lockedRow = matches[2].startsWith('$')
  const letter = lockedColumn ? matches[1].slice(1) : matches[1]

  return {
    letter,
    lockedColumn,
    columnNumber: col2num(letter) + 1,
    lockedRow,
    rowNumber: parseInt(lockedRow ? matches[2].slice(1) : matches[2], 10)
  }
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
module.exports.nodeListToArray = nodeListToArray
module.exports.isWorksheetFile = isWorksheetFile
module.exports.isWorksheetRelsFile = isWorksheetRelsFile
module.exports.parseCellRef = parseCellRef
