const { XMLSerializer } = require('@xmldom/xmldom')

function nodeListToArray (nodes) {
  const arr = []
  for (let i = 0; i < nodes.length; i++) {
    arr.push(nodes[i])
  }
  return arr
}

function getDimension (value) {
  const regexp = /^(\d+(.\d+)?)(cm|px)$/
  const match = regexp.exec(value)

  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[3]
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

function getCNvPrEl (graphicFrameEl) {
  const containerEl = nodeListToArray(graphicFrameEl.childNodes).find((node) => node.nodeName === 'p:nvGraphicFramePr')

  if (!containerEl) {
    return
  }

  const cNvPrEl = nodeListToArray(containerEl.childNodes).find((node) => node.nodeName === 'p:cNvPr')

  return cNvPrEl
}

function getChartEl (graphicFrameEl) {
  let parentEl = graphicFrameEl.parentNode

  const graphicEl = nodeListToArray(graphicFrameEl.childNodes).find((node) => node.nodeName === 'a:graphic')

  if (!graphicEl) {
    return
  }

  const graphicDataEl = nodeListToArray(graphicEl.childNodes).find((node) => node.nodeName === 'a:graphicData')

  if (!graphicDataEl) {
    return
  }

  let chartDrawingEl = nodeListToArray(graphicDataEl.childNodes).find((node) => (
    node.nodeName === 'c:chart' || node.nodeName === 'cx:chart'
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

function createNewRAndTextNode (textOrOptions, templateRNode, doc) {
  const text = typeof textOrOptions === 'string' ? textOrOptions : textOrOptions.text
  const attributes = typeof textOrOptions === 'string' ? {} : (textOrOptions.attributes || {})
  const newRNode = templateRNode.cloneNode(true)
  const textEl = doc.createElement('a:t')

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
  const rEl = getClosestEl(textEl, 'a:r')

  if (rEl == null) {
    return
  }

  const textElements = nodeListToArray(rEl.childNodes).filter((n) => n.nodeName === 'a:t')
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
  clearEl(templateRNode, (c) => c.nodeName !== 'a:t')

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
  const rEl = getClosestEl(textEl, 'a:r')
  const paragraphEl = getClosestEl(textEl, 'a:p')

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
  clearEl(templateRNode, (c) => c.nodeName !== 'a:t')

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

module.exports.contentIsXML = (content) => {
  if (!Buffer.isBuffer(content) && typeof content !== 'string') {
    return false
  }

  const str = content.toString()

  return str.startsWith('<?xml') || (/^\s*<[\s\S]*>/).test(str)
}

module.exports.serializeXml = (doc) => new XMLSerializer().serializeToString(doc).replace(/ xmlns(:[a-z0-9]+)?=""/g, '')

module.exports.nodeListToArray = nodeListToArray
module.exports.getDimension = getDimension
module.exports.pxToEMU = pxToEMU
module.exports.cmToEMU = cmToEMU
module.exports.getNewRelIdFromBaseId = getNewRelIdFromBaseId
module.exports.getNewIdFromBaseId = getNewIdFromBaseId
module.exports.getCNvPrEl = getCNvPrEl
module.exports.getChartEl = getChartEl
module.exports.clearEl = clearEl
module.exports.findOrCreateChildNode = findOrCreateChildNode
module.exports.findChildNode = findChildNode
module.exports.decodeURIComponentRecursive = decodeURIComponentRecursive
