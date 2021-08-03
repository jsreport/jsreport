const path = require('path')
const fs = require('fs')
const moment = require('moment')
const ExcelJS = require('jsreport-exceljs')
const stylesMap = require('./stylesMap')
const styleNames = Object.entries(stylesMap)
const utils = require('./utils')

const styleProperties = [
  'formatStr', 'formatEnum', 'horizontalAlign', 'verticalAlign',
  'wrapText', 'backgroundColor', 'foregroundColor', 'fontSize',
  'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration',
  'border'
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
      parsedStyles: new Map(),
      totalRows: table.rowsCount
    }

    await table.getRows((row) => {
      addRow(sheet, row, context)
    })

    sheet.commit()
  }

  await workbook.commit()

  return fs.createReadStream(outputFilePath)
}

function addRow (sheet, row, context) {
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

    utils.assetLegalXMLChar(cellInfo.valueText)

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
          // we need to set column width before row commit in order
          // to make it work
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
      cell.value = cellInfo.valueText
    }

    const styleValues = {}

    for (const styleProp of styleProperties) {
      styleValues[styleProp] = cellInfo[styleProp]
    }

    const styleKey = JSON.stringify(styleValues)

    let styles

    if (context.parsedStyles.has(styleKey)) {
      styles = context.parsedStyles.get(styleKey)
    } else {
      styles = getXlsxStyles(cellInfo)
      context.parsedStyles.set(styleKey, styles)
    }

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
        }
      }

      sheet.mergeCells(startRow, startCell, endRow, endCell)

      // merged cells share the same style object so setting the style
      // in one cell will do it also for the other cells
      if (Object.keys(styles).length > 0) {
        setStyles(cell, styles)
      }
    } else {
      if (Object.keys(styles).length > 0) {
        setStyles(cell, styles)
      }
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
        if (currentCellOffsetsPerRow[r] != null) {
          const cellOffsetsInRow = currentCellOffsetsPerRow[r]
          cellOffsetsInRow[cellOffsetsInRow.length - 1].startCell += cellSpan
        }
      }
    }

    const nextCell = currentCellOffsetsPerRow[context.currentRowInFile][0].startCell + currentCellOffsetsPerRow[context.currentRowInFile][0].offset

    if (currentCellOffsetsPerRow[context.currentRowInFile][1] != null) {
      let shouldMoveToNext = true

      for (let c = nextCell; c < currentCellOffsetsPerRow[context.currentRowInFile][1].startCell; c++) {
        if (context.usedCells[`${context.currentRowInFile + 1},${c}`] == null) {
          shouldMoveToNext = false
          break
        }
      }

      if (shouldMoveToNext) {
        currentCellOffsetsPerRow[context.currentRowInFile].shift()
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
    sheet.getRow(context.currentRowInFile + 1).commit()
    context.currentRowInFile++
  }
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
    cell[styleName] = styleValue
  }
}

module.exports = tableToXlsx
