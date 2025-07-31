const path = require('path')
const fs = require('fs')
const moment = require('moment')
const ExcelJS = require('@jsreport/exceljs')
const stylesMap = require('./stylesMap')
const styleNames = Object.entries(stylesMap)
const utils = require('./utils')

const styleProperties = [
  'formatStr', 'formatEnum', 'backgroundColor', 'foregroundColor',
  'fontFamily', 'fontSize', 'fontStyle', 'fontWeight',
  'transform', 'textDecoration', 'writingMode', 'textOrientation',
  'verticalAlign', 'horizontalAlign', 'wrapText', 'width',
  'height', 'border'
]

async function tableToXlsx (options, tables, xlsxTemplateBuf, id) {
  const outputFilePath = path.join(options.tmpDir, `${id}.xlsx`)

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    template: xlsxTemplateBuf,
    filename: outputFilePath,
    useStyles: true,
    useSharedStrings: false
  })

  if (xlsxTemplateBuf) {
    await workbook.waitForTemplateParse()
  }

  const tablesToProcess = tables

  for (const table of tablesToProcess) {
    const sheet = await workbook.addWorksheetAsync(table.name)

    const context = {
      currentRowInFile: 0,
      currentCellOffsetsPerRow: [],
      pendingCellOffsetsPerRow: [],
      usedCells: [],
      maxWidths: [],
      pendingCellStylesByRow: new Map(),
      parsedStyles: new Map(),
      totalRows: table.rowsCount
    }

    const normalizedBordersInRowSet = new Set()
    const patchedCellBorders = new Set()
    let lastCurrentRowInFile

    await table.getRows((row) => {
      const currentRowInFile = context.currentRowInFile
      lastCurrentRowInFile = currentRowInFile

      addRow(sheet, row, context)

      const pendingCellStylesByRow = context.pendingCellStylesByRow
      const rowId = currentRowInFile + 1
      const sortedPendingRows = [...pendingCellStylesByRow.keys()].sort((a, b) => a - b)

      if (sortedPendingRows.length >= 3 && rowId > sortedPendingRows[2]) {
        processPendingCellStyle(
          sheet,
          pendingCellStylesByRow,
          sortedPendingRows,
          normalizedBordersInRowSet,
          patchedCellBorders,
          { totalRows: context.totalRows }
        )
      }
    })

    while (context.pendingCellStylesByRow.size > 0) {
      const sortedPendingRows = [...context.pendingCellStylesByRow.keys()].sort((a, b) => a - b)

      processPendingCellStyle(
        sheet,
        context.pendingCellStylesByRow,
        sortedPendingRows,
        normalizedBordersInRowSet,
        patchedCellBorders,
        { totalRows: context.totalRows, rowsInFile: lastCurrentRowInFile + 1 }
      )
    }

    sheet.commit()
  }

  await workbook.commit()

  return fs.createReadStream(outputFilePath)
}

function processPendingCellStyle (
  sheet,
  pendingCellStylesByRow,
  sortedPendingRows,
  normalizedBordersInRowSet,
  patchedCellBorders,
  rowsCountMeta
) {
  // remember that all indexes here are 1-based, also the ones stores in the pending map
  const rowIdToCommit = sortedPendingRows[0]
  const rowIdToProcess = sortedPendingRows[1]

  if (!normalizedBordersInRowSet.has(rowIdToCommit)) {
    normalizeBorderForRow(pendingCellStylesByRow, rowIdToCommit, patchedCellBorders, rowsCountMeta)
    normalizedBordersInRowSet.add(rowIdToCommit)
  }

  if (rowIdToProcess && !normalizedBordersInRowSet.has(rowIdToProcess)) {
    normalizeBorderForRow(pendingCellStylesByRow, rowIdToProcess, patchedCellBorders, rowsCountMeta)
    normalizedBordersInRowSet.add(rowIdToProcess)
  }

  const pendingColIds = [...pendingCellStylesByRow.get(rowIdToCommit).keys()].sort((a, b) => a - b)

  // apply styles for all the cells in the row that is going to be committed
  for (const colId of pendingColIds) {
    const styles = pendingCellStylesByRow.get(rowIdToCommit).get(colId).styles
    const cell = sheet.getCell(rowIdToCommit, colId)

    if (styles.border != null && Object.keys(styles.border).length === 0) {
      delete styles.border
    }

    if (Object.keys(styles).length > 0) {
      setStyles(cell, styles)
    }
  }

  // remember that when you commit a row, all rows before are also committed
  sheet.getRow(rowIdToCommit).commit()

  normalizedBordersInRowSet.delete(rowIdToCommit)
  pendingCellStylesByRow.delete(rowIdToCommit)
}

