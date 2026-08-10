/* global structuredClone */
/* eslint no-unused-vars: 0 */

function xlsxContext (options) {
  const jsreport = require('jsreport-proxy')
  const Handlebars = require('handlebars')
  const { type: contextType, path: xlsxFilePath } = options.hash
  let data

  const applyFileDataVariables = (targetData, targetFilePath, instanceIdx) => {
    const baseFileDataVariables = jsreport.req.context.__xlsxSharedData.fileDataMap.get(targetFilePath)?.dataVariables

    if (baseFileDataVariables) {
      Object.assign(targetData, baseFileDataVariables)
    }

    if (instanceIdx != null) {
      // only apply instance data variables when passing explicit index
      const dynamicFileMeta = jsreport.req.context.__xlsxSharedData.dynamicFileMap.get(targetFilePath)
      const instance = dynamicFileMeta.instances[instanceIdx]

      if (instance.dataVariables) {
        Object.assign(targetData, instance.dataVariables)
      }

      return instance
    }
  }

  if (contextType === 'global') {
    data = Handlebars.createFrame(options.data)
    data.evalId = jsreport.req.context.__xlsxSharedData.evalId
    data.dataTemplate = options.hash.dataTemplate === true
  } else if (contextType === 'file') {
    data = Handlebars.createFrame(options.data)

    let targetFilePath

    // we will have dynamicFile metadata when the file is consumed in the wrapper "dynamicFile" call,
    // in this mode the file will be called iteratively for each instance of the dynamic file,
    // and the corresponding data variables will be applied for each instance
    if (data.dynamicFile) {
      // xlsxFilePath here is just the index of the instance
      const instance = applyFileDataVariables(data, data.dynamicFile.baseXlsxPath, xlsxFilePath)
      targetFilePath = instance.path
    } else {
      applyFileDataVariables(data, xlsxFilePath)
      targetFilePath = xlsxFilePath
    }

    data.xlsxFilePath = targetFilePath
  } else if (contextType === 'dynamicFile') {
    // we call the body for each instance of the dynamic file,
    // we expect to insert metadata about the base file
    // for later usage with xlsxContext "file", and to return the results with a special
    // separator that we will use later to recognize the new files created for each instance
    const dynamicFileMeta = jsreport.req.context.__xlsxSharedData.dynamicFileMap.get(xlsxFilePath)

    const targetData = Handlebars.createFrame(options.data)

    targetData.dynamicFile = {
      baseXlsxPath: xlsxFilePath
    }

    const results = []

    for (let i = 0; i < dynamicFileMeta.instances.length; i++) {
      const activeInstance = dynamicFileMeta.instances[i]

      // here we just add the active instance idx,
      // we expect to apply the file, instance data variables in the xlsxContext "file" call
      targetData.dynamicFile.activeInstanceIdx = i

      // dynamicFile is always called for the xml template, which does not contain async values,
      // so we can just safely return result
      const result = options.fn(i, {
        data: targetData
      })

      results.push(result)
    }

    return results.join('$$$xlsxInstanceFile$$$')
  }

  const context = {}

  if (data) {
    context.data = data
  }

  let result = ''

  if (data.dataTemplate) {
    // when we are in a data template we dont care about the output
    options.fn(this, context)
  } else {
    result = options.fn(this, context)
  }

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
    const result = options.fn()
    return result
  }

  function staticRange (options) {
    const rangeIdx = options.hash.idx

    assertOk(rangeIdx != null, 'idx arg is required')

    const { helpers: { cellUtils: { parseCellRef } } } = getSharedData()

    const { dataRanges, contentManagers: sheetContentManagers } = getFileData(options.data.xlsxFilePath)
    const sheetDataContentManager = sheetContentManagers.get('sheetData')
    const dataRange = dataRanges[rangeIdx]

    for (const originalRowNumber of dataRange.items) {
      const baseRowItem = sheetDataContentManager.parts.get('row').getBase(
        originalRowNumber.toString()
      )

      let cellRefs = []

      if (baseRowItem.parts.has('c')) {
        cellRefs = [
          ...baseRowItem.parts.get('c')?.keys()
        ].map((cellRef) => parseCellRef(cellRef).letter)
      }

      options.fn({
        rowNumber: originalRowNumber,
        cells: cellRefs
      })
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

    const { helpers: { generationUtils: { getParentLoopItem } } } = getSharedData()
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

    const parentLoopItem = getParentLoopItem(loopItem, runtime.loops.data, 'hierarchyId')

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

      loopItem.iterationIdx = i

      options.fn(dataForItem, newOptions)
    }

    loopItem.completed = true

    return ''
  }

  loop.dynamicParameters = true

  // stores values generated when rendering data template
  async function r (originalRowNumber, options) {
    const Handlebars = require('handlebars')
    const { helpers: { generationUtils: { getIncrementWithLoop, updateMergeCell } } } = getSharedData()
    const { contentManagers: sheetContentManagers, runtime } = getFileData(options.data.xlsxFilePath)
    const sheetDataContentManager = sheetContentManagers.get('sheetData')

    assertOk(originalRowNumber != null, 'originalRowNumber arg is required')

    const baseRowItem = sheetDataContentManager.parts.get('row').getBase(originalRowNumber.toString())

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

    sheetDataContentManager.parts.get('row').addInstance(
      originalRowNumber.toString(),
      newRowNumber.toString(),
      {}
    )

    const newData = Handlebars.createFrame(options.data)

    newData.originalRowNumber = originalRowNumber
    newData.r = newRowNumber
    // only a value that represents the increment of previous loops defined before the cell
    newData.rowPreviousLoopIncrement = rowPreviousRootLoopIncrement
    // this is a value that represents all the executions of the current loop (considering nested loops too)
    newData.rowCurrentLoopIncrement = rowCurrentLoopIncrement + (rowPreviousLoopIncrement - rowPreviousRootLoopIncrement)

    newData.cellOutputsMap = new Map()

    options.fn(this, { ...options, data: newData })

    await Promise.all(newData.cellOutputsMap.values())

    const mergeStartLetterMap = baseRowItem.data.mergeStartLetterMap ?? new Map()

    const mergeCellPartManager = sheetContentManagers.get('mergeCells')?.parts?.get?.('mergeCell')

    // we resolve merge cells on the row level, because there can be merge cells definitions
    // that reference cells that does not exists
    // (cell tag not present only empty row tag in xml)
    if (newData.cellOutputsMap.size === 0) {
      for (const [cellLetter, mergeCellRef] of mergeStartLetterMap) {
        mergeCellPartManager.addInstance(
          mergeCellRef,
          updateMergeCell(mergeCellRef, {
            letter: cellLetter,
            rowNumber: newRowNumber
          }),
          {}
        )
      }
    } else {
      const rowItem = sheetDataContentManager.parts.get('row').get(newRowNumber.toString())

      for (const [cellLetter, { originalCellLetter, output }] of newData.cellOutputsMap) {
        // check if there were merge cells affecting the original cell, if yes,
        // add new merge cell
        const mergeCellRef = mergeStartLetterMap.get(originalCellLetter)

        if (mergeCellRef) {
          mergeCellPartManager.addInstance(
            mergeCellRef,
            updateMergeCell(mergeCellRef, {
              letter: cellLetter,
              rowNumber: newRowNumber
            }),
            {}
          )
        }

        const cellData = {}

        if (output != null) {
          cellData.attributes = new Map()
          cellData.attributes.set('t', output.type)

          if (output.empty !== true) {
            cellData.children = [{ name: '#raw', value: output.value }]
          } else {
            cellData.children = []
          }
        }

        const originalCellRef = `${originalCellLetter}${originalRowNumber}`
        const updatedCellRef = `${cellLetter}${newRowNumber}`

        rowItem.parts.get('c').addInstance(originalCellRef, updatedCellRef, cellData)
      }
    }

    return ''
  }

  // stores values generated when rendering data template
  async function c (originalCellLetter, options) {
    const jsreport = require('jsreport-proxy')
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

    const originalCellRef = originalCellLetter + originalRowNumber

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

    const { sheet, tables, contentManagers: sheetContentManagers, runtime } = getFileData(options.data.xlsxFilePath)
    const sheetDataContentManager = sheetContentManagers.get('sheetData')

    const baseRowItem = sheetDataContentManager.parts.get('row').getBase(originalRowNumber.toString())

    const baseCellItem = baseRowItem.parts.get('c').get(originalCellRef)

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
    if (calcChainFilePath != null && baseCellItem.data?.calcChainEntry) {
      const { contentManagers: calcChainContentManagers } = getFileData(calcChainFilePath)
      const calcChainCPartManager = calcChainContentManagers.get('calcChain').parts.get('c')
      calcChainCPartManager.addInstance([originalCellRef, sheet.id], [updatedCellRef, sheet.id], {})
    }

    // update table ref if the cell is part of a table ref
    if (baseCellItem.data?.tablePart?.ref) {
      const tablePart = tables[baseCellItem.data.tablePart.idx]
      const currentRefParts = baseCellItem.data.tablePart.ref.split(':')
      const isMainRef = tablePart.mainRefParts.join(':') === baseCellItem.data.tablePart.ref
      const isStartOfRange = currentRefParts[0] === originalCellRef

      if (!runtime.trackedTables.has(baseCellItem.data.tablePart.idx)) {
        runtime.trackedTables.set(baseCellItem.data.tablePart.idx, {
          instances: []
        })
      }

      const trackedTable = runtime.trackedTables.get(baseCellItem.data.tablePart.idx)
      let tableInstance

      if (isMainRef && isStartOfRange) {
        const instanceId = loopItem == null ? 'root' : `${loopItem.id}.${loopItem.iterationIdx}`
        tableInstance = trackedTable.instances[trackedTable.instances.length - 1]

        if (!tableInstance || tableInstance.id !== instanceId) {
          const instance = {
            id: instanceId,
            columnNames: new Map(),
            refsParts: new Map()
          }

          trackedTable.instances.push(instance)
          tableInstance = instance
        }
      } else {
        tableInstance = trackedTable.instances[trackedTable.instances.length - 1]
      }

      if (!tableInstance.refsParts.has(baseCellItem.data.tablePart.ref)) {
        tableInstance.refsParts.set(baseCellItem.data.tablePart.ref, { start: null, end: null })
      }

      const partsOfCurrentRef = tableInstance.refsParts.get(baseCellItem.data.tablePart.ref)

      if (isStartOfRange) {
        partsOfCurrentRef.start = trackedCell.last
      } else {
        partsOfCurrentRef.end = trackedCell.last
      }
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

    const activeCellOutputExecution = Promise.withResolvers()

    // insert to the output map early (before any possible async processing) to reclaim
    // its position according to the order of calls in the template
    cellOutputsMap.set(columnLetter, activeCellOutputExecution.promise.then((output) => {
      // normalize the map to always have the final output after it is resolved
      cellOutputsMap.set(columnLetter, output)
    }))

    if (baseCellItem.data?.formula != null) {
      cellType = 'str'

      const {
        rowPreviousLoopIncrement,
        rowCurrentLoopIncrement
      } = options.data

      assertOk(rowPreviousLoopIncrement != null, 'row previousLoopIncrement needs to exists on internal data')
      assertOk(rowCurrentLoopIncrement != null, 'row currentLoopIncrement needs to exists on internal data')

      const originalFormula = baseCellItem.data.formula.value
      const originCellIsFromLoop = options.data.currentLoopId != null

      const parsedOriginCellRef = parseCellRef(originalCellRef)

      cellValue = {}

      if (baseCellItem.data.formula.attributes) {
        cellValue.attributes = structuredClone(baseCellItem.data.formula.attributes)
      }

      if (baseCellItem.data.formula.shared?.type === 'reference') {
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

        if (baseCellItem.data.formula.shared?.type === 'source') {
          const { newValue: newRef } = evaluateCellRefsFromExpression(baseCellItem.data.formula.shared.sourceRef, (cellRefInfo) => {
            const isRange = cellRefInfo.type === 'rangeStart' || cellRefInfo.type === 'rangeEnd'

            assertOk(isRange, `cell ref expected to be a range. value: "${baseCellItem.data.formula.shared.sourceRef}`)

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
      const cellRawValue = await jsreport.templatingEngines.waitForAsyncHelper(options.fn(this, cellTemplateOptions))

      if (newData.cellValue != null) {
        // there will be cellValue set if there was a cell possible to auto detect
        cellValue = await jsreport.templatingEngines.waitForAsyncHelper(newData.cellValue)
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
          baseCellItem.data.styleId,
          runtime.style.info,
          runtime.style.fontSizeCache
        )

        const colSize = runtime.autoFit.cols.get(originalCellLetter)

        const size = getPixelWidthOfValue(cellValue, fontSize)

        if (colSize == null || size > colSize) {
          runtime.autoFit.cols.set(originalCellLetter, size)
        }
      }

      if (cellType === 'inlineStr') {
        // update table dynamic column names if the cell has it
        if (baseCellItem.data?.tablePart?.dynamicColumn) {
          const trackedTable = runtime.trackedTables.get(baseCellItem.data.tablePart.idx)
          const tableInstance = trackedTable.instances[trackedTable.instances.length - 1]
          tableInstance.columnNames.set(originalCellRef, cellValue ?? '')
        }

        // only consider the raw value if the value was not empty
        if (cellValue != null && cellValue !== '') {
          cellValue = cellRawValue
        }
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

    // we dont care about rejections, because in case of any error either from the
    // options.fn or some code here, it will be propagated to the main template rendering
    // from our handlebars async handling
    activeCellOutputExecution.resolve({
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

  // do any last pending processing
  async function lastProcessing (options) {
    const jsreport = require('jsreport-proxy')

    const {
      idManagers, dynamicFileMap,
      helpers: {
        dirname, relativeFilename,
        cellUtils: { getColumnFor },
        generationUtils: { tryToResolvePendingLazyFormula }
      }
    } = getSharedData()

    const { relsPath, contentManagers: sheetContentManagers, dataVariables: sheetDataVariables, tables, runtime } = getFileData(options.data.xlsxFilePath)

    // solve any pending formulas that were waiting to complete, this works ok because all previous
    // lazy formula resolving happens on the sync part of c helper, we can safely try to resolve
    // one last time here
    if (runtime.lazyFormulas.data.size > 0) {
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

    await jsreport.templatingEngines.waitForAsyncHelpers()

    // update dimension ref
    if (runtime.dimension) {
      const startCellRef = getColumnFor(runtime.dimension.start.columnNumber)[0] + runtime.dimension.start.rowNumber
      const endCellRef = getColumnFor(runtime.dimension.end.columnNumber)[0] + runtime.dimension.end.rowNumber
      let newDimensionRef

      if (startCellRef === endCellRef) {
        newDimensionRef = startCellRef
      } else {
        newDimensionRef = `${startCellRef}:${endCellRef}`
      }

      sheetDataVariables.newDimensionRef = newDimensionRef
    }

    // solve auto fit columns
    if (runtime.autoFit.cols.size > 0) {
      for (const [colLetter, colSize] of runtime.autoFit.cols) {
        const colSizeInNumberCharactersMDW = (colSize / 6.5) + 2 // 2 is for padding
        const colNumber = getColumnFor(colLetter)[1]

        const sheetColPartManager = sheetContentManagers.get('cols').parts.get('col')

        sheetColPartManager.set([colNumber.toString(), colNumber.toString()], {
          attributes: new Map([
            ['width', colSizeInNumberCharactersMDW],
            ['customWidth', '1']
          ])
        })
      }
    }

    // transform the collected table instances to new tables and data variables for the xml template
    if (runtime.trackedTables.size > 0) {
      const contentTypesOverridePartManager = getFileData('[Content_Types].xml').contentManagers.get('Types').parts.get('Override')

      for (const [tableIdx, trackedTable] of runtime.trackedTables) {
        const tablePart = tables[tableIdx]
        const tableFilePath = tablePart.path

        // mark the table file as dynamic file for later processing at the
        // xml rendering step
        const dynamicFile = { instances: [] }

        let tablePrefixName

        sheetDataVariables.newTablePartsCount = trackedTable.instances.length

        for (let instanceIdx = 0; instanceIdx < trackedTable.instances.length; instanceIdx++) {
          const tableInstance = trackedTable.instances[instanceIdx]

          const instanceData = {
            path: null,
            dataVariables: {}
          }

          if (instanceIdx === 0) {
            // the first instance always map to the existing path
            instanceData.path = tableFilePath

            instanceData.dataVariables[tablePart.idVariableName] = tablePart.baseId
            instanceData.dataVariables[tablePart.nameVariableName] = tablePart.baseName
          } else {
            const newTableId = idManagers.get('tables').generate().numId
            instanceData.path = `xl/tables/table${newTableId}.xml`

            if (tablePrefixName == null) {
              // extract the whole text before last digits
              const match = tablePart.baseName.match(/^(.*?)(\d+)$/)
              tablePrefixName = match ? match[1] : `${tablePart.baseName}_`
            }

            let newRId

            if (relsPath) {
              const { idManagers: sheetRelIdManagers, contentManagers: sheetRelsContentManagers } = getFileData(relsPath)
              const relationshipIdManager = sheetRelIdManagers.get('relationship')
              const sheetRelPartManager = sheetRelsContentManagers.get('Relationships').parts.get('Relationship')

              newRId = relationshipIdManager.generate().id

              sheetRelPartManager.set(newRId, {
                attributes: new Map([
                  ['Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/table'],
                  // the target is relative from the sheet file path to the table file path
                  ['Target', relativeFilename(dirname(options.data.xlsxFilePath), instanceData.path)]
                ])
              })
            }

            if (newRId == null) {
              throw new Error(`Failed to generate relationship id for table ${instanceData.path} of sheet ${options.data.xlsxFilePath}`)
            }

            const sheetTablePartPartManager = sheetContentManagers.get('tableParts').parts.get('tablePart')

            sheetTablePartPartManager.set(newRId, {})

            instanceData.dataVariables[tablePart.idVariableName] = newTableId
            instanceData.dataVariables[tablePart.nameVariableName] = `${tablePrefixName}${newTableId}`
          }

          if (!contentTypesOverridePartManager.has(`/${instanceData.path}`)) {
            contentTypesOverridePartManager.set(`/${instanceData.path}`, {
              attributes: new Map([
                ['ContentType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml']
              ])
            })
          }

          for (const [originalCellRef, cellValue] of tableInstance.columnNames) {
            const columnMeta = tablePart.dynamicColumnsMeta.get(originalCellRef)
            instanceData.dataVariables[columnMeta.dataVariableName] = cellValue
          }

          for (const [ref, part] of tableInstance.refsParts) {
            const refMeta = tablePart.refsMeta.get(ref)
            instanceData.dataVariables[refMeta.dataVariableName] = `${part.start}:${part.end}`
          }

          dynamicFile.instances.push(instanceData)
        }

        dynamicFileMap.set(tableFilePath, dynamicFile)
      }
    }

    // update count for mergedCells
    if (sheetContentManagers.has('mergeCells')) {
      sheetDataVariables.newMergeCellsCount = sheetContentManagers.get('mergeCells').parts.get('mergeCell').size
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

  // produce content based on the content manager data when rendering xml template
  function renderContent (options) {
    const Handlebars = require('handlebars')
    const contentName = options.hash.name
    const filePath = options.hash.path ?? options.data.xlsxFilePath

    assertOk(contentName != null, 'content "name" arg is required')
    assertOk(filePath != null, 'content "path" is empty')

    const { contentManagers } = getFileData(filePath)
    const targetContentManager = contentManagers.get(contentName)

    assertOk(targetContentManager != null, `content "${contentName}" not found`)

    const output = targetContentManager.render()

    return new Handlebars.SafeString(output)
  }

  const helpers = {
    raw,
    staticRange,
    loop,
    r,
    c,
    cValue,
    lastProcessing,
    chartTitleText,
    renderContent
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
