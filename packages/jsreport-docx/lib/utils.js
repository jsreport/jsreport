const path = require('path')
const escapeStringRegexp = require('escape-string-regexp')
const { XMLSerializer } = require('@xmldom/xmldom')
const { createIdManager } = require('./idManager')

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

function getNewRelIdFromBaseId (relsDoc, itemsMap, baseRelId) {
  const getNumberId = (id) => {
    const regExp = /^rId(\d+)$/
    const match = regExp.exec(id)

    if (!match || !match[1]) {
      return null
    }

    return parseInt(match[1], 10)
  }

  const documentRelsIdManager = createIdManager('documentRels', {
    fromItems: {
      getIds: () => nodeListToArray(relsDoc.getElementsByTagName('Relationship')).map((el) => el.getAttribute('Id')),
      getNumberId
    }
  })

  const baseIdNum = getNumberId(baseRelId)

  if (baseIdNum == null) {
    throw new Error(`Unable to get numeric id from rel id "${baseRelId}"`)
  }

  const newNumId = getNewIdFromBaseId(itemsMap, baseIdNum, documentRelsIdManager.last.numId)

  return `rId${newNumId}`
}

function getNewIdFromBaseId (itemsMap, baseId, maxId) {
  const counter = itemsMap.get(baseId) || 0

  itemsMap.set(baseId, counter + 1)

  if (counter === 0) {
    return baseId
  }

  return maxId + 1
}

function getPictureElInfo (drawingEl) {
  const els = []
  let wpExtentEl

  if (isDrawingPicture(drawingEl)) {
    const wpDocPrEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:docPr')
    let linkInDrawing

    wpExtentEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:extent')

    if (wpDocPrEl) {
      linkInDrawing = nodeListToArray(wpDocPrEl.childNodes).find((el) => el.nodeName === 'a:hlinkClick')
    }

    if (linkInDrawing) {
      els.push(linkInDrawing)
    }
  }

  const pictureEl = findDirectPictureChild(drawingEl)

  if (!pictureEl) {
    return {
      picture: undefined,
      wpExtent: undefined,
      links: els
    }
  }

  const linkInPicture = pictureEl.getElementsByTagName('a:hlinkClick')[0]

  if (linkInPicture) {
    els.push(linkInPicture)
  }

  return {
    picture: pictureEl,
    wpExtent: wpExtentEl,
    links: els
  }
}

function isDrawingPicture (drawingEl) {
  const graphicEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'a:graphic')

  if (!graphicEl) {
    return false
  }

  const graphicDataEl = nodeListToArray(graphicEl.childNodes).find((el) => el.nodeName === 'a:graphicData' && el.getAttribute('uri') === 'http://schemas.openxmlformats.org/drawingml/2006/picture')

  if (!graphicDataEl) {
    return false
  }

  const pictureEl = nodeListToArray(graphicDataEl.childNodes).find((el) => el.nodeName === 'pic:pic')

  if (!pictureEl) {
    return false
  }

  return true
}

function findDirectPictureChild (parentNode) {
  const childNodes = parentNode.childNodes || []
  let pictureEl

  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i]

    if (child.nodeName === 'w:drawing') {
      break
    }

    if (child.nodeName === 'pic:pic') {
      pictureEl = child
      break
    }

    const foundInChild = findDirectPictureChild(child)

    if (foundInChild) {
      pictureEl = foundInChild
      break
    }
  }

  return pictureEl
}

function getPictureCnvPrEl (pictureEl) {
  const nvPicPrEl = nodeListToArray(pictureEl.childNodes).find((el) => el.nodeName === 'pic:nvPicPr')

  if (!nvPicPrEl) {
    return
  }

  const cnvPrEl = nodeListToArray(nvPicPrEl.childNodes).find((el) => el.nodeName === 'pic:cNvPr')

  return cnvPrEl
}

function getDocPrEl (drawingEl) {
  const docPrEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:docPr')

  if (!docPrEl) {
    return
  }

  return docPrEl
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

    const filename = path.posix.basename(referenceFilePath)
    const relsFile = files.find(f => f.path === `word/_rels/${filename}.rels`)

    result.push({
      type,
      doc: resolvedDoc,
      relsDoc: relsFile?.doc,
      path: referenceFilePath,
      filename,
      name: filename.endsWith('.xml') ? path.posix.basename(filename, '.xml') : filename,
      referenceEl
    })
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
  const properties = opts.properties || {}
  const children = opts.children || []
  const newEl = doc.createElement(name)

  for (const [attrName, attrValue] of Object.entries(attributes)) {
    newEl.setAttribute(attrName, attrValue)
  }

  for (const [propName, propValue] of Object.entries(properties)) {
    newEl[propName] = propValue
  }

  for (const child of children) {
    newEl.appendChild(child)
  }

  return newEl
}

