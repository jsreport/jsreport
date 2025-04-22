const extend = require('node.extend.without.arrays')
const { getDimension, pxToEMU, cmToEMU, emuToTOAP } = require('../../utils')

module.exports = function transformTableMeta (tableItemMeta, sectionColsWidth) {
  const { tableWidth, cols, rows } = getTableMeta(tableItemMeta, sectionColsWidth)

  tableItemMeta.width = tableWidth
  tableItemMeta.cols = cols
  tableItemMeta.children = rows
}

function getTableMeta (tableItemMeta, sectionColsWidth) {
  const tableWidth = {
    value: null,
    source: null
  }

  if (tableItemMeta.width != null) {
    const parsedTableWidth = parseWidth(tableItemMeta.width, sectionColsWidth[0])

    // ignore if width is 0
    if (parsedTableWidth != null && parsedTableWidth.value !== 0) {
      tableWidth.value = parsedTableWidth.value
    }
  }

  if (tableWidth.value == null) {
    // by default we use the column width of the section the table it belongs,
    // since we don't support documents with multi-column we just take the first column
    tableWidth.value = sectionColsWidth[0]
    tableWidth.source = 'default'
  } else {
    tableWidth.source = 'custom'
  }

  // NOTE: the behavior we choose for the widths is that we assume table width: 100% when
  // width was not explicitly set, and when explicit table width is set the widths
  // calculation are executed like if table-layout: fixed was enabled
  const { cols, rows } = generateTableItems(tableItemMeta, tableWidth)

  return {
    tableWidth: tableWidth.source === 'custom' ? tableWidth.value : null,
    cols,
    rows
  }
}

