const { nodeListToArray } = require('../utils')
const regexp = /{{#?pptxTable [^{}]{0,500}}}/

// the same idea as list, check the docs there
module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc
    const elements = nodeListToArray(doc.getElementsByTagName('a:t'))
    const openTags = []

    const tablesFoundMap = new Map()

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      if (el.textContent.includes('{{/pptxTable}}') && openTags.length > 0) {
        const tag = openTags.pop()
        processClosingTag(doc, el, tag.mode === 'column')
      }

      if (
        (
          el.textContent.includes('{{pptxTable') ||
          el.textContent.includes('{{#pptxTable')
        ) &&
        el.textContent.includes('rows=') &&
        el.textContent.includes('columns=')
      ) {
        const isBlock = el.textContent.includes('{{#pptxTable')
        // full table mode
        let helperCall = el.textContent.match(regexp)[0]

        if (!isBlock) {
          // setting the cell text to be the value for the rows (before we clone)
          el.textContent = el.textContent.replace(regexp, '{{this}}')
        } else {
          el.textContent = el.textContent.replace(regexp, '')
        }

        const paragraphNode = el.parentNode.parentNode

        let newElement = doc.createElement('pptxRemove')
        newElement.textContent = '{{#if @placeholderCell}}'

        paragraphNode.parentNode.parentNode.insertBefore(newElement, paragraphNode.parentNode)

        const emptyParagraphNode = paragraphNode.cloneNode(true)

        while (emptyParagraphNode.firstChild) {
          emptyParagraphNode.removeChild(emptyParagraphNode.firstChild)
          emptyParagraphNode.removeAttribute('__block_helper_container__')
        }

        if (emptyParagraphNode.childNodes.length === 0) {
          emptyParagraphNode.appendChild(doc.createElement('a:endParaRPr'))
        }

        const newTxBodyEl = doc.createElement('a:txBody')
        newTxBodyEl.appendChild(doc.createElement('a:bodyPr'))
        newTxBodyEl.appendChild(doc.createElement('a:lstStyle'))
        newTxBodyEl.appendChild(emptyParagraphNode)

        paragraphNode.parentNode.parentNode.insertBefore(newTxBodyEl, paragraphNode.parentNode)

        newElement = doc.createElement('pptxRemove')
        newElement.textContent = '{{else}}'

        paragraphNode.parentNode.parentNode.insertBefore(newElement, paragraphNode.parentNode)

        newElement = doc.createElement('pptxRemove')
        newElement.textContent = '{{/if}}'

        paragraphNode.parentNode.parentNode.insertBefore(newElement, paragraphNode.parentNode.nextSibling)

        const cellNode = paragraphNode.parentNode.parentNode

        cellNode.setAttribute('gridSpan', '{{@colspan}}')
        cellNode.setAttribute('rowSpan', '{{@rowspan}}')
        cellNode.setAttribute('hMerge', '{{#pptxTable check="colspan"}}{{#if @empty}}1{{/if}}{{/pptxTable}}')
        cellNode.setAttribute('vMerge', '{{#pptxTable check="rowspan"}}{{#if @empty}}1{{/if}}{{/pptxTable}}')

        const rowNode = cellNode.parentNode
        const tableNode = rowNode.parentNode

        tablesFoundMap.set(tableNode, helperCall)

        const newRowNode = rowNode.cloneNode(true)

        if (!isBlock) {
          helperCall = helperCall.replace('{{pptxTable', '{{#pptxTable')
        }

        newElement = doc.createElement('pptxRemove')
        newElement.textContent = helperCall.replace('{{#pptxTable', '{{#pptxTable wrapper="main"')

        tableNode.parentNode.insertBefore(newElement, tableNode)

        newElement = doc.createElement('pptxRemove')
        newElement.textContent = '{{/pptxTable}}'

        tableNode.parentNode.insertBefore(newElement, tableNode.nextSibling)

        if (isBlock) {
          openTags.push({ mode: 'column' })
        }

        processOpeningTag(doc, cellNode, helperCall.replace('rows=', 'ignore='))

        if (!isBlock) {
          processClosingTag(doc, cellNode)
        } else {
          if (el.textContent.includes('{{/pptxTable')) {
            openTags.pop()
            processClosingTag(doc, el, true)
          }

          const clonedTextNodes = nodeListToArray(newRowNode.getElementsByTagName('a:t'))

          for (const tNode of clonedTextNodes) {
            if (tNode.textContent.includes('{{/pptxTable')) {
              tNode.textContent = tNode.textContent.replace('{{/pptxTable}}', '')
            }
          }
        }

        // row template, handling the cells for the data values
        rowNode.parentNode.insertBefore(newRowNode, rowNode.nextSibling)
        const cellInNewRowNode = nodeListToArray(newRowNode.childNodes).find((node) => node.nodeName === 'a:tc')

        processOpeningTag(doc, cellInNewRowNode, helperCall.replace('rows=', 'ignore=').replace('columns=', 'ignore='))
        processClosingTag(doc, cellInNewRowNode)

        processOpeningTag(doc, newRowNode, helperCall)
        processClosingTag(doc, newRowNode)

        const tableGridNode = nodeListToArray(tableNode.childNodes).find((node) => node.nodeName === 'a:tblGrid')
        const tableGridColNodes = nodeListToArray(tableGridNode.getElementsByTagName('a:gridCol'))

        const baseColsWidth = tableGridColNodes[0].getAttribute('w')

        if (baseColsWidth != null && baseColsWidth !== '' && !isNaN(parseInt(baseColsWidth, 10))) {
          tableGridNode.setAttribute('needsColWidthNormalization', baseColsWidth)
        }

        // add loop for column definitions (pptx table requires this to show the newly created columns)
        processOpeningTag(doc, tableGridColNodes[0], helperCall.replace('rows=', 'ignore='))
        processClosingTag(doc, tableGridColNodes[0])
      } else if (el.textContent.includes('{{#pptxTable')) {
        const helperCall = el.textContent.match(regexp)[0]
        const isVertical = el.textContent.includes('vertical=')
        const isNormal = !isVertical

        if (isNormal) {
          openTags.push({ mode: 'row' })
        }

        const cellNode = el.parentNode.parentNode.parentNode.parentNode
        const tableNode = cellNode.parentNode.parentNode

        tablesFoundMap.set(tableNode, helperCall)

        if (isVertical) {
          const cellIndex = getCellIndex(cellNode)
          const [affectedRows, textNodeTableClose] = getNextRowsUntilTableClose(cellNode.parentNode)

          if (textNodeTableClose) {
            textNodeTableClose.textContent = textNodeTableClose.textContent.replace('{{/pptxTable}}', '')
          }

          const tableGridNode = nodeListToArray(tableNode.childNodes).find((node) => node.nodeName === 'a:tblGrid')
          const tableGridColNodes = nodeListToArray(tableGridNode.getElementsByTagName('a:gridCol'))

          const baseColsWidth = tableGridColNodes.reduce((acu, colNode) => {
            const colWidth = colNode.getAttribute('w')
            let parsed

            if (colWidth != null && colWidth !== '') {
              parsed = parseInt(colWidth, 10)
            }

            if (parsed != null && !isNaN(parsed)) {
              acu += parsed
            }

            return acu
          }, 0)

          if (baseColsWidth !== 0) {
            tableGridNode.setAttribute('needsColWidthNormalization', baseColsWidth)
          }

          // add loop for column definitions (pptx table requires this to show the newly created columns)
          processOpeningTag(doc, tableGridColNodes[cellIndex], helperCall, isVertical)
          processClosingTag(doc, tableGridColNodes[cellIndex], isVertical)

          processOpeningTag(doc, el, helperCall, isVertical)
          processClosingTag(doc, el, isVertical)

          for (const rowNode of affectedRows) {
            const cellNodes = nodeListToArray(rowNode.childNodes).filter((node) => node.nodeName === 'a:tc')
            const cellNode = cellNodes[cellIndex]

            if (cellNode) {
              processOpeningTag(doc, cellNode, helperCall, isVertical)
              processClosingTag(doc, cellNode, isVertical)
            }
          }
        } else {
          processOpeningTag(doc, el, helperCall, isVertical)
        }

        if (isNormal && el.textContent.includes('{{/pptxTable')) {
          openTags.pop()
          processClosingTag(doc, el)
        }
      }
    }

    for (const [tableEl, helperCall] of tablesFoundMap) {
      const tableGridEl = nodeListToArray(tableEl.childNodes).find((node) => node.nodeName === 'a:tblGrid')
      const gridColEls = nodeListToArray(tableGridEl.childNodes).filter((node) => node.nodeName === 'a:gridCol')

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

      for (const gridColEl of gridColEls) {
        gridColEl.setAttribute('w', `{{pptxTable check="colWidth" o=${gridColEl.getAttribute('w')}}}`)
      }

      const extraAttrs = ['check="grid"']

      if (colsWidthParameterValue !== '') {
        extraAttrs.push(`colsWidth=${colsWidthParameterValue}`)
      }

      processOpeningTag(doc, tableGridEl, `{{#pptxTable ${extraAttrs.join(' ')}}}`)
      processClosingTag(doc, tableGridEl)
    }
  }
}