function getDimension (value, opts = {}) {
  const units = Array.isArray(opts.units) ? [...opts.units] : ['px', 'cm']

  if (units.length === 0) {
    units.push('px')
  }

  const defaultUnit = opts.defaultUnit
  const numberRegExp = /^(\d+(.\d+)?)/
  const dimensionRegExp = new RegExp(`^(\\d+(.\\d+)?)(${units.map((u) => escapeStringRegexp(u)).join('|')})?$`)
  const dimensionMatch = dimensionRegExp.exec(value)

  if (dimensionMatch) {
    let unit

    if (defaultUnit == null && dimensionMatch[3] == null) {
      return null
    }

    if (dimensionMatch[3] == null && defaultUnit != null) {
      unit = defaultUnit
    } else {
      unit = dimensionMatch[3]
    }

    return {
      value: parseFloat(dimensionMatch[1]),
      unit: unit
    }
  } else if (defaultUnit != null) {
    const numberMatch = numberRegExp.exec(value)

    if (numberMatch) {
      return {
        value: parseFloat(numberMatch[1]),
        unit: defaultUnit
      }
    }
  }

  return null
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

// emu to twentieths of a point (dxa)
function emuToTOAP (val) {
  return (val / 914400) * 72 * 20
}

// pt to twentieths of a point (dxa)
function ptToTOAP (val) {
  if (typeof val !== 'number') {
    return null
  }

  return val * 20
}

// pt to eighths of a point
function ptToEOAP (val) {
  if (typeof val !== 'number') {
    return null
  }

  return val * 8
}

function lengthToPx (value) {
  if (value == null) {
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

function createNewRAndTextNode (textOrOptions, templateRNode, doc) {
  const text = typeof textOrOptions === 'string' ? textOrOptions : textOrOptions.text
  const attributes = typeof textOrOptions === 'string' ? {} : (textOrOptions.attributes || {})
  const newRNode = templateRNode.cloneNode(true)
  const textEl = doc.createElement('w:t')

  textEl.setAttribute('xml:space', 'preserve')

  for (const [attrName, attrValue] of Object.entries(attributes)) {
    textEl.setAttribute(attrName, attrValue)
  }

  textEl.textContent = text
  newRNode.appendChild(textEl)
  return [newRNode, textEl]
}

/**
 * decodes a URI from a value that was encoded multiple times
 *
 * MS programs (PowerPoint, etc) in some cases can encode a string multiple times,
 * the final value stored in xml can be a string that was encoded multiple times.
 * for example `{{linkURL}}` string is encoded as `%25252525257B%25252525257BlinkURL%25252525257D%25252525257D` which indicates
 * that the value was encoded multiple times, so as a workaround in this function we decode
 * recursively until the decode no longer returns different string
 */
function decodeURIComponentRecursive (str) {
  let decoded = decodeURIComponent(str)

  // return fast if the string is not encoded
  if (decoded === str) {
    return str
  }

  while (decoded !== str) {
    str = decoded
    decoded = decodeURIComponent(str)
  }

  return decoded
}

module.exports.normalizeSingleTextElInRun = (textEl, doc) => {
  const rEl = getClosestEl(textEl, 'w:r')

  if (rEl == null) {
    return
  }

  const textElements = nodeListToArray(rEl.childNodes).filter((n) => n.nodeName === 'w:t')
  const leftTextNodes = []
  const rightTextNodes = []

  let found = false

  for (const tEl of textElements) {
    if (tEl === textEl) {
      found = true
    } else if (found) {
      rightTextNodes.push(tEl)
    } else {
      leftTextNodes.push(tEl)
    }
  }

  const templateRNode = rEl.cloneNode(true)

  // remove text elements and inherit the rest
  clearEl(templateRNode, (c) => c.nodeName !== 'w:t')

  const results = []

  for (const tNode of leftTextNodes) {
    const [newRNode, newTextNode] = createNewRAndTextNode(tNode.textContent, templateRNode, doc)
    rEl.removeChild(tNode)
    rEl.parentNode.insertBefore(newRNode, rEl)
    results.push(newTextNode)
  }

  results.push(textEl)

  for (const tNode of [...rightTextNodes].reverse()) {
    const [newRNode, newTextNode] = createNewRAndTextNode(tNode.textContent, templateRNode, doc)
    rEl.removeChild(tNode)
    rEl.parentNode.insertBefore(newRNode, rEl.nextSibling)
    results.push(newTextNode)
  }

  return results
}

module.exports.normalizeSingleContentInText = (textEl, getMatchRegexp, doc) => {
  const rEl = getClosestEl(textEl, 'w:r')
  const paragraphEl = getClosestEl(textEl, 'w:p')

  if (rEl == null || paragraphEl == null) {
    return
  }

  let newContent = textEl.textContent
  const textParts = []
  const matchParts = []
  let match

  do {
    match = newContent.match(getMatchRegexp())

    if (match != null) {
      const leftContent = newContent.slice(0, match.index)

      if (leftContent !== '') {
        textParts.push(leftContent)
      }

      const matchInfo = {
        content: match[0],
        rest: match.slice(1)
      }

      textParts.push(matchInfo)
      matchParts.push(matchInfo)

      newContent = newContent.slice(match.index + match[0].length)
    }
  } while (match != null)

  if (newContent !== '') {
    textParts.push(newContent)
  }

  const templateRNode = rEl.cloneNode(true)

  // remove text elements and inherit the rest
  clearEl(templateRNode, (c) => c.nodeName !== 'w:t')

  const results = []

  for (const item of textParts) {
    const isMatchInfo = typeof item !== 'string'
    const textContent = isMatchInfo ? item.content : item

    const [newRNode, newTextNode] = createNewRAndTextNode(textContent, templateRNode, doc)
    rEl.parentNode.insertBefore(newRNode, rEl)

    const result = {
      tEl: newTextNode
    }

    if (isMatchInfo) {
      result.match = item
    }

    results.push(result)
  }

  rEl.parentNode.removeChild(rEl)

  return results
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

function processOpeningTag (doc, refElement, helperCall) {
  const fakeElement = doc.createElement('docxRemove')
  fakeElement.textContent = helperCall
  refElement.parentNode.insertBefore(fakeElement, refElement)
  return fakeElement
}

function processClosingTag (doc, refElement, closeCall) {
  const fakeElement = doc.createElement('docxRemove')
  fakeElement.textContent = closeCall
  refElement.parentNode.insertBefore(fakeElement, refElement.nextSibling)
  return fakeElement
}

function getSectionEl (pEl) {
  let currentEl

  if (pEl.parentNode.nodeName !== 'w:body') {
    currentEl = getClosestEl(pEl, (n) => (
      n.parentNode.nodeName === 'w:body'
    ))
  } else {
    currentEl = pEl
  }

  let sectionPrEl

  while (sectionPrEl == null) {
    if (currentEl.nodeName === 'w:p') {
      const pPrEl = findChildNode('w:pPr', currentEl)

      if (pPrEl) {
        sectionPrEl = findChildNode('w:sectPr', pPrEl)
      }
    } else if (currentEl.nodeName === 'w:sectPr') {
      sectionPrEl = currentEl
    }

    if (sectionPrEl == null) {
      currentEl = currentEl.nextSibling
    }
  }

  return sectionPrEl
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

module.exports.getDimension = getDimension
module.exports.pxToEMU = pxToEMU
module.exports.cmToEMU = cmToEMU
module.exports.emuToTOAP = emuToTOAP
module.exports.ptToHalfPoint = ptToHalfPoint
module.exports.ptToTOAP = ptToTOAP
module.exports.ptToEOAP = ptToEOAP

module.exports.serializeXml = (doc, removeAll = false) => {
  const xml = new XMLSerializer().serializeToString(doc)
  let targetRegExp = / xmlns(:[a-z0-9]+)?=""/g

  if (removeAll) {
    targetRegExp = / xmlns(:[a-z0-9]+)?="[^"]*"/g
  }

  return xml.replace(targetRegExp, '')
}

module.exports.getNewRelId = getNewRelId
module.exports.getNewRelIdFromBaseId = getNewRelIdFromBaseId
module.exports.getNewIdFromBaseId = getNewIdFromBaseId
module.exports.getDocPrEl = getDocPrEl
module.exports.getPictureElInfo = getPictureElInfo
module.exports.getPictureCnvPrEl = getPictureCnvPrEl
module.exports.getChartEl = getChartEl
module.exports.getHeaderFooterDocs = getHeaderFooterDocs
module.exports.getClosestEl = getClosestEl
module.exports.clearEl = clearEl
module.exports.findOrCreateChildNode = findOrCreateChildNode
module.exports.findChildNode = findChildNode
module.exports.createNode = createNode
module.exports.nodeListToArray = nodeListToArray
module.exports.decodeURIComponentRecursive = decodeURIComponentRecursive
module.exports.processOpeningTag = processOpeningTag
module.exports.processClosingTag = processClosingTag
module.exports.getSectionEl = getSectionEl