function generateTableItems (tableItemMeta, tableWidth) {
  const tableRows = tableItemMeta.children
  const rows = normalizeRowspanAndAddSlots(tableRows)
  const rowsCount = rows.length
  const rowsMeta = new Map()
  const cols = []
  const explicitCellWithBorders = new Map()

  const getCachedParse = (fn) => {
    const cache = new Map()

    return (value) => {
      if (cache.has(value)) {
        return cache.get(value)
      }

      const parsed = fn(value)
      cache.set(value, parsed)
      return parsed
    }
  }

  const parseCachedWidth = getCachedParse((value) => parseWidth(value, tableWidth.value))

  const parseCachedHeight = getCachedParse((value) => parseHeight(value))

  const setRowMetaHeight = (rowIdx, height, source) => {
    const parsedHeight = parseCachedHeight(height)

    if (parsedHeight == null || parsedHeight.value == null || parsedHeight.value === 0) {
      return
    }

    let meta

    if (!rowsMeta.has(rowIdx)) {
      meta = {}
    } else {
      meta = rowsMeta.get(rowIdx)
    }

    if (meta.height == null || parsedHeight.value > meta.height.value) {
      meta.height = {
        value: parsedHeight.value,
        source
      }

      if (!rowsMeta.has(rowIdx)) {
        rowsMeta.set(rowIdx, meta)
      }
    }
  }

  const setCellMeta = (rIdx, cIdx, prop, value) => {
    let rMeta
    let cMeta

    // we only set in the map if there is relevant information to store there
    if (!rowsMeta.has(rIdx)) {
      rMeta = {}
      rowsMeta.set(rIdx, rMeta)
    } else {
      rMeta = rowsMeta.get(rIdx)
    }

    rMeta.cellsMeta = rMeta.cellsMeta || new Map()

    if (!rMeta.cellsMeta.has(cIdx)) {
      cMeta = {}
      rMeta.cellsMeta.set(cIdx, cMeta)
    } else {
      cMeta = rMeta.cellsMeta.get(cIdx)
    }

    cMeta[prop] = value
  }

  const colgroupsMap = new Map()

  if (Array.isArray(tableItemMeta.colgroups)) {
    let colIdx = 0

    for (const colgroup of tableItemMeta.colgroups) {
      for (const col of colgroup.cols) {
        for (let idx = 0; idx < col.span; idx++) {
          colgroupsMap.set(colIdx, col)
          colIdx++
        }
      }
    }
  }

  // scan table and extract data (cols, cell/row data) for use it later
  // to generate the new row items
  scanTableByCol(rows, {
    colOffsetPerRow: [],
    getOrInitializeColMeta: (colIdx) => {
      if (cols[colIdx] == null) {
        cols[colIdx] = { width: { value: null, source: 'default' } }
      }

      return cols[colIdx]
    }
  }, ({ rowIdx, colIdx, row, ctx }) => {
    if (ctx.colOffsetPerRow[rowIdx] == null) {
      ctx.colOffsetPerRow[rowIdx] = 0
    }

    if (row.height != null) {
      setRowMetaHeight(rowIdx, row.height, 'custom')
    }

    const cell = row.children[colIdx]

    if (cell == null) {
      return
    }

    // take styles from colgroups and apply to cell if needed
    const colFromColgroup = colgroupsMap.get(colIdx)

    if (colFromColgroup != null) {
      if (colFromColgroup.backgroundColor != null && cell.backgroundColor == null) {
        cell.backgroundColor = colFromColgroup.backgroundColor
      }

      if (colFromColgroup.border != null) {
        cell.border = extend(true, {}, colFromColgroup.border, cell.border)
      }

      if (cell.width == null) {
        let targetWidth = colFromColgroup.width

        if (targetWidth == null && colFromColgroup.minWidth != null) {
          targetWidth = colFromColgroup.minWidth
        }

        if (targetWidth != null) {
          cell.width = colFromColgroup.width
        }
      }
    }

    if (cell.border != null) {
      setCellMeta(rowIdx, colIdx, 'border', cell.border)

      if (!explicitCellWithBorders.has(rowIdx)) {
        explicitCellWithBorders.set(rowIdx, [])
      }

      explicitCellWithBorders.get(rowIdx).push(colIdx)
    }

    ctx.getOrInitializeColMeta(colIdx)

    // apply cell minWidth if needed
    if (cell.minWidth != null) {
      const minWidth = cell.minWidth
      delete cell.minWidth

      if (cell.width == null) {
        cell.width = minWidth
      }
    }

    if (cell.colspan > 1) {
      ctx.colOffsetPerRow[rowIdx] += cell.colspan - 1
    } else if (cell.width != null && cell.colspan === 1) {
      const targetColIdx = colIdx + ctx.colOffsetPerRow[rowIdx]
      const colMeta = ctx.getOrInitializeColMeta(targetColIdx)
      const parsedWidth = parseCachedWidth(cell.width)

      if (
        parsedWidth != null &&
        parsedWidth.value !== 0 &&
        parsedWidth.value != null &&
        (
          colMeta.width.value == null ||
          parsedWidth.value > colMeta.width.value
        )
      ) {
        colMeta.width = {
          value: parsedWidth.value,
          source: 'custom',
          unit: parsedWidth.unit
        }
      }
    }

    if (cell.height != null) {
      setRowMetaHeight(rowIdx, cell.height, 'custom')
    }
  })

  const colsCount = cols.length
  let customColWidthsCount = 0
  const colsMetaDefaultWidth = []

  // normalize the cols, and calculate values for the ones with "default" source
  for (const colMeta of cols) {
    if (colMeta.width.source === 'custom') {
      customColWidthsCount += 1
    } else if (colMeta.width.source === 'default') {
      // calculate the default values here because we have the final cols count
      colMeta.width.value = Math.round(tableWidth.value / colsCount)
      colsMetaDefaultWidth.push(colMeta)
    }
  }

  // normalize table/cols width
  if (customColWidthsCount > 0) {
    const totalWidth = getTotalWidth(cols)

    if (
      tableWidth.source === 'default' &&
      colsMetaDefaultWidth.length === 0 &&
      totalWidth < tableWidth.value
    ) {
      tableWidth.value = totalWidth
      tableWidth.source = 'custom'
    } else {
      const remaining = tableWidth.value - getTotalWidth(cols, (cMeta) => cMeta.width.source === 'custom')

      for (const colMeta of colsMetaDefaultWidth) {
        let newValue

        if (remaining > 0) {
          newValue = Math.round(remaining / colsMetaDefaultWidth.length)
        } else {
          newValue = 1
        }

        colMeta.width.value = newValue
      }
    }
  }

  const explicitCellBordersRows = [...explicitCellWithBorders.keys()].sort()
  const patchedCellBorders = new Set()

  // check cell borders
  for (const borderRowIdx of explicitCellBordersRows) {
    const bordersCols = [...explicitCellWithBorders.get(borderRowIdx)].sort()

    for (const borderColIdx of bordersCols) {
      const currentBorder = rowsMeta.get(borderRowIdx).cellsMeta.get(borderColIdx).border

      for (const currentSide of ['top', 'right', 'bottom', 'left']) {
        if (currentBorder[currentSide] == null) {
          continue
        }

        switch (currentSide) {
          case 'top': {
            const isCollapsed = borderRowIdx !== 0
            const previousBorderRowIdx = borderRowIdx - 1
            const previousBorder = rowsMeta.get(previousBorderRowIdx)?.cellsMeta?.get(borderColIdx)?.border || {}

            if (
              isCollapsed &&
              (
                previousBorder?.bottom != null &&
                patchedCellBorders.has(`${borderRowIdx}-${borderColIdx}-top`)
              )
            ) {
              delete currentBorder[currentSide]
            }

            break
          }
          case 'right': {
            const isCollapsed = borderColIdx !== (colsCount - 1)

            if (isCollapsed) {
              const nextColIdx = borderColIdx + 1

              if (nextColIdx > (colsCount - 1)) {
                break
              }

              const nextBorder = rowsMeta.get(borderRowIdx)?.cellsMeta?.get(nextColIdx)?.border || {}
              nextBorder.left = currentBorder[currentSide]
              patchedCellBorders.add(`${borderRowIdx}-${nextColIdx}-left`)
              setCellMeta(borderRowIdx, nextColIdx, 'border', nextBorder)
            }

            break
          }
          case 'bottom': {
            const isCollapsed = borderRowIdx !== (rowsCount - 1)

            if (isCollapsed) {
              const nextRowIdx = borderRowIdx + 1

              if (nextRowIdx > (rowsCount - 1)) {
                break
              }

              const nextBorder = rowsMeta.get(nextRowIdx)?.cellsMeta?.get(borderColIdx)?.border || {}
              nextBorder.top = currentBorder[currentSide]
              patchedCellBorders.add(`${nextRowIdx}-${borderColIdx}-top`)
              setCellMeta(nextRowIdx, borderColIdx, 'border', nextBorder)
            }

            break
          }
          case 'left': {
            const isCollapsed = borderColIdx !== 0
            const previousBorderColIdx = borderColIdx - 1
            const previousBorder = rowsMeta.get(borderRowIdx)?.cellsMeta?.get(previousBorderColIdx)?.border || {}

            if (
              isCollapsed &&
              (
                previousBorder?.right != null &&
                patchedCellBorders.has(`${borderRowIdx}-${borderColIdx}-left`)
              )
            ) {
              delete currentBorder[currentSide]
            }

            break
          }
          default:
            throw new Error(`Unsupported border side: ${currentSide}`)
        }
      }
    }
  }

  // scan table to add normalized colspan and cell width and borders to metadata
  scanTableByCol(rows, { colOffsetPerRow: [] }, ({ rowIdx, colIdx, row, ctx }) => {
    if (ctx.colOffsetPerRow[rowIdx] == null) {
      ctx.colOffsetPerRow[rowIdx] = 0
    }

    const cell = row.children[colIdx]

    if (cell == null) {
      return
    }

    const colspan = cell.colspan
    let finalColspan = 0
    let cellWidth = 0

    for (let colspanIdx = 0; colspanIdx < colspan; colspanIdx++) {
      const targetColIdx = colIdx + colspanIdx + ctx.colOffsetPerRow[rowIdx]
      const currentCol = cols[targetColIdx]

      if (currentCol) {
        finalColspan++
        cellWidth += currentCol.width.value
      }
    }

    ctx.colOffsetPerRow[rowIdx] += colspan - 1

    if (finalColspan > 1 || cols[colIdx].width.value !== cellWidth) {
      if (finalColspan > 1) {
        setCellMeta(rowIdx, colIdx, 'colspan', finalColspan)
      }

      if (cols[colIdx].width.value !== cellWidth) {
        setCellMeta(rowIdx, colIdx, 'width', cellWidth)
      }
    }
  })

  // generate the rows normalized without unused attributes
  const newRows = []

  for (let rowIdx = 0; rowIdx < rowsCount; rowIdx++) {
    const row = rows[rowIdx]

    const newRow = {
      type: row.type,
      children: []
    }

    const rowMeta = rowsMeta.get(rowIdx)

    if (rowMeta?.height != null) {
      newRow.height = rowMeta.height.value
    }

    const cellsCount = row.children.length

    for (let cellIdx = 0; cellIdx < cellsCount; cellIdx++) {
      const cell = row.children[cellIdx]
      const cellMeta = rowMeta?.cellsMeta?.get(cellIdx)

      const newCell = {
        type: cell.type,
        children: [...cell.children]
      }

      // we normalize the following cases to prevent producing broken document:
      // - cell can not be empty
      // - if cell contain nested table and it is last child then we need to add an empty paragraph after it
      if (
        newCell.children.length === 0 ||
        newCell.children[newCell.children.length - 1].type === 'table'
      ) {
        newCell.children.push({
          type: 'paragraph',
          children: [{ type: 'text', value: '' }]
        })
      }

      if (cellMeta?.colspan != null) {
        newCell.colspan = cellMeta.colspan
      }

      if (cell.rowspan > 1) {
        newCell.rowspan = cell.rowspan
      }

      if (cell.vMerge != null) {
        newCell.vMerge = cell.vMerge
      }

      if (cell.backgroundColor != null) {
        newCell.backgroundColor = cell.backgroundColor
      }

      if (cell.indent != null) {
        newCell.indent = cell.indent
      }

      if (cell.alignment != null) {
        newCell.alignment = cell.alignment
      }

      if (cell.spacing != null) {
        newCell.spacing = cell.spacing
      }

      if (cellMeta?.width != null) {
        newCell.width = cellMeta.width
      } else {
        newCell.width = cols[cellIdx].width.value
      }

      if (cellMeta?.border != null) {
        newCell.border = cellMeta.border
      }

      newRow.children.push(newCell)
    }

    newRows.push(newRow)
  }

  return {
    cols: cols.map((c) => ({ width: c.width.value })),
    rows: newRows
  }
}

