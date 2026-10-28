const { evaluateCellRefsFromExpression, getFontSizeFromStyle, getPixelWidthOfValue } = require('../../../cellUtils')
const { nodeListToArray } = require('../../../utils')
const parseHbsText = require('./parseHbsText')

module.exports.createParseCell = createParseCell
module.exports.getCellInfo = getCellInfo

function createParseCell (sheetInfo, styleInfo, parsedCells, dynamicParts) {
  return function parseCell (parsedCellRef, cellInfo, styleId, opts) {
    const cellRef = `${parsedCellRef.letter}${parsedCellRef.rowNumber}`
    let calculateWidthSize = opts.calculateWidthSize

    const parsedCell = {
      // start with the cell as static
      type: 'static',
      letter: parsedCellRef.letter,
      columnNumber: parsedCellRef.columnNumber
    }

    parsedCells.set(cellRef, parsedCell)

    let blockPartFound = false

    if (
      (cellInfo?.type === 'inlineStr' ||
      cellInfo?.type === 's')
    ) {
      const hbsParts = parseHbsText(sheetInfo, parsedCells, dynamicParts, parsedCellRef, cellInfo)

      if (hbsParts.length > 0) {
        parsedCell.type = 'dynamic'
        parsedCell.textDetails = cellInfo.extra.textDetails

        // we dont calculate the width size for cells with dynamic content
        // we are going to take into account these cells at runtime
        calculateWidthSize = false
      }

      if (opts.onHbsParts) {
        for (const hbsPart of hbsParts) {
          if (!blockPartFound) {
            blockPartFound = hbsPart.type === 'blockStart' || hbsPart.type === 'blockEnd'
          }

          opts.onHbsParts(hbsPart)
        }
      }
    } else if (
      cellInfo?.type === 'str'
    ) {
      const formula = {
        value: cellInfo.value
      }

      if (cellInfo.extra.formulaEl.hasAttributes()) {
        formula.attributes = new Map()

        const attributeList = Array.from(cellInfo.extra.formulaEl.attributes)

        for (const attr of attributeList) {
          formula.attributes.set(attr.name, attr.value)
        }
      }

      const isSharedFormula = (
        cellInfo.extra.formulaEl.getAttribute('t') === 'shared' &&
        cellInfo.extra.formulaEl.getAttribute('si') != null &&
        cellInfo.extra.formulaEl.getAttribute('si') !== ''
      )

      if (isSharedFormula) {
        const ref = cellInfo.extra.formulaEl.getAttribute('ref')

        formula.shared = {
          type: ref != null && ref !== '' ? 'source' : 'reference'
        }

        if (formula.shared.type === 'source') {
          formula.shared.sourceRef = cellInfo.extra.formulaEl.getAttribute('ref')
        }
      }

      const { refParts } = evaluateCellRefsFromExpression(formula.value)

      // the refs used in formula
      formula.refParts = refParts

      parsedCell.formula = formula
    }

    if (calculateWidthSize && opts.onWidthSize) {
      const fontSize = getFontSizeFromStyle(styleId, styleInfo)

      // for formulas we use the cached result of formula if exists
      const targetValue = cellInfo.type === 'str' ? cellInfo.extra.cachedValue : cellInfo.value

      if (targetValue != null) {
        const widthSize = getPixelWidthOfValue(targetValue, fontSize)
        opts.onWidthSize(widthSize)
      }
    }

    if (!blockPartFound && dynamicParts.openBlocks.length > 0) {
      const lastHbOpenBlock = dynamicParts.openBlocks.at(-1)
      lastHbOpenBlock.parts.push({ cellRef })
    }

    return parsedCell
  }
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