function processOpeningTag (doc, el, helperCall, useColumnRef = false) {
  if (el.nodeName === 'a:t') {
    el.textContent = el.textContent.replace(regexp, '')
  }

  const fakeElement = doc.createElement('pptxRemove')

  fakeElement.textContent = helperCall

  let refElement

  if (el.nodeName !== 'a:t') {
    refElement = el
  } else {
    if (useColumnRef) {
      // ref is the column a:tc
      refElement = el.parentNode.parentNode.parentNode.parentNode
    } else {
      // ref is the row a:tr
      refElement = el.parentNode.parentNode.parentNode.parentNode.parentNode
    }
  }

  refElement.parentNode.insertBefore(fakeElement, refElement)
}

function processClosingTag (doc, el, useColumnRef = false) {
  if (el.nodeName === 'a:t') {
    el.textContent = el.textContent.replace('{{/pptxTable}}', '')
  }

  const fakeElement = doc.createElement('pptxRemove')

  fakeElement.textContent = '{{/pptxTable}}'

  let refElement

  if (el.nodeName !== 'a:t') {
    refElement = el
  } else {
    if (useColumnRef) {
      refElement = el.parentNode.parentNode.parentNode.parentNode
    } else {
      refElement = el.parentNode.parentNode.parentNode.parentNode.parentNode
    }
  }

  refElement.parentNode.insertBefore(fakeElement, refElement.nextSibling)
}