function normalizeRowspanAndAddSlots (tableRows) {
  const rowspanCells = []
  const rows = []

  // browsers treats rowspan limit just according to its group, which means that if you
  // set rowspan  in a cell inside thead, and expect it to continue in the rows of tbody,
  // it does not work, so here we group rows by container,
  // so rowspan only works if the rows are part of the same group.
  // here we also group the empty rows and remove them
  const groups = tableRows.reduce((acu, row) => {
    let lastGroup = acu[acu.length - 1]

    if (row.children.length === 0) {
      // empty rows always have its own group so they don't influence rowspan of other groups
      // this empty group actually does not group the empty rows, it is just like a placeholder
      lastGroup = { name: 'empty', rows: [] }
    } else if (acu.length === 0 || lastGroup.name !== row.group) {
      lastGroup = { name: row.group, rows: [] }
      acu.push(lastGroup)
    }

    const rows = lastGroup.rows

    rows.push(row)

    return acu
  }, []).filter((g) => g.name !== 'empty')

  // normalize cells, add slot cells according to the values
  // of rowspan
  for (const group of groups) {
    const rowsCount = group.rows.length

    for (let rowIdx = 0; rowIdx < rowsCount; rowIdx++) {
      const existingRow = group.rows[rowIdx]
      const newRow = { ...existingRow, children: [] }
      const cellsCount = existingRow.children.length
      let currentCellIdx = 0

      const slotCells = []

      for (const rowspanCell of rowspanCells) {
        const rowspanCellLimit = rowspanCell.rowIdx + rowspanCell.value

        if (
          rowspanCell.rowIdx < rowIdx &&
          rowspanCellLimit >= rowIdx
        ) {
          slotCells.push({
            idx: rowspanCell.cellIdx,
            cell: rowspanCell.cell
          })
        }
      }

      // sort slot cells ASC by index
      slotCells.sort((cL, cR) => {
        if (cL.idx === cR.idx) {
          return 0
        }

        return cL.idx > cR.idx ? 1 : -1
      })

      const addSlotCellIfNeeded = (row) => {
        for (const slotCell of slotCells) {
          if (slotCell.idx === currentCellIdx) {
            currentCellIdx++

            row.children.push({
              type: 'cell',
              colspan: slotCell.cell.colspan,
              rowspan: 1,
              vMerge: true,
              children: []
            })
          }
        }
      }

      for (let cellIdx = 0; cellIdx < cellsCount; cellIdx++) {
        addSlotCellIfNeeded(newRow)

        const newCell = { ...existingRow.children[cellIdx] }
        const remainingRows = rowsCount - (rowIdx + 1)

        if (newCell.rowspan > 1) {
          const extraRowsNeeded = newCell.rowspan - 1

          if (extraRowsNeeded > remainingRows) {
            newCell.rowspan = remainingRows + 1
          }
        }

        if (newCell.rowspan > 1) {
          rowspanCells.push({
            rowIdx,
            cellIdx: currentCellIdx,
            value: newCell.rowspan - 1,
            cell: newCell
          })
        }

        currentCellIdx += newCell.colspan

        newRow.children.push(newCell)

        if (cellsCount - 1 === cellIdx) {
          addSlotCellIfNeeded(newRow)
        }
      }

      rows.push(newRow)
    }
  }

  return rows
}

