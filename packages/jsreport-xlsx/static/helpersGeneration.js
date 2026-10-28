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

  runtime.autoFit.configure({ all: options.hash.all })

  return ''
}

function xlsxChart (options) {
  const jsreport = require('jsreport-proxy')
  const { prefix: chartPrefix, dataVariables: chartDataVariables, runtime } = jsreport.req.context.__xlsxSharedData.fileDataMap.get(options.data.xlsxFilePath)

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

  const chartData = options.hash.data
  const chartOptions = options.hash.options

  chartDataVariables.seriesData = chartData

  if (chartPrefix === 'c') {
    const targetScaleOptions = []

    if (Array.isArray(chartOptions?.scales?.xAxes)) {
      targetScaleOptions.push({ type: 'x', axes: chartOptions.scales.xAxes })
    }

    if (Array.isArray(chartOptions?.scales?.yAxes)) {
      targetScaleOptions.push({ type: 'y', axes: chartOptions.scales.yAxes })
    }

    for (const { type, axes } of targetScaleOptions) {
      for (let idx = 0; idx < axes.length; idx++) {
        const axisConfig = axes[idx]
        const axisData = chartDataVariables[`${type}Axi${idx + 1}`]

        if (axisData == null) {
          continue
        }

        axisData.hide = axisConfig.display === false ? '1' : '0'

        if (axisConfig.ticks?.max != null) {
          axisData.max = axisConfig.ticks.max
        }

        if (axisConfig.ticks?.min != null) {
          axisData.min = axisConfig.ticks.min
        }

        if (axisConfig.ticks?.stepSize != null) {
          axisData.majorUnit = axisConfig.ticks.stepSize
        }
      }
    }
  }

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

      const cellRefs = [
        ...baseRowItem.parts.get('c').keys()
      ].map((cellRef) => parseCellRef(cellRef).letter)

      options.fn({
        rowNumber: originalRowNumber,
        cells: cellRefs
      })
    }

    return ''
  }

  // evaluates (data and hash options written by the user) of a logic block,
  // the arguments are evaluated once and reused for logic blocks with same hierarchy,
  // it resets the arguments to null when content should be treated as empty cells
  function evaluate (options) {
    const { runtime } = getFileData(options.data.xlsxFilePath)
    const hierarchyId = options.hash.hierarchyId

    assertOk(hierarchyId != null, 'hierarchyId arg is required')

    if (options.data.renderEmptyCells === true) {
      runtime.logicBlocks.setArgs(hierarchyId, options.data.loopPath, null)
      return ''
    }

    options.fn(this)

    return ''
  }

  // stores the arguments of a logic block
  function args (...values) {
    const options = values.pop()
    const { runtime } = getFileData(options.data.xlsxFilePath)
    const { t, hierarchyId, ...hash } = options.hash

    assertOk(hierarchyId != null, 'hierarchyId arg is required')

    runtime.logicBlocks.setArgs(hierarchyId, options.data.loopPath, { value: values[0], hash })

    return ''
  }

  args.dynamicParameters = true

  // executes a different types of conditions over data and depending on the result of condition
  // update row, cell indexes
  function condition (options) {
    const Handlebars = require('handlebars')
    const start = options.hash.start
    const columnStart = options.hash.columnStart
    const end = options.hash.end
    const columnEnd = options.hash.columnEnd
    const hierarchyId = options.hash.hierarchyId
    const isVertical = options.hash.vertical === true

    const { runtime } = getFileData(options.data.xlsxFilePath)

    assertOk(start != null, 'start arg is required')
    assertOk(columnStart != null, 'columnStart arg is required')
    assertOk(columnEnd != null, 'columnEnd arg is required')
    assertOk(hierarchyId != null, 'hierarchyId arg is required')

    const insideEmptyCells = options.data.renderEmptyCells === true

    const logicBlockArgs = runtime.logicBlocks.getArgs(hierarchyId, options.data.loopPath)

    assertOk(insideEmptyCells || logicBlockArgs != null, `arguments of condition (hierarchyId: ${hierarchyId}) were not evaluated`)

    const argsHash = logicBlockArgs?.hash ?? {}
    let conditionalValue = logicBlockArgs?.value

    if (Handlebars.Utils.isFunction(conditionalValue)) {
      conditionalValue = conditionalValue.call(this)
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the conditional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    const isTruthy = !((!argsHash.includeZero && !conditionalValue) || Handlebars.Utils.isEmpty(conditionalValue))
    const shouldRender = options.hash.unless === true ? !isTruthy : isTruthy
    const keepCells = argsHash.keepCells

    if (keepCells != null && typeof keepCells !== 'boolean') {
      throw new Error(`Invalid value for "keepCells" option of condition, expected a boolean but got: ${keepCells}`)
    }

    let type

    if (isVertical) {
      type = 'vertical'
    } else {
      type = end == null ? 'row' : 'block'
    }

    const conditionItem = {
      kind: 'condition',
      type,
      id: null,
      hierarchyId,
      start,
      columnStart,
      end,
      columnEnd,
      length: shouldRender ? 1 : 0,
      children: [],
      completed: false
    }

    runtime.logicBlocks.register(conditionItem)

    if (shouldRender || insideEmptyCells) {
      const newData = Handlebars.createFrame(options.data)
      newData.currentLogicBlockId = conditionItem.id
      options.fn(this, { ...options, data: newData })
    } else if (keepCells === true) {
      // with keepCells the cells of the condition are not removed, they are rendered empty
      const newData = Handlebars.createFrame(options.data)
      newData.currentLogicBlockId = conditionItem.id
      newData.renderEmptyCells = true
      options.fn(this, { ...options, data: newData })
    } else if (options.data.r != null) {
      // the condition is inside a row, the cells of the condition are not rendered. the cursor moves
      // to the end of them but keeps the column generated before them, so the content after the
      // condition takes their place
      const previousColumn = runtime.lastRef.getNext('column', columnStart) - 1

      runtime.lastRef.update('column', columnEnd, previousColumn)

      runtime.formulas.recordRemoved({
        type: 'cells',
        originalRow: options.data.originalRowNumber,
        row: options.data.r,
        originalStart: columnStart,
        originalEnd: columnEnd,
        previousNumber: previousColumn
      }, { path: options.data.loopPath })
    } else {
      // the rows of the condition are not rendered (same idea than for cells)
      const previousRow = runtime.lastRef.getNext('row', start) - 1

      runtime.lastRef.update('row', end ?? start, previousRow)

      runtime.formulas.recordRemoved({
        type: 'rows',
        originalStart: start,
        originalEnd: end ?? start,
        previousNumber: previousRow
      }, { path: options.data.loopPath })
    }

    conditionItem.completed = true

    return ''
  }

  // executes a different types of loops over data and tracks the loop information in the internal data
  // to update row, cell indexes
  function loop (options) {
    const Handlebars = require('handlebars')
    const customCellsForColumns = options.hash.cellsT === 'columns'
    const start = options.hash.start
    const columnStart = options.hash.columnStart
    const end = options.hash.end
    const columnEnd = options.hash.columnEnd
    const hierarchyId = options.hash.hierarchyId
    const newData = Handlebars.createFrame(options.data)
    const isVertical = options.hash.vertical === true
    const renderEmptyCells = options.data.renderEmptyCells === true

    const { runtime } = getFileData(options.data.xlsxFilePath)

    assertOk(start != null, 'start arg is required')
    assertOk(columnStart != null, 'columnStart arg is required')
    assertOk(columnEnd != null, 'columnEnd arg is required')
    assertOk(hierarchyId != null, 'hierarchyId arg is required')

    const logicBlockArgs = customCellsForColumns ? null : runtime.logicBlocks.getArgs(hierarchyId, options.data.loopPath)

    assertOk(renderEmptyCells || customCellsForColumns || logicBlockArgs != null, `arguments of loop (hierarchyId: ${hierarchyId}) were not evaluated`)

    const argsHash = logicBlockArgs?.hash ?? {}
    const data = logicBlockArgs?.value
    const customCells = argsHash.cells

    let targetData = data

    if (Object.hasOwn(argsHash, 'cells')) {
      targetData = customCells

      if (customCells == null || customCells.length === 0) {
        newData.emptyCells = true
      }
    } else if (customCellsForColumns) {
      targetData = options.data.emptyCells === true ? [] : this
    }

    // for empty data we create an array with one empty object,
    // this is needed because we want to preserve the original row.
    // we want to preserve the loop execution too when keepCells was used for conditionals
    if (
      targetData == null ||
      (Array.isArray(targetData) && targetData.length === 0) ||
      renderEmptyCells
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
      kind: 'loop',
      type,
      id: null,
      hierarchyId,
      start,
      columnStart,
      end,
      columnEnd,
      length: targetData.length,
      children: [],
      completed: false
    }

    runtime.logicBlocks.register(loopItem)

    newData.currentLogicBlockId = loopItem.id

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

      // the loop iterations where the content is rendered ("/<loop hierarchyId>:<index>/..."),
      // it identifies the iteration even when the loop is inside other loops
      newData.loopPath = `${options.data.loopPath ?? ''}/${hierarchyId}:${i}`

      options.fn(dataForItem, newOptions)
    }

    loopItem.completed = true

    return ''
  }

  // stores values generated when rendering data template
  async function r (originalRowNumber, options) {
    const Handlebars = require('handlebars')
    const { helpers: { cellUtils: { moveRangeTo } } } = getSharedData()
    const { contentManagers: sheetContentManagers, runtime } = getFileData(options.data.xlsxFilePath)
    const sheetDataContentManager = sheetContentManagers.get('sheetData')

    assertOk(originalRowNumber != null, 'originalRowNumber arg is required')

    const baseRowItem = sheetDataContentManager.parts.get('row').getBase(originalRowNumber.toString())

    const newRowNumber = runtime.lastRef.getNext('row', originalRowNumber)

    runtime.lastRef.update('row', originalRowNumber, newRowNumber)
    runtime.lastRef.update('column', null, null)

    if (baseRowItem.data?.virtual !== true) {
      sheetDataContentManager.parts.get('row').addInstance(
        originalRowNumber.toString(),
        newRowNumber.toString(),
        {}
      )
    }

    const newData = Handlebars.createFrame(options.data)

    newData.originalRowNumber = originalRowNumber
    newData.r = newRowNumber

    newData.cellOutputsMap = new Map()

    options.fn(this, { ...options, data: newData })

    await Promise.all(newData.cellOutputsMap.values())

    const mergeStartLetterMap = baseRowItem.data.mergeStartLetterMap ?? new Map()

    const mergeCellPartManager = sheetContentManagers.get('mergeCells')?.parts?.get?.('mergeCell')

    const rowItem = sheetDataContentManager.parts.get('row').get(newRowNumber.toString())

    for (const [cellLetter, { originalCellLetter, output }] of newData.cellOutputsMap) {
      // check if there were merge cells affecting the original cell, if yes,
      // add new merge cell
      const mergeCellRef = mergeStartLetterMap.get(originalCellLetter)

      if (mergeCellRef) {
        mergeCellPartManager.addInstance(
          mergeCellRef,
          moveRangeTo(mergeCellRef, {
            columnLetter: cellLetter,
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
        cellUtils: {
          parseCellRef, getColumnFor, moveRangeTo
        }
      }
    } = getSharedData()

    const { sheet, formulas, contentManagers: sheetContentManagers, runtime } = getFileData(options.data.xlsxFilePath)
    const sheetDataContentManager = sheetContentManagers.get('sheetData')

    const baseRowItem = sheetDataContentManager.parts.get('row').getBase(originalRowNumber.toString())

    const baseCellItem = baseRowItem.parts.get('c').get(originalCellRef)

    // the new column number only depends on the sequence of cells processed in the row (runtime.lastRef)
    const [, originalColumnNumber] = getColumnFor(originalCellLetter)
    const [columnLetter, columnNumber] = getColumnFor(runtime.lastRef.getNext('column', originalColumnNumber))

    runtime.lastRef.update('column', originalColumnNumber, columnNumber)

    // record the render of the cell for the formulas that reference it
    runtime.formulas.recordCell(originalCellRef, {
      coord: runtime.lastRef.getCurrent(),
      path: options.data.loopPath
    })

    if (baseCellItem.data?.virtual === true) {
      return ''
    }

    const updatedCellRef = `${columnLetter}${rowNumber}`

    const renderEmpty = options.data.renderEmptyCells === true

    runtime.dimension.include({ rowNumber, columnNumber })

    if (!renderEmpty && baseCellItem.data?.autoFitWidth != null) {
      runtime.autoFit.includeWidth(originalCellLetter, baseCellItem.data.autoFitWidth)
    }

    // update calChain if the cell was referenced
    if (!renderEmpty && calcChainFilePath != null && baseCellItem.data?.calcChainEntry) {
      const { contentManagers: calcChainContentManagers } = getFileData(calcChainFilePath)
      const calcChainCPartManager = calcChainContentManagers.get('calcChain').parts.get('c')
      calcChainCPartManager.addInstance([originalCellRef, sheet.id], [updatedCellRef, sheet.id], {})
    }

    // update table ref if the cell is part of a table ref
    if (baseCellItem.data?.tablePart?.ref) {
      runtime.tables.includeRefCell(baseCellItem.data.tablePart, {
        originalCellRef,
        cellRef: updatedCellRef,
        // a table inside a loop generates an instance for each iteration
        loopPath: options.data.loopPath
      })
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

    let formula

    if (!renderEmpty && baseCellItem.data?.formulaId != null) {
      formula = formulas.get(baseCellItem.data.formulaId)
    }

    if (renderEmpty) {
      cellType = 'inlineStr'
      cellValue = ''
    } else if (formula != null) {
      cellType = 'str'

      cellValue = {}

      if (formula.attributes) {
        cellValue.attributes = structuredClone(formula.attributes)
      }

      if (formula.shared?.type === 'reference') {
        // the formula is just empty string in this case so it is going to
        // be empty "f"
        cellValue.formula = formula.value
      } else {
        // the text of the formula is set at the end (lastProcessing), when all the cells were rendered
        cellValue.formulaCopy = runtime.formulas.addCopy(baseCellItem.data.formulaId, {
          coord: runtime.lastRef.getCurrent(),
          path: options.data.loopPath
        })

        if (formula.shared?.type === 'source') {
          const newRef = moveRangeTo(formula.shared.sourceRef, { columnLetter, rowNumber })

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

      runtime.autoFit.includeValue(originalCellLetter, cellValue, baseCellItem.data.styleId)

      if (cellType === 'inlineStr') {
        // update table dynamic column names if the cell has it
        if (baseCellItem.data?.tablePart?.dynamicColumn) {
          runtime.tables.setColumnName(baseCellItem.data.tablePart, originalCellRef, cellValue ?? '')
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

          if (cellValue.formulaCopy) {
            const { formulaCopy, ...restOfCellValue } = cellValue

            // the formula text is set later when the formulas are resolved (lastProcessing)
            cellOutput.value = {
              ...restOfCellValue,
              getFormula
            }

            // bind the cell output with the copy of the formula, so it is easier to
            // put the final formula text when the formula is resolved
            formulaCopy.cellOutput = cellOutput
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
      idManagers, dynamicFileMap, calcChainFilePath, changes,
      helpers: {
        dirname, relativeFilename,
        cellUtils: { getColumnFor }
      }
    } = getSharedData()

    const {
      relsPath, contentManagers: sheetContentManagers, dataVariables: sheetDataVariables,
      runtime
    } = getFileData(options.data.xlsxFilePath)

    // compute the text of all the formulas, all the cells were rendered at this point
    runtime.formulas.resolve()

    await jsreport.templatingEngines.waitForAsyncHelpers()

    // when no formula cell was rendered the calcChain is empty,
    // an empty calcChain is a broken document, so we need to update references to this file
    if (calcChainFilePath != null) {
      const { contentManagers: calcChainContentManagers, relationshipId: calcChainRelId } = getFileData(calcChainFilePath)

      if (calcChainContentManagers.get('calcChain').parts.get('c').size === 0) {
        changes.files.remove(calcChainFilePath)

        getFileData('[Content_Types].xml').contentManagers.get('Types').parts.get('Override').delete(`/${calcChainFilePath}`)

        if (calcChainRelId != null) {
          getFileData('xl/_rels/workbook.xml.rels').contentManagers.get('Relationships').parts.get('Relationship').delete(calcChainRelId)
        }
      }
    }

    // update dimension ref, it is the range of the rendered cells,
    // if no cell was rendered we keep the original dimension of the template
    const dimension = runtime.dimension.get()

    if (dimension) {
      const startCellRef = getColumnFor(dimension.start.columnNumber)[0] + dimension.start.rowNumber
      const endCellRef = getColumnFor(dimension.end.columnNumber)[0] + dimension.end.rowNumber
      let newDimensionRef

      if (startCellRef === endCellRef) {
        newDimensionRef = startCellRef
      } else {
        newDimensionRef = `${startCellRef}:${endCellRef}`
      }

      sheetDataVariables.newDimensionRef = newDimensionRef
    }

    // solve auto fit columns
    for (const [colLetter, colSize] of runtime.autoFit.getWidths()) {
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

    // transform the collected table instances to new tables and data variables for the xml template
    const renderedTables = runtime.tables.getRendered()

    if (renderedTables.length > 0) {
      const contentTypesOverridePartManager = getFileData('[Content_Types].xml').contentManagers.get('Types').parts.get('Override')

      for (const { tablePart, instances: tableInstances } of renderedTables) {
        const tableFilePath = tablePart.path

        // mark the table file as dynamic file for later processing at the
        // xml rendering step
        const dynamicFile = { instances: [] }

        let tablePrefixName

        sheetDataVariables.newTablePartsCount = tableInstances.length

        for (let instanceIdx = 0; instanceIdx < tableInstances.length; instanceIdx++) {
          const tableInstance = tableInstances[instanceIdx]

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
  function chartTitle (options) {
    const Handlebars = require('handlebars')
    const { dataVariables: chartDataVariables } = getFileData(options.data.xlsxFilePath)

    const output = options.fn(this)

    chartDataVariables.newChartTitleXml = output

    return new Handlebars.SafeString(output)
  }

  // produce the chartSeries when rendering xml template
  function updateChart (seriesData, options) {
    const Handlebars = require('handlebars')

    const { helpers: { parseXML, chartUtils } } = getSharedData()
    const { prefix: chartPrefix } = getFileData(options.data.xlsxFilePath)

    const existingXML = options.fn(this)
    let output

    if (seriesData) {
      output = []

      const tmpDoc = parseXML(`<fragment>${existingXML}</fragment>`)

      chartUtils.updateChart(tmpDoc, chartPrefix, seriesData)

      for (let idx = 0; idx < tmpDoc.documentElement.childNodes.length; idx++) {
        const el = tmpDoc.documentElement.childNodes[idx]
        output.push(el.toString())
      }

      output = output.join('')
    } else {
      output = existingXML
    }

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
    evaluate,
    args,
    condition,
    loop,
    r,
    c,
    cValue,
    lastProcessing,
    chartTitle,
    updateChart,
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
