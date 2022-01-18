const { nodeListToArray } = require('../utils')
const regexp = /{{#?docxTable [^{}]{0,500}}}/

// the same idea as list, check the docs there
module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc
    const elements = nodeListToArray(doc.getElementsByTagName('w:t'))
    const openTags = []

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      if (el.textContent.includes('{{/docxTable}}') && openTags.length > 0) {
        const tag = openTags.pop()
        processClosingTag(doc, el, tag.mode === 'column')
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

        processOpeningTag(doc, cellNode, helperCall.replace('rows=', 'ignore='))

        if (!isBlock) {
          processClosingTag(doc, cellNode)
        } else {
          if (el.textContent.includes('{{/docxTable')) {
            openTags.pop()
            processClosingTag(doc, el, true)
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

        processOpeningTag(doc, cellInNewRowNode, helperCall.replace('rows=', 'ignore=').replace('columns=', 'ignore='))
        processClosingTag(doc, cellInNewRowNode)

        processOpeningTag(doc, newRowNode, helperCall)
        processClosingTag(doc, newRowNode)
      } else if (el.textContent.includes('{{#docxTable')) {
        const helperCall = el.textContent.match(regexp)[0]
        const isVertical = el.textContent.includes('vertical=')
        const isNormal = !isVertical

        if (isNormal) {
          openTags.push({ mode: 'row' })
        }

        if (isVertical) {
          const cellNode = el.parentNode.parentNode.parentNode
          const cellIndex = getCellIndex(cellNode)
          const [affectedRows, textNodeTableClose] = getNextRowsUntilTableClose(cellNode.parentNode)

          if (textNodeTableClose) {
            textNodeTableClose.textContent = textNodeTableClose.textContent.replace('{{/docxTable}}', '')
          }

          processOpeningTag(doc, el, helperCall, isVertical)
          processClosingTag(doc, el, isVertical)

          for (const rowNode of affectedRows) {
            const cellNodes = nodeListToArray(rowNode.childNodes).filter((node) => node.nodeName === 'w:tc')
            const cellNode = cellNodes[cellIndex]

            if (cellNode) {
              processOpeningTag(doc, cellNode, helperCall, isVertical)
              processClosingTag(doc, cellNode, isVertical)
            }
          }
        } else {
          processOpeningTag(doc, el, helperCall, isVertical)
        }

        if (isNormal && el.textContent.includes('{{/docxTable')) {
          openTags.pop()
          processClosingTag(doc, el)
        }
      }
    }
  }
}

function processOpeningTag (doc, el, helperCall, useColumnRef = false) {
  if (el.nodeName === 'w:t') {
    el.textContent = el.textContent.replace(regexp, '')
  }

  const fakeElement = doc.createElement('docxRemove')

  fakeElement.textContent = helperCall

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

  refElement.parentNode.insertBefore(fakeElement, refElement)
}

function processClosingTag (doc, el, useColumnRef = false) {
  if (el.nodeName === 'w:t') {
    el.textContent = el.textContent.replace('{{/docxTable}}', '')
  }

  const fakeElement = doc.createElement('docxRemove')

  fakeElement.textContent = '{{/docxTable}}'

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

  refElement.parentNode.insertBefore(fakeElement, refElement.nextSibling)
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
