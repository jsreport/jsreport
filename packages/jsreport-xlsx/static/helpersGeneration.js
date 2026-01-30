/* global structuredClone */
/* eslint no-unused-vars: 0 */

function xlsxContext (options) {
  const Handlebars = require('handlebars')
  const { type: contextType, path: xlsxFilePath } = options.hash
  let data

  if (contextType === 'global') {
    const jsreport = require('jsreport-proxy')
    data = Handlebars.createFrame(options.data)
    data.evalId = jsreport.req.context.__xlsxSharedData.evalId
  } else if (contextType === 'file') {
    const jsreport = require('jsreport-proxy')
    const fileData = jsreport.req.context.__xlsxSharedData.fileDataMap.get(xlsxFilePath)

    data = Handlebars.createFrame(options.data)

    if (fileData?.dataVariables != null) {
      Object.assign(data, fileData.dataVariables)
    }

    data.xlsxFilePath = xlsxFilePath
  }

  const context = {}

  if (data) {
    context.data = data
  }

  const result = options.fn(this, context)

  return result
}

function xlsxCType (options) {
  const type = options.hash.t

  if (type == null) {
    throw new Error('xlsxCType helper requires type parameter to be set')
  }

  const validTypes = ['s', 'b', 'n']

  if (!validTypes.includes(type)) {
    throw new Error(`xlsxCType helper requires type parameter to be one of: ${validTypes.join(', ')}`)
  }

  options.data.cellType = type === 's' ? 'inlineStr' : type

  return ''
}

function xlsxColAutofit (options) {
  const jsreport = require('jsreport-proxy')
  const { runtime } = jsreport.req.context.__xlsxSharedData.fileDataMap.get(options.data.xlsxFilePath)

  if (
    runtime.autoFit.enabledFor.length > 0 &&
    options.hash.all === true
  ) {
    runtime.autoFit.enabledFor = [true]
  }

  const allColsEnabled = runtime.autoFit.enabledFor[0] === true

  if (!allColsEnabled) {
    for (const [colLetter] of runtime.autoFit.cols) {
      // remove cells that are not enabled for autofit
      if (!runtime.autoFit.enabledFor.includes(colLetter)) {
        runtime.autoFit.cols.delete(colLetter)
      }
    }
  }

  return ''
}

function xlsxChart (options) {
  const jsreport = require('jsreport-proxy')
  const { runtime } = jsreport.req.context.__xlsxSharedData.fileDataMap.get(options.data.xlsxFilePath)

  if (options.hash.data == null) {
    throw new Error('xlsxChart helper requires data parameter to be set')
  }

  if (!Array.isArray(options.hash.data.labels) || options.hash.data.labels.length === 0) {
    throw new Error('xlsxChart helper requires data parameter with labels to be set, data.labels must be an array with items')
  }

  if (!Array.isArray(options.hash.data.datasets) || options.hash.data.datasets.length === 0) {
    throw new Error('xlsxChart helper requires data parameter with datasets to be set, data.datasets must be an array with items')
  }

  if (
    options.hash.options != null &&
      (
        typeof options.hash.options !== 'object' ||
        Array.isArray(options.hash.options)
      )
  ) {
    throw new Error('xlsxChart helper when options parameter is set, it should be an object')
  }

  runtime.configuration.data = options.hash.data
  runtime.configuration.options = options.hash.options

  return ''
}

