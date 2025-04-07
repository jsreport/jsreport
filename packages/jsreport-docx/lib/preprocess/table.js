const { nodeListToArray, processOpeningTag, processClosingTag, getDimension, ptToTOAP } = require('../utils')
const regexp = /{{#?docxTable [^{}]{0,500}}}/

// the same idea as list, check the docs there
module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc
    const elements = nodeListToArray(doc.getElementsByTagName('w:t'))
    const openTags = []

    const tablesFoundMap = new Map()

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      if (el.textContent.includes('{{/docxTable}}') && openTags.length > 0) {
        const tag = openTags.pop()
        processTableClosingTag(doc, el, tag.mode === 'column')
      }

      if (
        (
          el.textContent.includes('{{docxTable') ||
          el.textContent.includes('{{#docxTable')
        ) &&
        el.textContent.includes('rows=') &&
        el.textContent.includes('columns=')
      ) {
        const isBlock = el.textContent.includes('{{#docxTable')
        // full table mode
        let helperCall = el.textContent.match(regexp)[0]

        if (!isBlock) {
          // setting the cell text to be the value for the rows (before we clone)
          el.textContent = el.textContent.replace(regexp, '{{this}}')
        } else {
          el.textContent = el.textContent.replace(regexp, '')
        }

        const paragraphNode = el.parentNode.parentNode

        let newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{#if @placeholderCell}}'

        paragraphNode.parentNode.insertBefore(newElement, paragraphNode)

        const emptyParagraphNode = paragraphNode.cloneNode(true)

        while (emptyParagraphNode.firstChild) {
          emptyParagraphNode.removeChild(emptyParagraphNode.firstChild)
          emptyParagraphNode.removeAttribute('__block_helper_container__')
        }

        paragraphNode.parentNode.insertBefore(emptyParagraphNode, paragraphNode)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{else}}'

        paragraphNode.parentNode.insertBefore(newElement, paragraphNode)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{/if}}'

        paragraphNode.parentNode.insertBefore(newElement, paragraphNode.nextSibling)

        const cellNode = paragraphNode.parentNode
        const cellPropertiesNode = nodeListToArray(cellNode.childNodes).find((node) => node.nodeName === 'w:tcPr')

        // insert conditional logic for colspan and rowspan
        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{#docxTable check="colspan"}}'

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('w:gridSpan')
        newElement.setAttribute('w:val', '{{this}}')

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{/docxTable}}'

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{#docxTable check="rowspan"}}'

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{#if @empty}}'

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('w:vMerge')

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{else}}'

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('w:vMerge')
        newElement.setAttribute('w:val', 'restart')

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{/if}}'

        cellPropertiesNode.appendChild(newElement)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{/docxTable}}'

        cellPropertiesNode.appendChild(newElement)

        const rowNode = cellNode.parentNode
        const tableNode = rowNode.parentNode

        tablesFoundMap.set(tableNode, helperCall)

        const newRowNode = rowNode.cloneNode(true)

        if (!isBlock) {
          helperCall = helperCall.replace('{{docxTable', '{{#docxTable')
        }

        newElement = doc.createElement('docxRemove')
        newElement.textContent = helperCall.replace('{{#docxTable', '{{#docxTable wrapper="main"')

        tableNode.parentNode.insertBefore(newElement, tableNode)

        newElement = doc.createElement('docxRemove')
        newElement.textContent = '{{/docxTable}}'

        tableNode.parentNode.insertBefore(newElement, tableNode.nextSibling)

        if (isBlock) {
          openTags.push({ mode: 'column' })
        }

        processTableOpeningTag(doc, cellNode, helperCall.replace('rows=', 'ignore='))

        if (!isBlock) {
          processTableClosingTag(doc, cellNode)
        } else {
          if (el.textContent.includes('{{/docxTable')) {
            openTags.pop()
            processTableClosingTag(doc, el, true)
          }

          const clonedTextNodes = nodeListToArray(newRowNode.getElementsByTagName('w:t'))

          for (const tNode of clonedTextNodes) {
            if (tNode.textContent.includes('{{/docxTable')) {
              tNode.textContent = tNode.textContent.replace('{{/docxTable}}', '')
            }
          }
        }

        // row template, handling the cells for the data values
        rowNode.parentNode.insertBefore(newRowNode, rowNode.nextSibling)
        const cellInNewRowNode = nodeListToArray(newRowNode.childNodes).find((node) => node.nodeName === 'w:tc')

        processTableOpeningTag(doc, cellInNewRowNode, helperCall.replace('rows=', 'ignore=').replace('columns=', 'ignore='))
        processTableClosingTag(doc, cellInNewRowNode)

        processTableOpeningTag(doc, newRowNode, helperCall)
        processTableClosingTag(doc, newRowNode)

        const tableGridNode = nodeListToArray(tableNode.childNodes).find((node) => node.nodeName === 'w:tblGrid')
        const tableGridColNodes = nodeListToArray(tableGridNode.getElementsByTagName('w:gridCol'))

        // add loop for column definitions (technically docx table does not requires the
        // col to be defined here in order to show the new cells, however we still create
        // them in order to be able to normalize col widths if needed)
        processTableOpeningTag(doc, tableGridColNodes[0], helperCall.replace('rows=', 'ignore='))
        processTableClosingTag(doc, tableGridColNodes[0])
      } else if (el.textContent.includes('{{#docxTable')) {
        const helperCall = el.textContent.match(regexp)[0]
        const isVertical = el.textContent.includes('vertical=')
        const isNormal = !isVertical

        if (isNormal) {
          openTags.push({ mode: 'row' })
        }

        const cellNode = el.parentNode.parentNode.parentNode
        const tableNode = cellNode.parentNode.parentNode

        processTableOpeningTag(doc, tableNode, '{{#docxTable wrapper="main"}}')
        processTableClosingTag(doc, tableNode, isVertical)

        tablesFoundMap.set(tableNode, helperCall)

        if (isVertical) {
          const cellIndex = getCellIndex(cellNode)
          const [affectedRows, textNodeTableClose] = getNextRowsUntilTableClose(cellNode.parentNode)

          if (textNodeTableClose) {
            textNodeTableClose.textContent = textNodeTableClose.textContent.replace('{{/docxTable}}', '')
          }

          const tableGridNode = nodeListToArray(tableNode.childNodes).find((node) => node.nodeName === 'w:tblGrid')
          const tableGridColNodes = nodeListToArray(tableGridNode.getElementsByTagName('w:gridCol'))

          // add loop for column definitions (technically docx table does not requires the
          // col to be defined here in order to show the new cells, however we still create
          // them in order to be able to normalize col widths if needed)
          processTableOpeningTag(doc, tableGridColNodes[cellIndex], helperCall, isVertical)
          processTableClosingTag(doc, tableGridColNodes[cellIndex], isVertical)

          processTableOpeningTag(doc, el, helperCall, isVertical)
          processTableClosingTag(doc, el, isVertical)

          for (const rowNode of affectedRows) {
            const cellNodes = nodeListToArray(rowNode.childNodes).filter((node) => node.nodeName === 'w:tc')
            const cellNode = cellNodes[cellIndex]

            if (cellNode) {
              processTableOpeningTag(doc, cellNode, helperCall, isVertical)
              processTableClosingTag(doc, cellNode, isVertical)
            }
          }
        } else {
          processTableOpeningTag(doc, el, helperCall, isVertical)
        }

        if (isNormal && el.textContent.includes('{{/docxTable')) {
          openTags.pop()
          processTableClosingTag(doc, el)
        }
      }
    }

    for (const [tableEl, helperCall] of tablesFoundMap) {
      const tablePrEl = nodeListToArray(tableEl.childNodes).find((node) => node.nodeName === 'w:tblPr')
      const tableWidthEl = nodeListToArray(tablePrEl.childNodes).find((node) => node.nodeName === 'w:tblW')

      tableWidthEl.setAttribute('w:w', `{{docxTable check="tableWidthValue" o=${getTableOrCellWidthInDXA(tableWidthEl.getAttribute('w:w'))}}}`)
      tableWidthEl.setAttribute('w:type', `{{docxTable check="tableWidthType" o="${tableWidthEl.getAttribute('w:type')}"}}`)

      const searchTerm = 'colsWidth='
      const startColsWidthParameter = helperCall.indexOf(searchTerm)
      let colsWidthParameterValue = ''

      if (startColsWidthParameter !== -1) {
        const remainingHelperCall = helperCall.slice(startColsWidthParameter + searchTerm.length)
        let startValueMatch = remainingHelperCall.match(/["'(@\w]/)

        if (startValueMatch != null) {
          const startIdx = startValueMatch.index
          startValueMatch = startValueMatch[0]
          let endDelimiter

          switch (startValueMatch) {
            case '(':
              endDelimiter = ')'
              break
            case '"':
              endDelimiter = '"'
              break
            case "'":
              endDelimiter = "'"
              break
            default:
              endDelimiter = ' '
              break
          }

          let endIdx = -1

          if (endDelimiter === ' ') {
            // we consider the case where the parameter is the last value of helper call
            const currentRemaining = remainingHelperCall.slice(startIdx)
            const endValueMatch = currentRemaining.match(/[ }]/)

            if (endValueMatch != null) {
              endIdx = startIdx + endValueMatch.index
            }
          } else {
            endIdx = remainingHelperCall.indexOf(endDelimiter, startIdx + 1)

            if (endIdx !== -1) {
              // for the rest of delimiters other than space we want to include the delimiter itself
              endIdx += 1
            }
          }

          if (endIdx !== -1) {
            colsWidthParameterValue = remainingHelperCall.slice(0, endIdx)
          }
        }
      }

      const tableGridEl = nodeListToArray(tableEl.childNodes).find((node) => node.nodeName === 'w:tblGrid')
      const gridColEls = nodeListToArray(tableGridEl.childNodes).filter((node) => node.nodeName === 'w:gridCol')

      for (const gridColEl of gridColEls) {
        gridColEl.setAttribute('w:w', `{{docxTable check="colWidth" o=${gridColEl.getAttribute('w:w')}}}`)
      }

      const extraAttrs = ['check="grid"']

      if (colsWidthParameterValue !== '') {
        extraAttrs.push(`colsWidth=${colsWidthParameterValue}`)
      }

      processTableOpeningTag(doc, tableGridEl, `{{#docxTable ${extraAttrs.join(' ')}}}`)
      processTableClosingTag(doc, tableGridEl)

      const tableRowEls = nodeListToArray(tableEl.childNodes).filter((node) => node.nodeName === 'w:tr')

      for (const tableRowEl of tableRowEls) {
        const rowCheckEl = doc.createElement('docxRemove')
        rowCheckEl.textContent = '{{docxTable check="row"}}'
        tableRowEl.parentNode.insertBefore(rowCheckEl, tableRowEl)

        const tableCellEls = nodeListToArray(tableRowEl.childNodes).filter((node) => node.nodeName === 'w:tc')

        for (const tableCellEl of tableCellEls) {
          const tableCellPrEl = nodeListToArray(tableCellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
          const tableCellWidthEl = nodeListToArray(tableCellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')
          const gridSpanEl = nodeListToArray(tableCellPrEl.childNodes).find((node) => node.nodeName === 'w:gridSpan')

          tableCellWidthEl.setAttribute('w:w', `{{docxTable check="cellWidthValue" o=${getTableOrCellWidthInDXA(tableCellWidthEl.getAttribute('w:w'))}}}`)
          tableCellWidthEl.setAttribute('w:type', `{{docxTable check="cellWidthType" o="${tableCellWidthEl.getAttribute('w:type')}"}}`)

          const extraAttrs = ['check="cell"']

          if (
            gridSpanEl != null &&
            gridSpanEl.getAttribute('w:val') != null &&
            !isNaN(parseInt(gridSpanEl.getAttribute('w:val'), 10))
          ) {
            extraAttrs.push(`gs=${gridSpanEl.getAttribute('w:val')}`)
          }

          const cellCheckEl = doc.createElement('docxRemove')
          cellCheckEl.textContent = `{{docxTable ${extraAttrs.join(' ')}}}`
          tableCellEl.parentNode.insertBefore(cellCheckEl, tableCellEl)
        }
      }
    }
  }
}

function processTableOpeningTag (doc, el, helperCall, useColumnRef = false) {
  if (el.nodeName === 'w:t') {
    el.textContent = el.textContent.replace(regexp, '')
  }

  let refElement

  if (el.nodeName !== 'w:t') {
    refElement = el
  } else {
    if (useColumnRef) {
      // ref is the column w:tc
      refElement = el.parentNode.parentNode.parentNode
    } else {
      // ref is the row w:tr
      refElement = el.parentNode.parentNode.parentNode.parentNode
    }
  }

  processOpeningTag(doc, refElement, helperCall)
}

function processTableClosingTag (doc, el, useColumnRef = false) {
  if (el.nodeName === 'w:t') {
    el.textContent = el.textContent.replace('{{/docxTable}}', '')
  }

  let refElement

  if (el.nodeName !== 'w:t') {
    refElement = el
  } else {
    if (useColumnRef) {
      refElement = el.parentNode.parentNode.parentNode
    } else {
      refElement = el.parentNode.parentNode.parentNode.parentNode
    }
  }

  processClosingTag(doc, refElement, '{{/docxTable}}')
}

function getCellIndex (cellEl) {
  if (cellEl.nodeName !== 'w:tc') {
    throw new Error('Expected a table cell element during the processing')
  }

  let prevElements = 0

  let currentNode = cellEl.previousSibling

  while (
    currentNode != null &&
    currentNode.nodeName === 'w:tc'
  ) {
    prevElements += 1
    currentNode = currentNode.previousSibling
  }

  return prevElements
}

function getNextRowsUntilTableClose (rowEl) {
  if (rowEl.nodeName !== 'w:tr') {
    throw new Error('Expected a table row element during the processing')
  }

  let currentNode = rowEl.nextSibling
  let tableCloseNode
  const rows = []

  while (
    currentNode != null &&
    currentNode.nodeName === 'w:tr'
  ) {
    rows.push(currentNode)

    const cellNodes = nodeListToArray(currentNode.childNodes).filter((node) => node.nodeName === 'w:tc')

    for (const cellNode of cellNodes) {
      let textNodes = nodeListToArray(cellNode.getElementsByTagName('w:t'))

      // get text nodes of the current cell, we don't want text
      // nodes of nested tables
      textNodes = textNodes.filter((tNode) => {
        let current = tNode.parentNode

        while (current.nodeName !== 'w:tc') {
          current = current.parentNode
        }

        return current === cellNode
      })

      for (const tNode of textNodes) {
        if (tNode.textContent.includes('{{/docxTable')) {
          currentNode = null
          tableCloseNode = tNode
          break
        }
      }

      if (currentNode == null) {
        break
      }
    }

    if (currentNode != null) {
      currentNode = currentNode.nextSibling
    }
  }

  return [rows, tableCloseNode]
}

function getTableOrCellWidthInDXA (inputValue) {
  const targetWidth = getDimension(inputValue, { units: ['pt'], defaultUnit: 'dxa' })
  let value

  if (targetWidth == null) {
    throw new Error(`Can not parse table/cell width value. value: "${inputValue}"`)
  }

  if (targetWidth.unit === 'pt') {
    value = ptToTOAP(targetWidth.value)
  } else {
    if (targetWidth.unit !== 'dxa') {
      throw new Error(`Can not parse table/cell width value. value: "${inputValue}"`)
    }

    value = targetWidth.value
  }

  return value
}