function scanTableByCol (tableRows, ctx, stepCb) {
  const rowsCount = tableRows.length
  let rowsPendingToScan = rowsCount
  let currentColIdx = 0

  do {
    for (let currentRowIdx = 0; currentRowIdx < rowsCount; currentRowIdx++) {
      const row = tableRows[currentRowIdx]
      const cellCountInRow = row.children.length

      if (currentColIdx === cellCountInRow) {
        rowsPendingToScan--
      }

      stepCb({ rowIdx: currentRowIdx, colIdx: currentColIdx, row, ctx })
    }

    if (rowsPendingToScan === 0) {
      break
    }

    currentColIdx++
  } while (rowsPendingToScan > 0)
}

function getTotalWidth (cols, filterFn) {
  let total = 0

  for (const colMeta of cols) {
    let shouldSkip = false

    if (filterFn != null) {
      shouldSkip = filterFn(colMeta) !== true
    }

    if (shouldSkip) {
      continue
    }

    total += colMeta.width.value
  }

  return total
}

function parseWidth (value, containerWidth) {
  const parsed = getDimension(value, {
    units: ['px', 'cm', '%']
  })

  if (parsed == null || parsed.value == null) {
    return
  }

  let newWidth

  if (parsed.value !== 0) {
    switch (parsed.unit) {
      case 'px':
        newWidth = Math.round(emuToTOAP(pxToEMU(parsed.value)))
        break
      case 'cm':
        newWidth = Math.round(emuToTOAP(cmToEMU(parsed.value)))
        break
      case '%':
        newWidth = Math.round((parsed.value / 100) * containerWidth)
        break
    }
  } else {
    newWidth = 0
  }

  if (newWidth == null) {
    return
  }

  return { value: newWidth, unit: parsed.unit }
}

function parseHeight (value) {
  const parsed = getDimension(value)

  if (parsed == null || parsed.value == null) {
    return
  }

  let newHeight

  if (parsed.value !== 0) {
    switch (parsed.unit) {
      case 'px':
        newHeight = Math.round(emuToTOAP(pxToEMU(parsed.value)))
        break
      case 'cm':
        newHeight = Math.round(emuToTOAP(cmToEMU(parsed.value)))
        break
    }
  } else {
    newHeight = 0
  }

  if (newHeight == null) {
    return
  }

  return { value: newHeight, unit: parsed.unit }
}