function getCellIndex (cellEl) {
  if (cellEl.nodeName !== 'a:tc') {
    throw new Error('Expected a table cell element during the processing')
  }

  let prevElements = 0

  let currentNode = cellEl.previousSibling

  while (
    currentNode != null &&
    currentNode.nodeName === 'a:tc'
  ) {
    prevElements += 1
    currentNode = currentNode.previousSibling
  }

  return prevElements
}

function getNextRowsUntilTableClose (rowEl) {
  if (rowEl.nodeName !== 'a:tr') {
    throw new Error('Expected a table row element during the processing')
  }

  let currentNode = rowEl.nextSibling
  let tableCloseNode
  const rows = []

  while (
    currentNode != null &&
    currentNode.nodeName === 'a:tr'
  ) {
    rows.push(currentNode)

    const cellNodes = nodeListToArray(currentNode.childNodes).filter((node) => node.nodeName === 'a:tc')

    for (const cellNode of cellNodes) {
      let textNodes = nodeListToArray(cellNode.getElementsByTagName('a:t'))

      // get text nodes of the current cell, we don't want text
      // nodes of nested tables
      textNodes = textNodes.filter((tNode) => {
        let current = tNode.parentNode

        while (current.nodeName !== 'a:tc') {
          current = current.parentNode
        }

        return current === cellNode
      })

      for (const tNode of textNodes) {
        if (tNode.textContent.includes('{{/pptxTable')) {
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
