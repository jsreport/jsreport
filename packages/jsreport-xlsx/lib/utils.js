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
module.exports.getCellInfo = getCellInfo
module.exports.getClosestEl = getClosestEl
module.exports.getSheetInfo = getSheetInfo
module.exports.getStyleFile = getStyleFile
module.exports.getStyleInfo = getStyleInfo
module.exports.findOrCreateChildNode = findOrCreateChildNode
module.exports.findChildNode = findChildNode
module.exports.nodeListToArray = nodeListToArray
module.exports.isWorksheetFile = isWorksheetFile
module.exports.isWorksheetRelsFile = isWorksheetRelsFile
