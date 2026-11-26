const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, getClosestEl } = require('./utils')

const removeCommentRegExp = /__docxRemove(\d+)__/

const validTargets = {
  paragraph: 'w:p',
  row: 'w:tr',
  column: 'w:tc',
  table: 'w:tbl'
}

module.exports = function processRemove (removeMap, xmlStr) {
  const doc = new DOMParser().parseFromString(`<docxXml>${xmlStr}</docxXml>`)

  const removeComments = []
  const pending = [doc.documentElement]

  while (pending.length > 0) {
    const el = pending.pop()

    if (el.childNodes == null) {
      continue
    }

    for (let i = 0; i < el.childNodes.length; i++) {
      const childEl = el.childNodes[i]

      if (childEl.nodeType === 8) {
        const match = removeCommentRegExp.exec(childEl.nodeValue)

        if (match != null) {
          const id = parseInt(match[1], 10)
          removeComments.push([id, childEl])
        }
      } else {
        pending.push(childEl)
      }
    }
  }

  for (const [id, commentEl] of removeComments) {
    const removeComment = () => {
      const parentElOfCall = commentEl.parentNode

      parentElOfCall.removeChild(commentEl)

      if (parentElOfCall.childNodes.length === 0) {
        parentElOfCall.parentNode.removeChild(parentElOfCall)
      }
    }

    if (!removeMap.has(id)) {
      removeComment()
      continue
    }

    const removeData = removeMap.get(id)

    if (removeData.value) {
      const targetElName = validTargets[removeData.target]

      if (!targetElName) {
        throw new Error(`Invalid target "${removeData.target}" for docxRemove`)
      }

      if (removeData.target === 'column') {
        // the comment can be already detached when an earlier call removed the same column,
        // this happens when the call is inside a loop row (it is executed once per row)
        if (!isAttached(commentEl, doc)) {
          continue
        }

        const cellEl = getClosestEl(commentEl, targetElName)
        const tableEl = cellEl != null ? getClosestEl(cellEl, 'w:tbl') : null

        if (cellEl == null || tableEl == null) {
          removeComment()
          continue
        }

        removeTableColumn(tableEl, cellEl)

        // the call was in a merged cell that was kept (only its span was reduced)
        if (isAttached(commentEl, doc)) {
          removeComment()
        }

        continue
      }

      const targetEl = getClosestEl(commentEl, targetElName)

      if (targetEl) {
        targetEl.parentNode.removeChild(targetEl)
      } else {
        removeComment()
      }
    } else {
      removeComment()
    }
  }

  const items = nodeListToArray(doc.documentElement.childNodes)

  return items.map((el) => el.toString()).join('')
}

function removeTableColumn (tableEl, cellEl) {
  const rowEl = getClosestEl(cellEl, 'w:tr')
  const cellLayout = rowEl != null ? getRowCellsLayout(rowEl).cells.find((item) => item.cellEl === cellEl) : null

  if (cellLayout == null) {
    return
  }

  const columnIdx = cellLayout.start

  removeGridColumn(tableEl, columnIdx)

  for (const currentRowEl of getDirectChildren(tableEl, 'w:tr')) {
    const layout = getRowCellsLayout(currentRowEl)

    if (columnIdx < layout.gridBefore) {
      decrementIntValEl(layout.gridBeforeEl)
      continue
    }

    const targetCell = layout.cells.find((item) => columnIdx >= item.start && columnIdx < item.start + item.span)

    if (targetCell != null) {
      if (targetCell.span > 1) {
        decrementIntValEl(targetCell.gridSpanEl)
      } else {
        currentRowEl.removeChild(targetCell.cellEl)

        if (getDirectChildren(currentRowEl, 'w:tc').length === 0) {
          tableEl.removeChild(currentRowEl)
        }
      }

      continue
    }

    if (layout.gridAfter > 0 && columnIdx >= layout.end && columnIdx < layout.end + layout.gridAfter) {
      decrementIntValEl(layout.gridAfterEl)
    }
  }

  const remainingRowEls = getDirectChildren(tableEl, 'w:tr')

  if (remainingRowEls.length === 0) {
    tableEl.parentNode.removeChild(tableEl)
    return
  }

  const gridColWidths = getGridColEls(tableEl).map((gridColEl) => getIntAttr(gridColEl, 'w:w', 0))

  for (const currentRowEl of remainingRowEls) {
    for (const item of getRowCellsLayout(currentRowEl).cells) {
      const tcPrEl = getDirectChildren(item.cellEl, 'w:tcPr')[0]
      const tcWEl = tcPrEl != null ? getDirectChildren(tcPrEl, 'w:tcW')[0] : null

      if (tcWEl == null) {
        continue
      }

      const type = tcWEl.getAttribute('w:type')

      // only fixed widths are updated, pct/auto widths are kept as they are
      if (type !== '' && type != null && type !== 'dxa') {
        continue
      }

      const width = gridColWidths.slice(item.start, item.start + item.span).reduce((acc, w) => acc + w, 0)

      tcWEl.setAttribute('w:w', width.toString())
    }
  }
}