function addRow (sheet, row, context) {
  const pendingCellStylesByRow = context.pendingCellStylesByRow
  const currentCellOffsetsPerRow = context.currentCellOffsetsPerRow
  const usedCells = context.usedCells
  const maxWidths = context.maxWidths
  const totalRows = context.totalRows
  let maxHeight = 0 // default height
  let previousCell

  if (currentCellOffsetsPerRow[context.currentRowInFile] === undefined) {
    currentCellOffsetsPerRow[context.currentRowInFile] = [{ startCell: 1, offset: 0 }]
  }

  const allCellsAreRowSpan = row.filter(c => c.rowspan > 1).length === row.length

  if (row.length === 0) {
    throw new Error('Cell not found, make sure there are td elements inside tr')
  }

  // xlsxColumnIdx is global column index in table
  let xlsxColumnIdx = 0

  for (let cIdx = 0; cIdx < row.length; cIdx++) {
    const cellInfo = row[cIdx]

    // when all cells are rowspan in a row then the row itself doesn't count
    let rowSpan = cellInfo.rowspan - (allCellsAreRowSpan ? 1 : 0)

    // condition for rowspan don't merge more rows than rows available in table
    if (((context.currentRowInFile + 1) + (rowSpan - 1)) > totalRows) {
      rowSpan = (totalRows - (context.currentRowInFile + 1)) + 1
    }

    rowSpan = Math.max(rowSpan, 1)

    const cellSpan = cellInfo.colspan

    // row height
    if (cellInfo.height) {
      const pt = utils.sizePxToPt(cellInfo.height)

      if (pt > maxHeight) {
        maxHeight = pt / rowSpan
      }
    }

    // col width
    if (cellInfo.width) {
      if (!maxWidths[xlsxColumnIdx]) {
        maxWidths[xlsxColumnIdx] = 0 // default width
      }

      const pt = cellInfo.width / 7

      if (pt > maxWidths[xlsxColumnIdx]) {
        const width = pt / cellSpan
        // only remember max column widths for single columns
        if (cellSpan === 1) {
          maxWidths[xlsxColumnIdx] = width
          sheet.getColumn(xlsxColumnIdx + 1).width = width
        } else if (Boolean(sheet.getColumn(xlsxColumnIdx + 1).width) === false) {
          // only set width on multi colspan if not already defined
          maxWidths[xlsxColumnIdx] = width
          sheet.getColumn(xlsxColumnIdx + 1).width = width
        }
      }
    }

    // increment global column index by cellSpan to track setting of column width
    xlsxColumnIdx += cellSpan

    const cell = sheet.getCell(`${context.currentRowInFile + 1}`, `${currentCellOffsetsPerRow[context.currentRowInFile][0].startCell + currentCellOffsetsPerRow[context.currentRowInFile][0].offset}`)

    // column number is returned as 1-base
    const startCell = cell.col
    let endCell = cell.col
    // row number is returned as 1-based
    const startRow = cell.row
    let endRow = cell.row

    usedCells[`${cell.row},${cell.col}`] = true

    if (cellInfo.type === 'number') {
      cell.value = parseFloat(cellInfo.valueText)
    } else if (cellInfo.type === 'bool' || cellInfo.type === 'boolean') {
      cell.value = cellInfo.valueText === 'true' || cellInfo.valueText === '1'
    } else if (cellInfo.type === 'date') {
      cell.value = moment(cellInfo.valueText).toDate()
      cell.numFmt = 'yyyy-mm-dd'
    } else if (cellInfo.type === 'datetime') {
      cell.value = moment(cellInfo.valueText).toDate()
      cell.numFmt = 'yyyy-mm-dd h:mm:ss'
    } else if (cellInfo.type === 'formula') {
      cell.value = {
        formula: cellInfo.valueText
      }
    } else {
      cell.value = cellInfo.valueText !== '' ? cellInfo.valueText : null
    }

    const styleValues = {}

    for (const styleProp of styleProperties) {
      styleValues[styleProp] = cellInfo[styleProp]
    }

    const styleKey = JSON.stringify(styleValues)

    let styles

    if (context.parsedStyles.has(styleKey)) {
      // eslint-disable-next-line no-undef
      styles = structuredClone(context.parsedStyles.get(styleKey))
    } else {
      const parsedStyles = getXlsxStyles(cellInfo)
      context.parsedStyles.set(styleKey, parsedStyles)
      // eslint-disable-next-line no-undef
      styles = structuredClone(parsedStyles)
    }

    if (!pendingCellStylesByRow.has(context.currentRowInFile + 1)) {
      pendingCellStylesByRow.set(context.currentRowInFile + 1, new Map())
    }

    const pendingCellStyleEntry = { styles }

    if (rowSpan > 1 || cellSpan > 1) {
      const rowIncrement = Math.max(rowSpan - 1, 0)
      const cellIncrement = Math.max(cellSpan - 1, 0)

      endRow = startRow + rowIncrement
      endCell = startCell + cellIncrement

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCell; c <= endCell; c++) {
          if (usedCells[`${r},${c}`] == null) {
            usedCells[`${r},${c}`] = true
          }

          if (!pendingCellStylesByRow.has(r)) {
            pendingCellStylesByRow.set(r, new Map())
          }

          // eslint-disable-next-line no-undef
          const newStyles = structuredClone(styles)

          const pendingItem = Object.assign({}, r === startRow && c === startCell ? pendingCellStyleEntry : { styles: {} }, {
            merge: { startRow, endRow, startCell, endCell },
            mergeBaseStyle: newStyles
          })

          pendingCellStylesByRow.get(r).set(c, pendingItem)
        }
      }

      sheet.mergeCells(startRow, startCell, endRow, endCell)
    } else {
      // NOTE: remember that merged cells share the same style object so setting the style
      // in one cell will do it also for the other cells
      pendingCellStylesByRow.get(context.currentRowInFile + 1).set(startCell, pendingCellStyleEntry)
    }

    for (let r = 0; r < rowSpan; r++) {
      if (currentCellOffsetsPerRow[context.currentRowInFile + r] == null) {
        currentCellOffsetsPerRow[context.currentRowInFile + r] = [{ startCell: 1, offset: 0 }]
      }
    }

    if (previousCell != null && previousCell.rowSpan !== rowSpan) {
      const start = context.currentRowInFile + 1
      const end = start + (rowSpan - 1)

      for (let r = start; r < end; r++) {
        // increase offset in new part for next row
        const cellOffsetsInRow = currentCellOffsetsPerRow[r]

        if (cellOffsetsInRow != null && cellOffsetsInRow[cellOffsetsInRow.length - 1].startCell !== startCell) {
          cellOffsetsInRow.push({ startCell, offset: 0 })
        }
      }
    }

    const cellOffsetsInCurrentRow = currentCellOffsetsPerRow[context.currentRowInFile]
    cellOffsetsInCurrentRow[0].offset += cellSpan

    // update position for cells in other rows if there is rowspan
    if (rowSpan > 1) {
      const start = context.currentRowInFile + 1
      const end = start + (rowSpan - 1)

      for (let r = start; r < end; r++) {
        if (currentCellOffsetsPerRow[r] == null) {
          continue
        }

        const cellOffsetsInRow = currentCellOffsetsPerRow[r]
        const idx = cellOffsetsInRow.length - 1

        if (startCell === cellOffsetsInRow[0].startCell || idx === 0) {
          // if we are in the same spot (or passing it) than the next offset,
          // or there is only one record in the offsets collection
          // then we should increase the next offset
          cellOffsetsInRow[0].startCell += cellSpan
        } else {
          // otherwise increase the limit
          cellOffsetsInRow[cellOffsetsInRow.length - 1].startCell += cellSpan
        }
      }
    }

    const moveToNextOffset = (targetRowIdx) => {
      let removed
      const nextCell = currentCellOffsetsPerRow[targetRowIdx][0].startCell + currentCellOffsetsPerRow[targetRowIdx][0].offset

      if (currentCellOffsetsPerRow[targetRowIdx][1] != null) {
        let shouldMoveToNext = true
        const max = currentCellOffsetsPerRow[targetRowIdx][1].startCell

        for (let c = nextCell; c < max; c++) {
          if (context.usedCells[`${targetRowIdx + 1},${c}`] == null) {
            shouldMoveToNext = false
            break
          }
        }

        if (shouldMoveToNext) {
          removed = currentCellOffsetsPerRow[targetRowIdx].shift()
        }
      }

      return removed
    }

    const removedOffset = moveToNextOffset(context.currentRowInFile)

    // when removing an offset make sure to check if we need to remove also offsets in next
    // rows, if the current cell has rowspan
    if (removedOffset && rowSpan > 1) {
      const start = context.currentRowInFile + 1
      const end = start + (rowSpan - 1)

      for (let r = start; r < end; r++) {
        if (currentCellOffsetsPerRow[r] == null) {
          continue
        }

        const cellOffsetsInRow = currentCellOffsetsPerRow[r]
        const startCell = removedOffset.startCell + removedOffset.offset

        if (startCell === cellOffsetsInRow[0].startCell) {
          moveToNextOffset(r)
        }
      }
    }

    previousCell = {
      rowSpan,
      cellSpan,
      startCell,
      endCell,
      startRow,
      endRow
    }
  }

  // set row height according to the max height of cells in current row
  sheet.getRow(context.currentRowInFile + 1).height = maxHeight

  if (!allCellsAreRowSpan) {
    context.currentRowInFile++
  }
}

