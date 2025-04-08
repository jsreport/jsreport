/* eslint no-unused-vars: 0 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
function pptxList (data, options) {
  const Handlebars = require('handlebars')
  return Handlebars.helpers.each(data, options)
}

function pptxTable (data, options) {
  const Handlebars = require('handlebars')
  const optionsToUse = options == null ? data : options
  let currentData

  const getMatchedMergedCell = (rowIndex, columnIndex, activeMergedCellsItems) => {
    let matchedRowspan

    for (const item of activeMergedCellsItems) {
      if (
        rowIndex >= item.rowStart &&
        rowIndex <= item.rowEnd &&
        columnIndex >= item.colStart &&
        columnIndex <= item.colEnd
      ) {
        matchedRowspan = item
        break
      }
    }

    return matchedRowspan
  }

  if (
    arguments.length === 1 &&
    Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'wrapper') &&
    optionsToUse.hash.wrapper === 'main'
  ) {
    const newData = Handlebars.createFrame(optionsToUse.data)
    newData.rows = optionsToUse.hash.rows
    newData.columns = optionsToUse.hash.columns
    newData.activeMergedCellsItems = []
    return optionsToUse.fn(this, { data: newData })
  }

  if (
    arguments.length === 1 &&
    Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'check')
  ) {
    if (
      optionsToUse.hash.check === 'colspan'
    ) {
      const matchedMergedCell = getMatchedMergedCell(optionsToUse.data.rowIndex, optionsToUse.data.columnIndex, optionsToUse.data.activeMergedCellsItems)

      if (matchedMergedCell != null && matchedMergedCell.colStart !== matchedMergedCell.colEnd) {
        const data = Handlebars.createFrame(optionsToUse.data)
        data.empty = matchedMergedCell.colStart !== optionsToUse.data.columnIndex
        return optionsToUse.fn({}, { data })
      }
    }

    if (
      optionsToUse.hash.check === 'rowspan'
    ) {
      const matchedMergedCell = getMatchedMergedCell(optionsToUse.data.rowIndex, optionsToUse.data.columnIndex, optionsToUse.data.activeMergedCellsItems)

      if (matchedMergedCell != null && matchedMergedCell.rowStart !== matchedMergedCell.rowEnd) {
        const data = Handlebars.createFrame(optionsToUse.data)
        data.empty = matchedMergedCell.rowStart !== optionsToUse.data.rowIndex
        return optionsToUse.fn({}, { data })
      }
    }

    if (
      optionsToUse.hash.check === 'grid'
    ) {
      const data = Handlebars.createFrame(optionsToUse.data)
      data.currentCol = { index: null }
      data.explicitColsWidth = optionsToUse.hash.colsWidth ?? []
      data.explicitColsWidth = { values: data.explicitColsWidth, customized: optionsToUse.hash.colsWidth != null }
      const pptxProcessTableGrid = require('pptxProcessTableGrid')
      const tableGridXMLStr = optionsToUse.fn(this, { data })
      return pptxProcessTableGrid(tableGridXMLStr, data.explicitColsWidth.customized)
    }

    if (
      optionsToUse.hash.check === 'colWidth'
    ) {
      const currentCol = optionsToUse.data.currentCol
      const colsWidth = optionsToUse.data.explicitColsWidth?.values
      const originalWidth = optionsToUse.hash.o

      if (currentCol == null) {
        throw new Error('pptxTable check="colWidth" helper invalid usage, currentCol was not found')
      }

      if (colsWidth == null) {
        throw new Error('pptxTable check="colWidth" helper invalid usage, explicitColsWidth was not found')
      }

      if (currentCol.index == null) {
        currentCol.index = 0
      } else {
        currentCol.index += 1
      }

      const currentColIdx = currentCol.index

      if (colsWidth[currentColIdx] != null) {
        const getColWidth = require('pptxGetColWidth')
        const colWidth = getColWidth(colsWidth[currentColIdx])

        if (colWidth == null) {
          throw new Error(
            `pptxTable helper requires colsWidth parameter to contain valid values. widths passed should be valid number with unit (cm or px). got ${
              colsWidth[currentColIdx]
            } at index ${currentColIdx}`
          )
        }

        return colWidth
      }

      return originalWidth
    }

    return new Handlebars.SafeString('')
  }

  if (
    arguments.length === 1 &&
    (
      Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'rows') ||
      Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'columns') ||
      Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'ignore')
    )
  ) {
    // full table mode
    if (Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'rows')) {
      if (!Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'columns')) {
        throw new Error('pptxTable full table mode needs to have both rows and columns defined as params when processing row')
      }

      // rows block processing start here
      currentData = optionsToUse.hash.rows

      const newData = Handlebars.createFrame(optionsToUse.data)
      optionsToUse.data = newData

      const chunks = []

      if (!currentData || !Array.isArray(currentData)) {
        return new Handlebars.SafeString('')
      }

      for (let i = 0; i < currentData.length; i++) {
        newData.index = i
        chunks.push(optionsToUse.fn(this, { data: newData }))
      }

      return new Handlebars.SafeString(chunks.join(''))
    } else {
      // columns processing, when isInsideRowHelper is false it means
      // that we are processing the first row based on columns info,
      // when true it means we are processing columns inside the rows block
      let isInsideRowHelper = false

      if (optionsToUse.hash.columns) {
        currentData = optionsToUse.hash.columns
      } else if (optionsToUse.data && optionsToUse.data.columns) {
        isInsideRowHelper = true
        currentData = optionsToUse.data.columns
      } else {
        throw new Error('pptxTable full table mode needs to have columns defined when processing column')
      }

      const chunks = []

      const newData = Handlebars.createFrame(optionsToUse.data)
      const rowIndex = newData.index || 0

      delete newData.index
      delete newData.key
      delete newData.first
      delete newData.last

      if (!currentData || !Array.isArray(currentData)) {
        return new Handlebars.SafeString('')
      }

      const getCellInfo = (item) => {
        const cellInfo = {}

        if (item != null && typeof item === 'object' && !Array.isArray(item)) {
          cellInfo.value = item.value
          cellInfo.colspan = item.colspan
          cellInfo.rowspan = item.rowspan
        } else {
          cellInfo.value = item
        }

        if (cellInfo.colspan == null) {
          cellInfo.colspan = 1
        }

        if (cellInfo.rowspan == null) {
          cellInfo.rowspan = 1
        }

        return cellInfo
      }

      // if all cells in current row have the same rowspan then
      // assume there is no rowspan applied
      const cellsInRow = isInsideRowHelper ? optionsToUse.data.rows[rowIndex] : currentData
      const pendingCells = [...cellsInRow].map((item, idx) => ({ idx, item }))
      let lastColumnIdx

      while (pendingCells.length > 0) {
        const savedLastColumnIdx = lastColumnIdx
        const { idx, item, placeholder } = pendingCells.shift()

        // rowIndex + 1 because this is technically the second row on table after the row of table headers
        newData.rowIndex = isInsideRowHelper ? rowIndex + 1 : 0

        if (placeholder) {
          newData.columnIndex = idx
        } else {
          newData.columnIndex = cellsInRow.reduce((acu, cell, cellIdx) => {
            if (cellIdx >= idx) {
              return acu
            }

            const matchedMergedCell = getMatchedMergedCell(newData.rowIndex, acu, newData.activeMergedCellsItems)

            if (matchedMergedCell != null && matchedMergedCell.colStart !== matchedMergedCell.colEnd) {
              return acu + (matchedMergedCell.colEnd - matchedMergedCell.colStart) + 1
            }

            const cellInfo = getCellInfo(cell)
            return acu + cellInfo.colspan
          }, 0)

          lastColumnIdx = newData.columnIndex
        }

        const currentItem = isInsideRowHelper && !placeholder ? optionsToUse.data.rows[rowIndex][idx] : item
        const cellInfo = getCellInfo(currentItem)

        const allCellsInRowHaveSameRowspan = cellsInRow.every((cell) => {
          const cellInfo = getCellInfo(cell)
          return cellInfo.rowspan === getCellInfo(cellsInRow[0]).rowspan
        })

        if (allCellsInRowHaveSameRowspan) {
          cellInfo.rowspan = 1
        }

        newData.colspan = cellInfo.colspan
        newData.rowspan = cellInfo.rowspan

        const colsDiff = (savedLastColumnIdx == null || placeholder === true) ? 0 : newData.columnIndex - savedLastColumnIdx

        if (colsDiff > 1) {
          const activeMergedCell = getMatchedMergedCell(newData.rowIndex, savedLastColumnIdx + 1, newData.activeMergedCellsItems)

          // this means that it is merged cell created from a definition that has both rowspan and colspan
          if (
            activeMergedCell != null &&
            activeMergedCell.rowStart !== activeMergedCell.rowEnd &&
            activeMergedCell.colStart !== activeMergedCell.colEnd &&
            activeMergedCell.rowStart !== newData.rowIndex
          ) {
            const cellsToAdd = []

            for (let i = 1; i < colsDiff; i++) {
              cellsToAdd.push({ idx: savedLastColumnIdx + i, item: { value: '' }, placeholder: true })
            }

            if (cellsToAdd.length > 0) {
              // adding the current item so it is not lost
              cellsToAdd.push({ idx, item, placeholder })
              pendingCells.unshift(...cellsToAdd)
              continue
            }
          }
        }

        if (newData.rowspan > 1 || newData.colspan > 1) {
          newData.activeMergedCellsItems.push({
            colStart: newData.columnIndex,
            colEnd: newData.columnIndex + (newData.colspan - 1),
            rowStart: newData.rowIndex,
            rowEnd: newData.rowIndex + (newData.rowspan - 1)
          })
        }

        const matchedMergedCell = getMatchedMergedCell(newData.rowIndex, newData.columnIndex, newData.activeMergedCellsItems)

        if (
          matchedMergedCell != null &&
          matchedMergedCell.rowStart !== matchedMergedCell.rowEnd &&
          matchedMergedCell.rowStart !== newData.rowIndex
        ) {
          newData.placeholderCell = true

          if (matchedMergedCell.colStart === newData.columnIndex) {
            newData.colspan = (matchedMergedCell.colEnd - matchedMergedCell.colStart) + 1
          }
        } else if (
          matchedMergedCell != null &&
          matchedMergedCell.colStart !== matchedMergedCell.colEnd &&
          matchedMergedCell.colStart !== newData.columnIndex
        ) {
          newData.placeholderCell = true
          newData.rowspan = (matchedMergedCell.rowEnd - matchedMergedCell.rowStart) + 1
        } else {
          newData.placeholderCell = false
        }

        chunks.push(optionsToUse.fn(cellInfo.value, { data: newData }))

        if (item?.colspan > 1) {
          const placeholderCells = []

          for (let i = 1; i < item.colspan; i++) {
            placeholderCells.push({ idx: lastColumnIdx + i, item: { value: '' }, placeholder: true })
          }

          if (placeholderCells.length > 0) {
            pendingCells.unshift(...placeholderCells)
          }
        }
      }

      return new Handlebars.SafeString(chunks.join(''))
    }
  } else {
    currentData = data
  }

  return Handlebars.helpers.each(currentData, optionsToUse)
}

function pptxStyle (options) {
  const Handlebars = require('handlebars')

  const textColor = options.hash.textColor || ''
  const backgroundColor = options.hash.backgroundColor || ''

  return new Handlebars.SafeString(
    `<pptxStyle id="${options.hash.id}" textColor="${textColor}" backgroundColor="${backgroundColor}" />`
  )
}

function pptxSlides (data, options) {
  const Handlebars = require('handlebars')
  return Handlebars.helpers.each(data, options)
}

function pptxImage (options) {
  const Handlebars = require('handlebars')

  if (!options.hash.src) {
    throw new Error(
      'pptxImage helper requires src parameter to be set'
    )
  }

  if (
    !options.hash.src.startsWith('data:image/png;base64,') &&
    !options.hash.src.startsWith('data:image/jpeg;base64,') &&
    !options.hash.src.startsWith('http://') &&
    !options.hash.src.startsWith('https://')
  ) {
    throw new Error(
      'pptxImage helper requires src parameter to be valid data uri for png or jpeg image or a valid url. Got ' +
        options.hash.src
    )
  }

  const isValidDimensionUnit = value => {
    const regexp = /^(\d+(.\d+)?)(cm|px)$/
    return regexp.test(value)
  }

  if (
    options.hash.width != null &&
      !isValidDimensionUnit(options.hash.width)
  ) {
    throw new Error(
      'pptxImage helper requires width parameter to be valid number with unit (cm or px). got ' +
        options.hash.width
    )
  }

  if (
    options.hash.height != null &&
      !isValidDimensionUnit(options.hash.height)
  ) {
    throw new Error(
      'pptxImage helper requires height parameter to be valid number with unit (cm or px). got ' +
        options.hash.height
    )
  }

  const content = `$pptxImage${
    Buffer.from(JSON.stringify({
      src: options.hash.src,
      width: options.hash.width,
      height: options.hash.height,
      usePlaceholderSize:
          options.hash.usePlaceholderSize === true ||
          options.hash.usePlaceholderSize === 'true'
    })).toString('base64')
  }$`

  return new Handlebars.SafeString(`<pptxImage>${content}</pptxImage>`)
}

function pptxChart (options) {
  const Handlebars = require('handlebars')

  if (options.hash.data == null) {
    throw new Error('pptxChart helper requires data parameter to be set')
  }

  if (!Array.isArray(options.hash.data.labels) || options.hash.data.labels.length === 0) {
    throw new Error('pptxChart helper requires data parameter with labels to be set, data.labels must be an array with items')
  }

  if (!Array.isArray(options.hash.data.datasets) || options.hash.data.datasets.length === 0) {
    throw new Error('pptxChart helper requires data parameter with datasets to be set, data.datasets must be an array with items')
  }

  if (
    options.hash.options != null &&
      (
        typeof options.hash.options !== 'object' ||
        Array.isArray(options.hash.options)
      )
  ) {
    throw new Error('pptxChart helper when options parameter is set, it should be an object')
  }

  return new Handlebars.SafeString('$pptxChart' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}