const __xlsxD = (function () {
  let __assetOkHelper

  function assertOk (...args) {
    let fn

    if (__assetOkHelper == null) {
      const { helpers: { generationUtils } } = getSharedData()
      __assetOkHelper = generationUtils.assertOk
      fn = generationUtils.assertOk
    } else {
      fn = __assetOkHelper
    }

    return fn(...args)
  }

  function getSharedData () {
    const jsreport = require('jsreport-proxy')

    if (jsreport.req.context.__xlsxSharedData == null) {
      throw new Error('__xlsxSharedData needs to exists on request context')
    }

    return jsreport.req.context.__xlsxSharedData
  }

  function getFileData (xlsxFilePath) {
    assertOk(xlsxFilePath != null, 'xlsxFilePath needs to exists on internal data')

    const { fileDataMap } = getSharedData()

    assertOk(fileDataMap != null, 'fileDataMap needs to exists on internal data')

    return fileDataMap.get(xlsxFilePath)
  }

  // helper to allow ignoring handlebars tags in specific cases
  function raw (options) {
    return options.fn()
  }

  function staticRange (options) {
    const startElementIdx = options.hash.start
    const endElementIdx = options.hash.end

    assertOk(startElementIdx != null, 'start arg is required')
    assertOk(endElementIdx != null, 'end arg is required')

    const { templateItems } = getFileData(options.data.xlsxFilePath)

    for (let elementIdx = startElementIdx; elementIdx <= endElementIdx; elementIdx++) {
      const elementItem = templateItems.data[elementIdx]
      const elementItemType = elementItem.type ?? 'row'

      if (elementItemType === 'row') {
        const elementItemMeta = templateItems.elementMetaMap.get(elementItem)

        options.fn({
          rowNumber: elementItem.id,
          cells: [...elementItemMeta.columnLetterChildrenMap.keys()]
        })
      } else {
        throw new Error(`staticRange helper does not support element item type "${elementItemType}"`)
      }
    }

    return ''
  }

  // executes a different types of loops over data and tracks the loop information in the internal data
  // to update row, cell indexes
  function loop (...args) {
    let data
    let options

    if (args.length === 1) {
      options = args[0]
    } else {
      data = args[0]
      options = args[1]
    }

    const Handlebars = require('handlebars')
    const customCells = options.hash.cells
    const customCellsForColumns = options.hash.cellsT === 'columns'
    const start = options.hash.start
    const columnStart = options.hash.columnStart
    const end = options.hash.end
    const columnEnd = options.hash.columnEnd
    const hierarchyId = options.hash.hierarchyId
    const newData = Handlebars.createFrame(options.data)
    const isVertical = Object.hasOwn(options.hash, 'vertical')

    const { helpers: { generationUtils: { getParentLoopItemByHierarchy } } } = getSharedData()
    const { runtime } = getFileData(options.data.xlsxFilePath)

    assertOk(start != null, 'start arg is required')
    assertOk(columnStart != null, 'columnStart arg is required')
    assertOk(columnEnd != null, 'columnEnd arg is required')
    assertOk(hierarchyId != null, 'hierarchyId arg is required')

    let targetData = data

    if (Object.hasOwn(options.hash, 'cells')) {
      targetData = customCells

      if (customCells == null || customCells.length === 0) {
        newData.emptyCells = true
      }
    } else if (customCellsForColumns) {
      targetData = options.data.emptyCells === true ? [] : this
    }

    // for empty we create an array with one empty object,
    // this is needed because we want to preserve the original row
    if (
      targetData == null ||
      (Array.isArray(targetData) && targetData.length === 0)
    ) {
      targetData = [{}]
    }

    let type

    if (customCells) {
      type = 'row'
    } else if (isVertical || customCellsForColumns) {
      type = 'vertical'
    } else {
      type = end == null ? 'row' : 'block'
    }

    const loopItem = {
      type,
      id: null,
      hierarchyId,
      start,
      columnStart,
      end,
      columnEnd,
      length: targetData.length,
      parentLoopIndex: options.data.index,
      children: [],
      completed: false
    }

    if (type === 'vertical') {
      loopItem.rowNumber = options.data.r
      loopItem.trackedCells = new Map()
    }

    const parentLoopItem = getParentLoopItemByHierarchy(loopItem, runtime.loops.data)

    let container

    if (parentLoopItem) {
      container = parentLoopItem.children
    } else {
      container = runtime.loops.data
    }

    loopItem.id = `${parentLoopItem != null ? `${parentLoopItem.id}#` : ''}${container.length}`

    container.push(loopItem)

    newData.currentLoopId = loopItem.id

    runtime.loops.evaluated.push(loopItem.id)

    const nonExistingCellsInCurrentLoop = runtime.loops.nonExistingCellRefsByLoopHierarchy.get(hierarchyId) ?? []

    // updating the currentLoopId for the non existing cells that are part of this loop
    for (const nonExistingCellRef of nonExistingCellsInCurrentLoop) {
      const trackedCell = runtime.trackedCells.get(nonExistingCellRef)
      trackedCell.currentLoopId = loopItem.id
    }

    const dynamicCells = customCells || customCellsForColumns

    if (dynamicCells && !Array.isArray(targetData)) {
      throw new Error(`Invalid data to generate dynamic cells. data for ${customCells ? 'rows' : 'columns'} is not an array`)
    }

    for (let i = 0; i < targetData.length; i++) {
      newData.index = i
      newData.key = i

      if (customCellsForColumns) {
        newData.firstColumn = i === 0
        newData.lastColumn = i === targetData.length - 1
        newData.columnIndex = i
      } else {
        newData.first = i === 0
        newData.last = i === targetData.length - 1
      }

      if (customCells) {
        newData.rowIndex = i
      }

      let dataForItem = targetData[i]

      if (dynamicCells && dataForItem != null && typeof dataForItem === 'object' && !Array.isArray(dataForItem)) {
        // when dynamic cells if data is plain object, use the value property
        dataForItem = dataForItem.value ?? ''
      }

      const newOptions = {
        ...options,
        data: newData
      }

      const addBlockParams = options.fn.blockParams != null && options.fn.blockParams > 0

      if (addBlockParams) {
        // since we use our custom loop helper (not the built-in each)
        // we need propagate the expected block params from the loop in order
        // for the body of the loop helper to render the values appropriately.
        // we detect if the user is expecting block params by checking options.fn.blockParams
        newOptions.blockParams = [dataForItem, newData.key].slice(0, options.fn.blockParams)
      }

      options.fn(dataForItem, newOptions)
    }

    loopItem.completed = true

    return ''
  }

  loop.dynamicParameters = true

  // stores values generated when rendering data template
  function r (originalRowNumber, options) {
    const Handlebars = require('handlebars')
    const { helpers: { generationUtils: { getIncrementWithLoop, updateMergeCells } } } = getSharedData()
    const { runtime, templateItems, mergeCellItems, dataItems } = getFileData(options.data.xlsxFilePath)

    assertOk(originalRowNumber != null, 'originalRowNumber arg is required')

    const rowElementIdx = templateItems.rowNumberElementIdxMap.get(originalRowNumber)
    const rowElementItem = templateItems.data[rowElementIdx]

    if (rowElementItem == null) {
      throw new Error(`No element row found at index ${rowElementIdx}`)
    }

    const elementType = rowElementItem.type ?? 'row'

    if (elementType !== 'row') {
      throw new Error(`Element at index ${rowElementIdx} is not a row`)
    }

    const {
      increment: rowIncrement,
      currentLoopIncrement: rowCurrentLoopIncrement,
      previousRootLoopIncrement: rowPreviousRootLoopIncrement,
      previousLoopIncrement: rowPreviousLoopIncrement
    } = getIncrementWithLoop(
      'row',
      {
        loopId: options.data.currentLoopId,
        loopIndex: options.data.index,
        evaluatedLoopsIds: runtime.loops.evaluated,
        loopItems: runtime.loops.data
      }
    )

    const newRowNumber = originalRowNumber + rowIncrement

    const newRowItem = { idx: rowElementIdx, r: newRowNumber, cells: [] }

    dataItems.push(newRowItem)

    const newData = Handlebars.createFrame(options.data)

    newData.originalRowNumber = originalRowNumber
    newData.r = newRowNumber
    // only a value that represents the increment of previous loops defined before the cell
    newData.rowPreviousLoopIncrement = rowPreviousRootLoopIncrement
    // this is a value that represents all the executions of the current loop (considering nested loops too)
    newData.rowCurrentLoopIncrement = rowCurrentLoopIncrement + (rowPreviousLoopIncrement - rowPreviousRootLoopIncrement)

    newData.cellOutputsMap = new Map()

    options.fn(this, { ...options, data: newData })

    const mergeStartLetterMap = templateItems.elementMetaMap.get(rowElementItem).mergeStartLetterMap ?? new Map()

    // we resolve merge cells on the row level, because there can be merge cells definitions
    // that reference cells that does not exists
    // (cell tag not present only empty row tag in xml)
    if (newData.cellOutputsMap.size === 0) {
      for (const [cellLetter, mergeCellRef] of mergeStartLetterMap) {
        updateMergeCells(mergeCellItems, mergeCellRef, {
          letter: cellLetter,
          rowNumber: newRowNumber
        })
      }
    } else {
      for (const [cellLetter, { originalCellLetter, output }] of newData.cellOutputsMap) {
        const newCellInfo = {
          r: cellLetter,
          output
        }

        // check if there were merge cells affecting the original cell, if yes,
        // add new merge cell
        const mergeCellRef = mergeStartLetterMap.get(originalCellLetter)

        if (mergeCellRef) {
          updateMergeCells(mergeCellItems, mergeCellRef, {
            letter: cellLetter,
            rowNumber: newRowNumber
          })
        }

        // to minimize the amount of values we store
        // (considering that there can be a lot of cells in a xlsx)
        // we only put .oldR if it is different than the generated r
        if (cellLetter !== originalCellLetter) {
          newCellInfo.oldR = originalCellLetter
        }

        newRowItem.cells.push(newCellInfo)
      }
    }

    return ''
  }

  // stores values generated when rendering data template
  function c (originalCellLetter, options) {
    const Handlebars = require('handlebars')

    const {
      originalRowNumber,
      r: rowNumber,
      cellOutputsMap
    } = options.data

    assertOk(originalRowNumber != null, 'originalRowNumber needs to exists on internal data')
    assertOk(rowNumber != null, 'r needs to exists on internal data')
    assertOk(cellOutputsMap != null, 'cellOutputsMap needs to exists on internal data')

    assertOk(originalCellLetter != null, 'originalCellLetter arg is required')

    const {
      calcChainFilePath,
      helpers: {
        parseXML,
        generationUtils: {
          getIncrementWithLoop, getCurrentLoopItem, updateDimension,
          getNewFormula, tryToResolvePendingLazyFormula
        },
        cellUtils: {
          parseCellRef, getColumnFor, generateNewCellRefFrom, evaluateCellRefsFromExpression,
          getFontSizeFromStyle, getPixelWidthOfValue
        }
      }
    } = getSharedData()

    const { templateItems, runtime } = getFileData(options.data.xlsxFilePath)

    const rowElementItem = templateItems.data[templateItems.rowNumberElementIdxMap.get(originalRowNumber)]
    const rowElementItemMetadata = templateItems.elementMetaMap.get(rowElementItem)

    const cellElementMetadata = templateItems.elementMetaMap.get(
      rowElementItem.children[rowElementItemMetadata.columnLetterChildrenMap.get(originalCellLetter)]
    )

    const {
      increment: columnIncrement,
      currentLoopIncrement: columnCurrentLoopIncrement,
      previousRootLoopIncrement: columnPreviousRootLoopIncrement,
      previousLoopIncrement: columnPreviousLoopIncrement
    } = getIncrementWithLoop(
      'column',
      {
        loopId: options.data.currentLoopId,
        loopIndex: options.data.index,
        rowNumber,
        evaluatedLoopsIds: runtime.loops.evaluated,
        loopItems: runtime.loops.data
      }
    )

    const [columnLetter, columnNumber] = getColumnFor(
      originalCellLetter,
      columnIncrement
    )

    const updatedCellRef = `${columnLetter}${rowNumber}`

    updateDimension(runtime, { rowNumber, columnNumber })

    const originalCellRef = originalCellLetter + originalRowNumber

    // check if the pending not completed loops are done, if so,
    // resolve pending lazy formulas
    if (runtime.lazyFormulas.pending.notCompletedLoops.size > 0) {
      const targetLoopIds = [...runtime.lazyFormulas.pending.notCompletedLoops.keys()]

      for (const loopId of targetLoopIds) {
        const lazyCellRefToFormulas = runtime.lazyFormulas.pending.notCompletedLoops.get(loopId)
        const loopItem = getCurrentLoopItem(loopId, runtime.loops.data)

        if (!loopItem.completed) {
          continue
        }

        for (const [lazyCellRef, lazyFormulaIds] of lazyCellRefToFormulas) {
          for (const lazyFormulaId of lazyFormulaIds) {
            tryToResolvePendingLazyFormula(lazyFormulaId, lazyCellRef, runtime.lazyFormulas, runtime.trackedCells, runtime.loops.data)
          }
        }

        runtime.lazyFormulas.pending.notCompletedLoops.delete(loopId)
      }
    }

    let trackedCell = runtime.trackedCells.get(originalCellRef)

    if (!trackedCell) {
      trackedCell = { first: null, last: null, count: 0 }
      runtime.trackedCells.set(originalCellRef, trackedCell)
    }

    const lazyFormulaIdsForCell = runtime.lazyFormulas.pending.cellsToFormulaIds.get(originalCellRef) || []
    let targetLazyFormulas = []
    const isPartOfLazyFormula = lazyFormulaIdsForCell.length > 0

    let loopItem

    if (options.data.currentLoopId != null) {
      loopItem = getCurrentLoopItem(options.data.currentLoopId, runtime.loops.data)

      if (loopItem?.type === 'vertical') {
        let item

        if (loopItem.trackedCells.has(originalCellRef)) {
          item = loopItem.trackedCells.get(originalCellRef)
        } else {
          item = new Map()
          loopItem.trackedCells.set(originalCellRef, item)
        }

        item.set(columnLetter, updatedCellRef)
      }

      trackedCell.currentLoopId = options.data.currentLoopId
    }

    if (isPartOfLazyFormula) {
      targetLazyFormulas = lazyFormulaIdsForCell.map((lazyFormulaId) => {
        const lazyFormula = runtime.lazyFormulas.data.get(lazyFormulaId)

        const originCellLoopId = runtime.trackedCells.get(lazyFormula.originCellRef)?.currentLoopId
        let inSameLoopLevel

        // check if the referenced cell is at same level than the origin formula cell
        if (originCellLoopId == null && options.data.currentLoopId == null) {
          inSameLoopLevel = true
        } else {
          inSameLoopLevel = originCellLoopId === options.data.currentLoopId
        }

        let resolve = true

        if (!inSameLoopLevel && loopItem != null) {
          resolve = loopItem.completed
        }

        return {
          id: lazyFormulaId,
          loopItem,
          resolve
        }
      })
    }

    if (trackedCell.first == null) {
      trackedCell.first = updatedCellRef
    }

    trackedCell.last = updatedCellRef
    trackedCell.count += 1

    // update calChain if the cell was referenced
    if (calcChainFilePath != null && cellElementMetadata?.calcChainElementIdx != null) {
      const { dataItems: calcChainDataItems } = getFileData(calcChainFilePath)

      calcChainDataItems.push({
        idx: cellElementMetadata.calcChainElementIdx,
        r: updatedCellRef
      })
    }

    // update table ref if the cell is part of a table ref
    if (cellElementMetadata?.tableRef != null) {
      const tableRef = cellElementMetadata.tableRef
      const tableRefParts = cellElementMetadata.tableRef.split(':')
      const type = originalCellRef === tableRefParts[0] ? 'start' : 'end'

      const tableRefMeta = runtime.tables.refsMeta.get(tableRef)
      const tableFilePath = runtime.tables.filePaths[tableRefMeta.tableFilePathIdx]

      const { dataVariables: tableDataVariables } = getFileData(tableFilePath)
      let newTableRef

      if (type === 'start') {
        newTableRef = `${trackedCell.last}:${tableRefParts[1]}`
      } else {
        newTableRef = `${tableRefParts[0]}:${trackedCell.last}`
      }

      tableDataVariables[tableRefMeta.dataVariableName] = newTableRef
    }

    // we try to resolve lazy formulas here if any
    for (const targetLazyFormula of targetLazyFormulas) {
      if (targetLazyFormula.resolve) {
        tryToResolvePendingLazyFormula(targetLazyFormula.id, originalCellRef, runtime.lazyFormulas, runtime.trackedCells, runtime.loops.data)
      } else if (targetLazyFormula.loopItem != null) {
        let cellsForLoopMap = runtime.lazyFormulas.pending.notCompletedLoops.get(targetLazyFormula.loopItem.id)

        if (!cellsForLoopMap) {
          cellsForLoopMap = new Map()
          runtime.lazyFormulas.pending.notCompletedLoops.set(targetLazyFormula.loopItem.id, cellsForLoopMap)
        }

        let formulasInCell = cellsForLoopMap.get(originalCellRef)

        if (!formulasInCell) {
          formulasInCell = []
          cellsForLoopMap.set(originalCellRef, formulasInCell)
        }

        if (!formulasInCell.includes(targetLazyFormula.id)) {
          formulasInCell.push(targetLazyFormula.id)
        }
      }
    }

    let cellValue
    let cellType

    if (cellElementMetadata?.formula != null) {
      cellType = 'str'

      const {
        rowPreviousLoopIncrement,
        rowCurrentLoopIncrement
      } = options.data

      assertOk(rowPreviousLoopIncrement != null, 'row previousLoopIncrement needs to exists on internal data')
      assertOk(rowCurrentLoopIncrement != null, 'row currentLoopIncrement needs to exists on internal data')

      const originalFormula = cellElementMetadata.formula.value
      const originCellIsFromLoop = options.data.currentLoopId != null

      const parsedOriginCellRef = parseCellRef(originalCellRef)

      cellValue = {}

      if (cellElementMetadata.formula.attributes) {
        cellValue.attributes = structuredClone(cellElementMetadata.formula.attributes)
      }

      if (cellElementMetadata.formula.shared?.type === 'reference') {
        // originalFormula is just empty string in this case so it is going to
        // be empty "f"
        cellValue.formula = originalFormula
      } else {
        // update the formula ref with the values of updated cell ref or
        // queue lazy formulas to resolve them later
        const { lazyUsedCells = {}, formula: newFormula } = getNewFormula(originalFormula, parsedOriginCellRef, {
          type: 'normal',
          originCellIsFromLoop,
          rowPreviousLoopIncrement,
          rowCurrentLoopIncrement,
          columnPreviousLoopIncrement,
          columnCurrentLoopIncrement,
          trackedCells: runtime.trackedCells,
          getCurrentLoopItem: (currentLoopId) => {
            return getCurrentLoopItem(currentLoopId, runtime.loops.data)
          },
          includeLoopIncrementResolver: (cellRefIsFromLoop, cellRefInfo) => {
            const trackedCell = runtime.trackedCells.get(cellRefInfo.localRef)

            // this is used when referencing a cell that it is not defined in the sheet
            return (
              cellRefIsFromLoop &&
              trackedCell?.fromNonExistingLoopHierarchyId === getCurrentLoopItem(options.data.currentLoopId, runtime.loops.data)?.hierarchyId
            )
          },
          lazyFormulas: runtime.lazyFormulas,
          currentCellRef: updatedCellRef
        })

        if (Object.keys(lazyUsedCells).length > 0) {
          cellValue.lazy = {
            id: newFormula,
            usedCells: lazyUsedCells
          }
        } else {
          cellValue.formula = newFormula
        }

        if (cellElementMetadata.formula.shared?.type === 'source') {
          const { newValue: newRef } = evaluateCellRefsFromExpression(cellElementMetadata.formula.shared.sourceRef, (cellRefInfo) => {
            const isRange = cellRefInfo.type === 'rangeStart' || cellRefInfo.type === 'rangeEnd'

            assertOk(isRange, `cell ref expected to be a range. value: "${cellElementMetadata.formula.shared.sourceRef}`)

            const columnIncrement = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.columnNumber - cellRefInfo.parsedRangeStart.columnNumber : 0
            const [newColumnLetter] = getColumnFor(columnNumber, columnIncrement)

            const rowIncrement = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.rowNumber - cellRefInfo.parsedRangeStart.rowNumber : 0
            const newRowNumber = rowNumber + rowIncrement

            const newCellRef = generateNewCellRefFrom(cellRefInfo.parsed, {
              columnLetter: newColumnLetter,
              rowNumber: newRowNumber
            })

            return newCellRef
          })

          // we know there is going to always attributes if we get to here
          cellValue.attributes.set('ref', newRef)
        }
      }
    } else if (options.fn != null) {
      const newData = Handlebars.createFrame(options.data)

      newData.originalColumnLetter = originalCellLetter
      newData.originalCellRef = originalCellRef
      newData.l = columnLetter
      newData.currentCellRef = updatedCellRef
      // only a value that represents the increment of previous loops defined before the cell
      newData.columnPreviousLoopIncrement = columnPreviousRootLoopIncrement
      // this is a value that represents all the executions of the current loop (considering nested loops too)
      newData.columnCurrentLoopIncrement = columnCurrentLoopIncrement + (columnPreviousLoopIncrement - columnPreviousRootLoopIncrement)

      newData.cellValue = null
      newData.cellType = null

      const cellTemplateOptions = {
        ...options,
        data: newData
      }

      // if we get to this point the cell contains dynamic parts,
      // we call the body of the cell helper to resolve those values
      const cellRawValue = options.fn(this, cellTemplateOptions)

      if (newData.cellValue != null) {
        // there will be cellValue set if there was a cell possible to auto detect
        cellValue = newData.cellValue
      } else {
        // otherwise we use the text content from the raw value
        const tmpDoc = parseXML(cellRawValue)
        cellValue = tmpDoc.documentElement.textContent || ''
      }

      if (newData.cellType != null) {
        cellType = newData.cellType

        // if we got explicit cellType, try to parse the cell value
        // to the type specified
        if (cellType === 'inlineStr' && typeof cellValue !== 'string') {
          if (cellValue == null) {
            cellValue = ''
          } else {
            cellValue = cellValue.toString()
          }
        } else if (cellType === 'b' && typeof cellValue !== 'boolean') {
          if (cellValue == null) {
            cellValue = false
          } else if (cellValue === 'true' || cellValue === 'false') {
            cellValue = cellValue === 'true'
          } else {
            const asNumber = parseInt(cellValue, 10)

            if (isNaN(asNumber)) {
              cellValue = false
            } else {
              cellValue = cellValue !== 0
            }
          }
        } else if (cellType === 'n' && typeof cellValue !== 'number') {
          if (cellValue == null) {
            cellValue = 0
          } else {
            const asNumber = parseFloat(cellValue)

            if (isNaN(asNumber)) {
              cellValue = 0
            } else {
              cellValue = asNumber
            }
          }
        }
      }

      if (cellType == null) {
        if (cellValue == null) {
          cellType = 'inlineStr'
        } else if (
          typeof cellValue === 'boolean' ||
          (
            cellValue != null &&
            typeof cellValue === 'object' &&
            Object.prototype.toString.call(cellValue) === '[object Boolean]'
          )
        ) {
          cellType = 'b'
        } else if (
          typeof cellValue === 'number' ||
          (
            cellValue != null &&
            typeof cellValue === 'object' &&
            Object.prototype.toString.call(cellValue) === '[object Number]'
          )
        ) {
          cellType = 'n'
        } else {
          cellType = 'inlineStr'
        }
      }

      let isAutoFitEnabled = false

      if (
        (runtime.autoFit.enabledFor[0] === true) ||
        runtime.autoFit.enabledFor.includes(originalCellLetter)
      ) {
        isAutoFitEnabled = true
      }

      if (isAutoFitEnabled) {
        const fontSize = getFontSizeFromStyle(
          cellElementMetadata.styleId,
          runtime.style.info,
          runtime.style.fontSizeCache
        )

        const colSize = runtime.autoFit.cols.get(originalCellLetter)

        const size = getPixelWidthOfValue(cellValue, fontSize)

        if (colSize == null || size > colSize) {
          runtime.autoFit.cols.set(originalCellLetter, size)
        }
      }

      // only consider the raw value if the value was not empty
      if (cellType === 'inlineStr' && cellValue != null && cellValue !== '') {
        cellValue = cellRawValue
      }
    }

    // start the cellOutput with empty value, which acts as a signal that the cell should
    // take the template element information as it is (with no other modifications)
    let cellOutput = null

    if (cellType) {
      if (cellValue == null || cellValue === '') {
        // when we mark cell as empty just use inlineStr type because the original cell
        // was a string
        cellOutput = { type: 'inlineStr', empty: true }
      } else {
        cellOutput = { type: cellType }

        // construct the final xml values, we use the xmldom because it takes of
        // xml encoding automatically
        if (cellType === 'inlineStr') {
          cellOutput.value = cellValue
        } else if (cellType === 'b') {
          const tmpDoc = parseXML('<fragment />')
          const vEl = tmpDoc.createElement('v')
          tmpDoc.documentElement.appendChild(vEl)
          vEl.textContent = cellValue ? '1' : '0'
          cellOutput.value = tmpDoc.documentElement.childNodes[0].toString()
        } else if (cellType === 'n') {
          const tmpDoc = parseXML('<fragment />')
          const vEl = tmpDoc.createElement('v')
          tmpDoc.documentElement.appendChild(vEl)
          vEl.textContent = cellValue
          cellOutput.value = tmpDoc.documentElement.childNodes[0].toString()
        } else if (cellType === 'str') {
          const getFormula = (newFormula, _attributesMap) => {
            const tmpDoc = parseXML('<fragment />')
            const fEl = tmpDoc.createElement('f')

            tmpDoc.documentElement.appendChild(fEl)

            const attributesMap = _attributesMap ?? new Map()

            for (const [attrName, attrValue] of attributesMap) {
              fEl.setAttribute(attrName, attrValue)
            }

            fEl.textContent = newFormula

            return tmpDoc.documentElement.childNodes[0].toString()
          }

          if (cellValue.lazy) {
            const { lazy, ...restOfCellValue } = cellValue

            // we are going to resolve this to raw string later
            cellOutput.value = {
              lazy: true,
              ...restOfCellValue,
              getFormula
            }

            for (const lazyUsedCell of Object.values(lazy.usedCells)) {
              let cellToFormulaRefItem = runtime.lazyFormulas.pending.cellsToFormulaIds.get(lazyUsedCell.cellRef)

              if (!cellToFormulaRefItem) {
                cellToFormulaRefItem = []
                runtime.lazyFormulas.pending.cellsToFormulaIds.set(lazyUsedCell.cellRef, cellToFormulaRefItem)
              }

              if (!cellToFormulaRefItem.includes(lazy.id)) {
                cellToFormulaRefItem.push(lazy.id)
              }
            }

            runtime.lazyFormulas.data.get(lazy.id).cellOutput = cellOutput
          } else {
            cellOutput.value = getFormula(cellValue.formula, cellValue.attributes)
          }
        }

        assertOk(cellOutput.value != null, `cell type "${cellType}" not supported`)
      }
    }

    cellOutputsMap.set(columnLetter, {
      originalCellLetter,
      output: cellOutput
    })

    return ''
  }

  function cValue (...args) {
    let _value
    let options
    let shouldCallBlock = false

    if (args.length === 1) {
      shouldCallBlock = true
      options = args[0]
    } else {
      _value = args[0]
      options = args[1]
    }

    let value

    if (shouldCallBlock) {
      const thisUnwrapped = this != null && typeof this.valueOf === 'function' ? this.valueOf() : this
      value = options.fn(thisUnwrapped)
    } else {
      value = _value

      // if value is null we try to resolve it from helper, replicating the same
      // logic that handlebars does
      if (value === undefined && options.hash.n != null) {
        const Handlebars = require('handlebars')
        if (Handlebars.helpers[options.hash.n]) {
          value = Handlebars.helpers[options.hash.n]()
        }
      }
    }

    if (value != null && typeof value.valueOf === 'function') {
      // we do this because handlebars something wraps the primitive values with their
      // object counterparts, so we need to ensure that we get the primitive value for
      // conditions to work correctly
      value = value.valueOf()
    }

    options.data.cellValue = value
    return value
  }

  cValue.dynamicParameters = true

  // solve any pending formulas that were waiting to complete
  function lazyFormulas (options) {
    const { helpers: { generationUtils: { tryToResolvePendingLazyFormula } } } = getSharedData()
    const { runtime } = getFileData(options.data.xlsxFilePath)

    if (runtime.lazyFormulas.data.size === 0) {
      return ''
    }

    const targetLazyFormulaIds = [...runtime.lazyFormulas.data.keys()]

    for (const lazyFormulaId of targetLazyFormulaIds) {
      const lazyFormulaInfo = runtime.lazyFormulas.data.get(lazyFormulaId)
      const pendingCellRefs = [...lazyFormulaInfo.pendingCellRefs]

      for (const cellRef of pendingCellRefs) {
        // resolve all the lazy pending formulas, the reason we got until this point is likely
        // that a formula is referencing a cell that does not have a definition in the sheet
        tryToResolvePendingLazyFormula(
          lazyFormulaId, cellRef, runtime.lazyFormulas,
          runtime.trackedCells, runtime.loops.data
        )
      }
    }
  }

  // resolves the chart title content
  function chartTitleText (options) {
    const Handlebars = require('handlebars')
    const { runtime } = getFileData(options.data.xlsxFilePath)

    const output = options.fn(this)

    runtime.chartTitleTextXml = output

    return new Handlebars.SafeString(output)
  }

  // produces the final dimension ref using the information of the latest
  // column and row numbers
  function dimension (options) {
    const xlsxFilePath = options.data.xlsxFilePath
    const { runtime } = getFileData(xlsxFilePath)
    const { helpers: { cellUtils: { getColumnFor } } } = getSharedData()
    const startCellRef = getColumnFor(runtime.dimension.start.columnNumber)[0] + runtime.dimension.start.rowNumber
    const endCellRef = getColumnFor(runtime.dimension.end.columnNumber)[0] + runtime.dimension.end.rowNumber

    if (startCellRef === endCellRef) {
      return startCellRef
    }

    return `${startCellRef}:${endCellRef}`
  }

  // produces the final <sheetData> content when rendering xml template
  function sd (options) {
    const Handlebars = require('handlebars')

    const {
      helpers: {
        parseXML,
        generationUtils: { renderDataItems, getAttributeFromElementTypeAttributes }
      }
    } = getSharedData()

    const xlsxFilePath = options.data.xlsxFilePath
    const { templateItems, dataItems } = getFileData(xlsxFilePath)

    let rowNumber

    const output = renderDataItems(parseXML('<sheetData/>'), dataItems, {
      prepareItem: (dataItem) => {
        const templateItem = templateItems.data[dataItem.idx]
        const itemType = templateItem.type ?? 'row'
        let newItem

        if (itemType === 'row') {
          const templateRowMeta = templateItems.elementMetaMap.get(templateItem)
          const { children: templateRowChildren, ...templateRowItem } = templateItem

          // clone without children, we are going to take care of them
          // bellow
          newItem = structuredClone(templateRowItem)

          newItem.customAttributes = new Map([
            ['r', dataItem.r]
          ])

          if (dataItem.cells.length > 0) {
            const newChildren = []

            for (const cellInfo of dataItem.cells) {
              const childrenIdx = templateRowMeta.columnLetterChildrenMap.get(cellInfo.oldR ?? cellInfo.r)
              const newCell = structuredClone(templateRowChildren[childrenIdx] ?? {})

              newCell.type = 'c'

              newCell.customAttributes = new Map([
                ['r', cellInfo.r]
              ])

              // when output is different than null it means the cell generated value
              // therefore we need to set the new children (custom content for cell),
              // otherwise just leave the information of the element cell as it is
              if (cellInfo.output != null) {
                newCell.customAttributes.set('t', cellInfo.output.type)

                if (cellInfo.output.empty !== true) {
                  newCell.children = [{ type: '#raw', value: cellInfo.output.value }]
                }
              }

              newChildren.push(newCell)
            }

            newItem.children = newChildren
          }
        } else {
          newItem = structuredClone(templateItem)
        }

        return newItem
      },
      getDefaultItemType: (parentItem) => {
        if (parentItem == null) {
          return 'row'
        }

        if (parentItem.type === 'row') {
          return 'c'
        }
      },
      processAttribute: (origin, itemType, _attrName, _attrValue) => {
        let attrName
        let attrValue

        if (origin === 'customAttributes') {
          attrName = _attrName
          attrValue = _attrValue

          if (attrName === 'r') {
            if (itemType === 'row') {
              rowNumber = attrValue
            } else if (itemType === 'c') {
              if (rowNumber == null) {
                throw new Error(`Cannot set cell "r" attribute when rowNumber is not defined in xlsxFilePath "${xlsxFilePath}"`)
              }

              // make the new cell ref
              attrValue = attrValue + rowNumber
            }
          }
        } else {
          [attrName, attrValue] = getAttributeFromElementTypeAttributes(
            templateItems.elementTypeAttributesMap,
            itemType,
            _attrName,
            _attrValue
          )
        }

        return [attrName, attrValue]
      }
    })

    return new Handlebars.SafeString(output)
  }

  // produces the final <mergeCells> content when rendering xml template
  function mergeCells (options) {
    const Handlebars = require('handlebars')
    const xlsxFilePath = options.data.xlsxFilePath
    const { mergeCellItems } = getFileData(xlsxFilePath)
    const parts = []

    for (let idx = 0; idx < mergeCellItems.length; idx++) {
      const mergeCellRef = mergeCellItems[idx]
      const isFirst = idx === 0
      const isLast = idx === mergeCellItems.length - 1

      if (isFirst) {
        parts.push(`<mergeCells count="${mergeCellItems.length}">`)
      }

      parts.push(`<mergeCell ref="${mergeCellRef}"/>`)

      if (isLast) {
        parts.push('</mergeCells>')
      }
    }

    return new Handlebars.SafeString(parts.join(''))
  }

  // produce the content of the <calcChain> doc content when rendering xml template
  function calcChain (options) {
    const Handlebars = require('handlebars')

    const {
      helpers: {
        parseXML,
        generationUtils: { renderDataItems, getAttributeFromElementTypeAttributes }
      }
    } = getSharedData()

    const xlsxFilePath = options.data.xlsxFilePath
    const { templateItems, dataItems } = getFileData(xlsxFilePath)

    // sort the dataItems by idx ASC to preserve the order of the original calcChain elements
    dataItems.sort((a, b) => a.idx - b.idx)

    const output = renderDataItems(
      parseXML('<fragment />'),
      dataItems,
      {
        prepareItem: (dataItem) => {
          const templateItem = templateItems.data[dataItem.idx]
          const itemType = templateItem.type ?? 'c'
          let newItem

          if (itemType === 'c') {
            newItem = structuredClone(templateItem)

            newItem.customAttributes = new Map([
              ['r', dataItem.r]
            ])
          } else {
            newItem = structuredClone(templateItem)
          }

          return newItem
        },
        getDefaultItemType: (parentItem) => {
          if (parentItem == null) {
            return 'c'
          }
        },
        processAttribute: (origin, itemType, _attrName, _attrValue) => {
          if (origin !== 'attributes') {
            return
          }

          return getAttributeFromElementTypeAttributes(
            templateItems.elementTypeAttributesMap,
            itemType,
            _attrName,
            _attrValue
          )
        }
      },
      false
    )

    return new Handlebars.SafeString(output)
  }

  // produce the final <cols> content when rendering xml template
  function cols (options) {
    const Handlebars = require('handlebars')
    const xlsxFilePath = options.data.xlsxFilePath

    const {
      helpers: { parseXML, cellUtils: { getColumnFor } }
    } = getSharedData()

    const existingColsXml = options.fn(this)

    const doc = parseXML(existingColsXml)
    const colsEl = doc.documentElement

    const { runtime } = getFileData(xlsxFilePath)

    const existingBaseColEls = Array.from(colsEl.getElementsByTagName('col'))

    for (const [colLetter, colSize] of runtime.autoFit.cols) {
      const colSizeInNumberCharactersMDW = (colSize / 6.5) + 2 // 2 is for padding
      const colNumber = getColumnFor(colLetter)[1]

      const existingColEl = existingBaseColEls.find((el) => (
        el.getAttribute('min') === colNumber.toString() &&
        el.getAttribute('max') === colNumber.toString()
      ))

      if (existingColEl != null) {
        existingColEl.setAttribute('width', colSizeInNumberCharactersMDW)
        existingColEl.setAttribute('customWidth', '1')
      } else {
        const newCol = doc.createElement('col')
        newCol.setAttribute('min', colNumber.toString())
        newCol.setAttribute('max', colNumber.toString())
        newCol.setAttribute('width', colSizeInNumberCharactersMDW)
        newCol.setAttribute('customWidth', '1')
        colsEl.appendChild(newCol)
      }
    }

    let output

    // return empty if there was no existing cols and also no new cols were generated
    if (existingBaseColEls.length === 0 && colsEl.childNodes.length === 0) {
      output = ''
    } else {
      output = colsEl.toString()
    }

    return new Handlebars.SafeString(output)
  }

  const helpers = {
    raw,
    staticRange,
    loop,
    r,
    c,
    cValue,
    lazyFormulas,
    chartTitleText,
    dimension,
    sd,
    mergeCells,
    calcChain,
    cols
  }

  return {
    resolveHelper: (helperName, argumentsLength, context, values, options) => {
      const targetHelper = helpers[helperName]

      if (!targetHelper) {
        throw new Error(`Helper "${helperName}" not found`)
      }

      let validCall

      if (targetHelper.dynamicParameters) {
        validCall = true
      } else {
        validCall = targetHelper != null ? argumentsLength === targetHelper.length : false
      }

      if (!validCall) {
        throw new Error(`Invalid usage of _D helper${helperName != null ? ` (t: ${helperName})` : ''}`)
      }

      try {
        if (values.length > 0) {
          return targetHelper.call(context, ...values, options)
        }

        return targetHelper.call(context, options)
      } catch (error) {
        error.message = `_D t="${helperName}" helper, ${error.message}`
        throw error
      }
    },
    assertDataArg: assertOk
  }
})()

function _D () {
  const values = []
  const argsLength = arguments.length
  let optionsToUse

  if (argsLength > 1) {
    optionsToUse = arguments[argsLength - 1]

    for (let idx = 0; idx < argsLength - 1; idx++) {
      values.push(arguments[idx])
    }
  } else {
    optionsToUse = arguments[0]
  }

  const type = optionsToUse.hash.t

  __xlsxD.assertDataArg(type != null, '_D helper t arg is required')

  return __xlsxD.resolveHelper(type, arguments.length, this, values, optionsToUse)
}