function normalizeBorderForRow (pendingCellStylesByRow, rowId, patchedCellBorders, rowsCountMeta) {
  const pendingCellStylesInRow = pendingCellStylesByRow.get(rowId)
  const colIds = [...pendingCellStylesByRow.get(rowId).keys()].sort((a, b) => a - b)
  const totalRows = rowsCountMeta.totalRows
  const rowsInFile = rowsCountMeta.rowsInFile

  for (const colId of colIds) {
    const currentCell = pendingCellStylesInRow.get(colId)

    if (currentCell == null) {
      continue
    }

    let currentIsMergeCell = false

    // for merged cells we should only normalize the border for the start cell
    // we ignore the other placeholder cells, for the start cell we normalize accordingly
    // and get the next cell depending on colspan, rowspan
    if (currentCell.merge != null) {
      if (
        ![currentCell.merge.startRow, currentCell.merge.endRow].includes(rowId) &&
        ![currentCell.merge.startCell, currentCell.merge.endCell].includes(colId)
      ) {
        continue
      }

      currentIsMergeCell = true
    }

    const styles = currentCell.styles

    // skip cell with no explicit border, only when it is not a merge cell
    if (!currentIsMergeCell && styles.border == null) {
      continue
    }

    // make a clone of border first, so we can modify it safely
    styles.border = { ...styles.border }

    const currentBorder = styles.border
    const sourceBorder = currentIsMergeCell ? currentCell.mergeBaseStyle.border : currentBorder

    for (const currentSide of ['top', 'right', 'bottom', 'left']) {
      if (sourceBorder?.[currentSide] == null) {
        continue
      }

      switch (currentSide) {
        case 'top': {
          const isCollapsed = rowId !== 1
          const previousBorderRowId = rowId - 1

          if (currentIsMergeCell && isPartOfMerge(currentCell.merge, previousBorderRowId, colId)) {
            break
          }

          const previousCell = pendingCellStylesByRow.get(previousBorderRowId)?.get(colId)
          const previousBorder = (previousCell?.merge != null ? previousCell.mergeBaseStyle?.border : previousCell?.styles?.border) || {}

          if (
            isCollapsed &&
            (
              previousBorder?.bottom != null &&
              patchedCellBorders.has(`${rowId}-${colId}-top`)
            )
          ) {
            delete currentBorder[currentSide]
          }

          break
        }
        case 'right': {
          const lastColId = colIds[colIds.length - 1]
          const isCollapsed = colId !== lastColId

          if (isCollapsed) {
            const nextColId = colId + 1

            if (nextColId > lastColId) {
              break
            }

            if (currentIsMergeCell && isPartOfMerge(currentCell.merge, rowId, nextColId)) {
              break
            }

            const currentCellIsFullRowspan = currentCell.merge != null && ((currentCell.merge.endRow - currentCell.merge.startRow) + 1) === totalRows
            const nextCell = pendingCellStylesByRow.get(rowId)?.get(nextColId)
            const nextCellIsFullRowspan = nextCell?.merge != null && ((nextCell.merge.endRow - nextCell.merge.startRow) + 1) === totalRows
            let targetSourceBorderValue

            if (!currentCellIsFullRowspan && nextCellIsFullRowspan && rowId > nextCell.merge.startRow) {
              // if the next cell is a full rowspan cell and the current cell is not,
              // then we should get the border from the next cell and apply it to the
              // current cell, this is the opposite of the normal collapsing behavior
              // but this is how browsers resolve it so we replicate it
              targetSourceBorderValue = nextCell.mergeBaseStyle.border?.left
              currentBorder.right = { ...targetSourceBorderValue }
            } else {
              targetSourceBorderValue = sourceBorder?.[currentSide]
            }

            const nextBorder = Object.assign({}, nextCell?.styles?.border)

            if (targetSourceBorderValue == null) {
              break
            }

            nextBorder.left = { ...targetSourceBorderValue }
            patchedCellBorders.add(`${rowId}-${nextColId}-left`)
            pendingCellStylesByRow.get(rowId).get(nextColId).styles.border = nextBorder
          }

          break
        }
        case 'bottom': {
          const isCollapsed = rowsInFile == null ? true : rowId !== rowsInFile

          if (isCollapsed) {
            const nextRowId = rowId + 1

            if (rowsInFile != null && nextRowId > rowsInFile) {
              break
            }

            if (currentIsMergeCell && isPartOfMerge(currentCell.merge, nextRowId, colId)) {
              break
            }

            // stop processing if there is no cell to normalize in the next row
            if (pendingCellStylesByRow.get(nextRowId)?.get(colId) == null) {
              break
            }

            const nextBorder = Object.assign({}, pendingCellStylesByRow.get(nextRowId)?.get(colId)?.styles?.border)

            if (sourceBorder?.[currentSide] == null) {
              break
            }

            nextBorder.top = { ...sourceBorder[currentSide] }
            patchedCellBorders.add(`${nextRowId}-${colId}-top`)
            pendingCellStylesByRow.get(nextRowId).get(colId).styles.border = nextBorder
          }

          break
        }
        case 'left': {
          const isCollapsed = colId !== 1
          const previousBorderColId = colId - 1

          if (currentIsMergeCell && isPartOfMerge(currentCell.merge, rowId, previousBorderColId)) {
            break
          }

          const previousCell = pendingCellStylesByRow.get(rowId)?.get(previousBorderColId)
          const previousBorder = (previousCell?.merge != null ? previousCell.mergeBaseStyle?.border : previousCell?.styles?.border) || {}

          if (
            isCollapsed &&
            (
              previousBorder?.right != null &&
              patchedCellBorders.has(`${rowId}-${colId}-left`)
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

function isPartOfMerge (mergeInfo, targetRowId, targetColId) {
  return (
    targetRowId >= mergeInfo.startRow &&
    targetRowId <= mergeInfo.endRow &&
    targetColId >= mergeInfo.startCell &&
    targetColId <= mergeInfo.endCell
  )
}

function getXlsxStyles (cellInfo) {
  const styles = {}

  styleNames.forEach(([styleName, getStyle]) => {
    const result = getStyle(cellInfo)

    if (result !== undefined) {
      styles[styleName] = result
    }
  })

  return styles
}

function setStyles (cell, styles) {
  for (const [styleName, styleValue] of Object.entries(styles)) {
    if (styleName === 'border' && styleValue != null && Object.keys(styleValue).length === 0) {
      continue
    }

    cell[styleName] = styleValue
  }
}

module.exports = tableToXlsx
