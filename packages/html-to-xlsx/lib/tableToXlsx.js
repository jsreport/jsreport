const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const moment = require('moment')
const ExcelJS = require('@jsreport/exceljs')
const { tokenize } = require('excel-formula-tokenizer')
const escapeStringRegexp = require('escape-string-regexp')
const futureFunctionsMap = require('./futureFunctions')
const resolveImageSrc = require('./resolveImageSrc')
const utils = require('./utils')
const stylesMap = require('./stylesMap')
const styleNames = Object.entries(stylesMap)

const styleProperties = [
  'formatStr', 'formatEnum', 'backgroundColor', 'foregroundColor',
  'fontFamily', 'fontSize', 'fontStyle', 'fontWeight',
  'transform', 'textDecoration', 'writingMode', 'textOrientation',
  'verticalAlign', 'horizontalAlign', 'wrapText', 'width',
  'height', 'border'
]

async function tableToXlsx (options, tables, xlsxTemplateBuf, id) {
  const outputFilePath = path.join(options.tmpDir, `${id}.xlsx`)

  const writeTempFileStream = async (filenameOrFn) => {
    const filenameResult = typeof filenameOrFn === 'function' ? filenameOrFn(uuidv4()) : filenameOrFn

    if (filenameResult == null || filenameResult === '') {
      throw new Error('No valid filename')
    }

    if (path.isAbsolute(filenameResult)) {
      throw new Error('Absolute paths are not allowed in writeTempFileStream')
    }

    const pathToFile = path.join(options.tmpDir, filenameResult)
    const filename = path.basename(pathToFile)

    const stream = fs.createWriteStream(pathToFile)

    return {
      pathToFile,
      filename,
      stream
    }
  }

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
    const sheetOpts = {}
    // NOTE: it is important to get the pageSetup props before creating the sheet
    // because some properties are serialized early just when the sheet is created
    const pageSetupProps = normalizePageSetupProperties(table)

    if (pageSetupProps != null) {
      sheetOpts.pageSetup = pageSetupProps
    }

    const sheet = await workbook.addWorksheetAsync(table.name, sheetOpts)

    const usedCells = new Map()

    const context = {
      currentRowInFile: 0,
      currentCellOffsetsPerRow: [],
      pendingCellOffsetsPerRow: [],
      usedCells: {
        get: (row, col) => {
          if (row == null && col == null) {
            // this is used just for debugging purposes
            const rowIndexes = usedCells.keys()
            const result = []

            for (const rowIndex of rowIndexes) {
              const rowItems = usedCells.get(rowIndex)
              const colIndexes = rowItems.keys()

              for (const colIndex of colIndexes) {
                if (rowItems.get(colIndex) !== true) {
                  continue
                }

                result.push(`${rowIndex}.${colIndex}`)
              }
            }

            return result.join(',')
          }

          const targetRow = usedCells.get(row)

          if (targetRow == null) {
            return
          }

          if (col == null) {
            return targetRow
          }

          return targetRow.get(col)
        },
        set: (row, col) => {
          let targetRow = usedCells.get(row)

          if (targetRow == null) {
            targetRow = new Map()
            usedCells.set(row, targetRow)
          }

          if (col == null) {
            throw new Error('col is required')
          }

          targetRow.set(col, true)
        }
      },
      maxWidths: [],
      pendingCellStylesByRow: new Map(),
      parsedStyles: new Map(),
      totalRows: table.rowsCount
    }

    const normalizedBordersInRowSet = new Set()
    const patchedCellBorders = new Set()
    let lastCurrentRowInFile

    await table.getRows(async (row) => {
      const currentRowInFile = context.currentRowInFile
      lastCurrentRowInFile = currentRowInFile

      await addRow(workbook, sheet, row, context, writeTempFileStream)

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

async function addRow (workbook, sheet, row, context, writeTempFileStream) {
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

  const usedCellsInRow = usedCells.get(context.currentRowInFile + 1)

  const allCellsAreRowSpan = (
    row.filter(c => c.rowspan > 1).length === row.length &&
   (usedCellsInRow == null || usedCellsInRow.size === 0)
  )

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

    usedCells.set(cell.row, cell.col)

    if (cellInfo.elements.length > 0) {
      const images = cellInfo.elements.filter(e => e.name === 'image')

      for (const image of images) {
        const { imageContent, imageExtension } = await resolveImageSrc(image.src, writeTempFileStream)

        const addImageOpts = {
          extension: imageExtension
        }

        if (imageContent.type === 'buffer') {
          addImageOpts.buffer = imageContent.data
        } else {
          addImageOpts.filename = imageContent.data
        }

        const imageId = workbook.addImage(addImageOpts)

        sheet.addImage(imageId, {
          // expected 0 based indexes here
          tl: { col: startCell - 1, row: startRow - 1 },
          br: { col: startCell, row: startRow }
        })
      }

      cell.value = null
    } else if (cellInfo.type === 'number') {
      cell.value = parseFloat(cellInfo.valueText)
    } else if (cellInfo.type === 'bool' || cellInfo.type === 'boolean') {
      cell.value = cellInfo.valueText === 'true' || cellInfo.valueText === '1'
    } else if (cellInfo.type === 'date') {
      cell.value = moment.utc(cellInfo.valueText).toDate()
      cell.numFmt = 'yyyy-mm-dd'
    } else if (cellInfo.type === 'datetime') {
      cell.value = moment.utc(cellInfo.valueText).toDate()
      cell.numFmt = 'yyyy-mm-dd h:mm:ss'
    } else if (cellInfo.type === 'formula') {
      cell.value = {
        formula: prefixIfFutureFunction(cellInfo.valueText)
      }
    } else {
      if (cellInfo.valueText !== '') {
        // if text contains new lines or tab then we set the cell as rich text for the excel
        // to render the new lines, tabs correctly.
        // cellInfo.valueText will contain the text with the new lines as it is when the html
        // contains style (like: white-space:pre;) that indicates that white space should be preserved
        if (cellInfo.valueText.includes('\n') || cellInfo.valueText.includes('\t')) {
          cell.value = {
            richText: [{ text: cellInfo.valueText }]
          }

          if (!cell.alignment) {
            cell.alignment = {}
          }

          // this is needed for excel to render new lines in rich text
          cell.alignment.wrapText = true
        } else {
          cell.value = cellInfo.valueText
        }
      } else {
        cell.value = null
      }
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
      const parsedStyles = getXlsxStyles(cellInfo, cell)
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
          if (usedCells.get(r, c) == null) {
            usedCells.set(r, c)
          }

          if (!pendingCellStylesByRow.has(r)) {
            pendingCellStylesByRow.set(r, new Map())
          }

          // eslint-disable-next-line no-undef
          const newStyles = structuredClone(styles)

          const basePendingItem = {
            styles: {}
          }

          // share style only for the bounds of merge cell
          if (
            (
              r === startRow &&
              (c >= startCell && c <= endCell)
            ) || (
              r === endRow &&
              (c >= startCell && c <= endCell)
            ) || (
              r > startRow && r < endRow &&
              (c === startCell || c === endCell)
            )
          ) {
            // eslint-disable-next-line no-undef
            basePendingItem.styles = structuredClone(pendingCellStyleEntry.styles)
          }

          const pendingItem = Object.assign({}, basePendingItem, {
            merge: { startRow, endRow, startCell, endCell },
            mergeBaseStyle: newStyles
          })

          pendingCellStylesByRow.get(r).set(c, pendingItem)
        }
      }

      // NOTE: we should merge without styles to prevent cell.styles to be a shared instance
      // across all the merged cells, we dont want that because we customize the borders and that
      // needs that we dont end with shared styles, otherwise what we modify on one cell
      // will affect the other cells
      sheet.mergeCellsWithoutStyle(startRow, startCell, endRow, endCell)
    } else {
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
          if (context.usedCells.get(targetRowIdx + 1, c) == null) {
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

            // stop processing if there is no cell to normalize in the next row
            if (!pendingCellStylesByRow.get(rowId).has(nextColId)) {
              break
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

function getXlsxStyles (cellInfo, cell) {
  const styles = {}

  styleNames.forEach(([styleName, getStyle]) => {
    const result = getStyle(cellInfo, cell)

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

function prefixIfFutureFunction (formulaStr) {
  // in the future, if we need to work with ast like structure for formula, check:
  // https://github.com/psalaets/excel-formula-ast
  // if at some point in the future we need to detect if formula contain usage of array formulas
  // then check the following information as theory:
  // - https://support.microsoft.com/en-us/office/guidelines-and-examples-of-array-formulas-7d94a64e-3ff3-4686-9372-ecfd5caa57c7#:~:text=Array%20formula%20syntax,Enter%20to%20enter%20your%20formula.
  // - https://support.microsoft.com/en-us/office/excel-functions-that-return-ranges-or-arrays-7d1970e2-cbaa-4279-b59c-b9dd3900fc69
  // - https://support.microsoft.com/en-us/office/dynamic-array-formulas-and-spilled-array-behavior-205c6b06-03ba-4151-89a1-87a7eb36e531
  // - https://hyperformula.handsontable.com/guide/arrays.html#about-arrays
  const tokens = tokenize(formulaStr)

  const itemsToReplace = []

  for (const token of tokens) {
    if (token.type === 'function' && token.subtype === 'start') {
      // function detected
      const prefix = futureFunctionsMap.get(token.value)

      if (prefix) {
        itemsToReplace.push({
          target: token.value,
          prefix
        })
      }
    }
  }

  let newFormulaStr = formulaStr
  let formulaStrOffset = 0

  while (itemsToReplace.length > 0) {
    const itemToReplace = itemsToReplace[0]
    const targetStr = newFormulaStr.slice(formulaStrOffset)

    newFormulaStr = newFormulaStr.slice(0, formulaStrOffset) + targetStr.replace(
      new RegExp(`.?${escapeStringRegexp(itemToReplace.target)}\\(`),
      function (match, offset) {
        const haveLeadingCharacter = (itemToReplace.target.length + 1) !== match.length

        formulaStrOffset += offset + match.length

        if (haveLeadingCharacter && match[0] === '.') {
          // no update for calls that have a ".", this prevents prefixing a fn
          // that was already prefixed by the user in the input
          return match
        }

        itemsToReplace.shift()
        const prefix = `${itemToReplace.prefix}.`
        formulaStrOffset += prefix.length

        return `${haveLeadingCharacter ? match[0] : ''}${prefix}${haveLeadingCharacter ? match.slice(1) : match}`
      }
    )
  }

  return newFormulaStr
}

function normalizePageSetupProperties (table) {
  if (!table.pageSetup) {
    return
  }

  const pageSetup = {}

  if (table.pageSetup.orientation != null) {
    const validValues = ['landscape', 'portrait']

    if (!validValues.includes(table.pageSetup.orientation)) {
      throw new Error(`The page orientation property should be one of these values "landscape", "portrait", received: ${table.pageSetup.orientation}`)
    }

    pageSetup.orientation = table.pageSetup.orientation
  }

  if (table.pageSetup.paperSize != null) {
    const valuesMap = new Map([
      ['Letter', undefined],
      ['Legal', 5],
      ['Executive', 7],
      ['A3', 8],
      ['A4', 9],
      ['A5', 11],
      ['B5-JIS', 13],
      ['Envelope-10', 20],
      ['Envelope-DL', 27],
      ['Envelope-C5', 28],
      ['Envelope-B5', 34],
      ['Envelope-Monarch', 37],
      ['Double-Japan-Postcard-Rotated', 82],
      ['16K-197x273', 119]
    ])

    const validValues = Array.from(valuesMap.keys())

    if (!validValues.includes(table.pageSetup.paperSize)) {
      throw new Error(`The page orientation property should be one of these values "landscape", "portrait", received: ${table.pageSetup.orientation}`)
    }

    pageSetup.paperSize = valuesMap.get(table.pageSetup.paperSize)
  }

  if (table.pageSetup.printArea != null) {
    pageSetup.printArea = table.pageSetup.printArea
  }

  if (table.pageSetup.printTitlesRow != null) {
    pageSetup.printTitlesRow = table.pageSetup.printTitlesRow
  }

  if (table.pageSetup.printTitlesColumn != null) {
    pageSetup.printTitlesColumn = table.pageSetup.printTitlesColumn
  }

  if (table.pageSetup.margins != null) {
    const sides = ['left', 'right', 'top', 'bottom', 'header', 'footer']

    for (const side of sides) {
      if (table.pageSetup.margins[side] == null) {
        continue
      }

      const parsedValue = parseFloat(table.pageSetup.margins[side])

      if (isNaN(parsedValue)) {
        throw new Error(`The page margin ${side} property should be a number, received: ${table.pageSetup.margins[side]}`)
      }

      pageSetup.margins = pageSetup.margins || {}
      pageSetup.margins[side] = parsedValue
    }
  }

  if (table.pageSetup.scale != null) {
    const parsedValue = parseFloat(table.pageSetup.scale)

    if (isNaN(parsedValue)) {
      throw new Error(`The page scale property should be a number, received: ${table.pageSetup.scale}`)
    }

    pageSetup.scale = parsedValue
    pageSetup.fitToPage = false
  } else if (table.pageSetup.fitToWidth != null || table.pageSetup.fitToHeight != null) {
    if (table.pageSetup.fitToWidth != null) {
      const parsedValue = parseInt(table.pageSetup.fitToWidth, 10)

      if (isNaN(parsedValue)) {
        throw new Error(`The page fit to width property should be an integer, received: ${table.pageSetup.fitToWidth}`)
      }

      pageSetup.fitToWidth = parsedValue
    }

    if (table.pageSetup.fitToHeight != null) {
      const parsedValue = parseInt(table.pageSetup.fitToHeight, 10)

      if (isNaN(parsedValue)) {
        throw new Error(`The page fit to height property should be an integer, received: ${table.pageSetup.fitToHeight}`)
      }

      pageSetup.fitToHeight = parsedValue
    }

    pageSetup.fitToPage = true
  }

  if (table.pageSetup.pageOrder != null) {
    const validValues = ['downThenOver', 'overThenDown']

    if (!validValues.includes(table.pageSetup.pageOrder)) {
      throw new Error(`The page order property should be one of these values "downThenOver", "overThenDown", received: ${table.pageSetup.pageOrder}`)
    }

    pageSetup.pageOrder = table.pageSetup.pageOrder
  }

  if (table.pageSetup.blackAndWhite != null) {
    const parsedValue = parseInt(table.pageSetup.blackAndWhite, 10)

    if (isNaN(parsedValue)) {
      throw new Error(`The page blackAndWhite property should be an integer, received: ${table.pageSetup.blackAndWhite}`)
    }

    if (parsedValue !== 0 && parsedValue !== 1) {
      throw new Error(`The page blackAndWhite property should be 0 or 1, received: ${table.pageSetup.blackAndWhite}`)
    }

    pageSetup.blackAndWhite = parsedValue === 1
  }

  if (table.pageSetup.draft != null) {
    const parsedValue = parseInt(table.pageSetup.draft, 10)

    if (isNaN(parsedValue)) {
      throw new Error(`The page draft property should be an integer, received: ${table.pageSetup.draft}`)
    }

    if (parsedValue !== 0 && parsedValue !== 1) {
      throw new Error(`The page draft property should be 0 or 1, received: ${table.pageSetup.draft}`)
    }

    pageSetup.draft = parsedValue === 1
  }

  if (table.pageSetup.cellComments != null) {
    const validValues = ['None', 'atEnd', 'asDisplayed']

    if (!validValues.includes(table.pageSetup.cellComments)) {
      throw new Error(`The page cell comments property should be one of these values "None", "AtEnd", "InPlace", received: ${table.pageSetup.cellComments}`)
    }

    pageSetup.cellComments = table.pageSetup.cellComments
  }

  if (table.pageSetup.errors != null) {
    const validValues = ['dash', 'blank', 'NA', 'displayed']

    if (!validValues.includes(table.pageSetup.errors)) {
      throw new Error(`The page errors property should be one of these values "dash", "blank", "NA", "displayed", received: ${table.pageSetup.errors}`)
    }

    pageSetup.errors = table.pageSetup.errors
  }

  if (table.pageSetup.showRowColHeaders != null) {
    const parsedValue = parseInt(table.pageSetup.showRowColHeaders, 10)

    if (isNaN(parsedValue)) {
      throw new Error(`The page showRowColHeaders property should be an integer, received: ${table.pageSetup.showRowColHeaders}`)
    }

    if (parsedValue !== 0 && parsedValue !== 1) {
      throw new Error(`The page showRowColHeaders property should be 0 or 1, received: ${table.pageSetup.showRowColHeaders}`)
    }

    pageSetup.showRowColHeaders = parsedValue === 1
  }

  if (table.pageSetup.showGridLines != null) {
    const parsedValue = parseInt(table.pageSetup.showGridLines, 10)

    if (isNaN(parsedValue)) {
      throw new Error(`The page showGridLines property should be an integer, received: ${table.pageSetup.showGridLines}`)
    }

    if (parsedValue !== 0 && parsedValue !== 1) {
      throw new Error(`The page showGridLines property should be 0 or 1, received: ${table.pageSetup.showGridLines}`)
    }

    pageSetup.showGridLines = parsedValue === 1
  }

  if (table.pageSetup.firstPageNumber != null) {
    const parsedValue = parseInt(table.pageSetup.firstPageNumber, 10)

    if (isNaN(parsedValue)) {
      throw new Error(`The page firstPageNumber property should be an integer, received: ${table.pageSetup.firstPageNumber}`)
    }

    pageSetup.firstPageNumber = parsedValue
  }

  if (table.pageSetup.horizontalCentered != null) {
    const parsedValue = parseInt(table.pageSetup.horizontalCentered, 10)

    if (isNaN(parsedValue)) {
      throw new Error(`The page horizontalCentered property should be an integer, received: ${table.pageSetup.horizontalCentered}`)
    }

    if (parsedValue !== 0 && parsedValue !== 1) {
      throw new Error(`The page horizontalCentered property should be 0 or 1, received: ${table.pageSetup.horizontalCentered}`)
    }

    pageSetup.horizontalCentered = parsedValue === 1
  }

  if (table.pageSetup.verticalCentered != null) {
    const parsedValue = parseInt(table.pageSetup.verticalCentered, 10)

    if (isNaN(parsedValue)) {
      throw new Error(`The page verticalCentered property should be an integer, received: ${table.pageSetup.verticalCentered}`)
    }

    if (parsedValue !== 0 && parsedValue !== 1) {
      throw new Error(`The page verticalCentered property should be 0 or 1, received: ${table.pageSetup.verticalCentered}`)
    }

    pageSetup.verticalCentered = parsedValue === 1
  }

  if (Object.keys(pageSetup).length === 0) {
    return
  }

  return pageSetup
}

module.exports = tableToXlsx