// removes the w:gridCol at the index and distributes its width into the remaining columns
// (in proportion to their widths) so the table keeps its total width
function removeGridColumn (tableEl, columnIdx) {
  const gridColEls = getGridColEls(tableEl)
  const targetGridColEl = gridColEls[columnIdx]

  if (targetGridColEl == null) {
    return
  }

  const removedWidth = getIntAttr(targetGridColEl, 'w:w', 0)

  targetGridColEl.parentNode.removeChild(targetGridColEl)

  const remainingGridColEls = gridColEls.filter((el) => el !== targetGridColEl)

  if (remainingGridColEls.length === 0 || removedWidth === 0) {
    return
  }

  const widths = remainingGridColEls.map((el) => getIntAttr(el, 'w:w', 0))
  const remainingTotal = widths.reduce((acc, w) => acc + w, 0)
  let distributed = 0

  const newWidths = widths.map((w) => {
    const extra = remainingTotal > 0
      ? Math.floor(removedWidth * (w / remainingTotal))
      : Math.floor(removedWidth / widths.length)

    distributed += extra

    return w + extra
  })

  // the rounding remainder goes to the last column
  newWidths[newWidths.length - 1] += removedWidth - distributed

  remainingGridColEls.forEach((el, idx) => {
    el.setAttribute('w:w', newWidths[idx].toString())
  })
}

function getRowCellsLayout (rowEl) {
  const trPrEl = getDirectChildren(rowEl, 'w:trPr')[0]
  const gridBeforeEl = trPrEl != null ? getDirectChildren(trPrEl, 'w:gridBefore')[0] : null
  const gridAfterEl = trPrEl != null ? getDirectChildren(trPrEl, 'w:gridAfter')[0] : null
  const gridBefore = getIntVal(gridBeforeEl, 0)
  const gridAfter = getIntVal(gridAfterEl, 0)

  const cells = []
  let current = gridBefore

  for (const cellEl of getDirectChildren(rowEl, 'w:tc')) {
    const tcPrEl = getDirectChildren(cellEl, 'w:tcPr')[0]
    const gridSpanEl = tcPrEl != null ? getDirectChildren(tcPrEl, 'w:gridSpan')[0] : null
    const span = Math.max(getIntVal(gridSpanEl, 1), 1)

    cells.push({ cellEl, gridSpanEl, start: current, span })

    current += span
  }

  return {
    gridBefore,
    gridBeforeEl,
    gridAfter,
    gridAfterEl,
    cells,
    end: current
  }
}

function getGridColEls (tableEl) {
  const tblGridEl = getDirectChildren(tableEl, 'w:tblGrid')[0]
  return tblGridEl != null ? getDirectChildren(tblGridEl, 'w:gridCol') : []
}

// decrements the w:val of the element, or removes the element when there is nothing left
// (w:gridBefore/w:gridAfter at 1, w:gridSpan when it would become 1 which is the default)
function decrementIntValEl (el) {
  if (el == null) {
    return
  }

  const value = getIntVal(el, 1)
  const minValue = el.nodeName === 'w:gridSpan' ? 2 : 1

  if (value <= minValue) {
    el.parentNode.removeChild(el)
    return
  }

  el.setAttribute('w:val', (value - 1).toString())
}

function getDirectChildren (el, nodeName) {
  return nodeListToArray(el.childNodes).filter((childEl) => childEl.nodeName === nodeName)
}

function getIntVal (el, defaultValue) {
  return el != null ? getIntAttr(el, 'w:val', defaultValue) : defaultValue
}

function getIntAttr (el, attrName, defaultValue) {
  const value = parseInt(el.getAttribute(attrName), 10)
  return isNaN(value) ? defaultValue : value
}

function isAttached (el, doc) {
  let currentEl = el

  while (currentEl != null) {
    if (currentEl === doc.documentElement) {
      return true
    }

    currentEl = currentEl.parentNode
  }

  return false
}
