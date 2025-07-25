/* eslint no-unused-vars: 0 */

function xlsxColAutofit (options) {
  if (
    options?.data?.meta?.autofit?.enabledFor?.length > 0 &&
    options.hash.all === true
  ) {
    options.data.meta.autofit.enabledFor = [true]
  }

  const enabledFor = options?.data?.meta?.autofit?.enabledFor ?? []
  const allColsEnabled = enabledFor[0] === true

  if (!allColsEnabled) {
    const cols = options?.data?.meta?.autofit?.cols ?? {}

    for (const colLetter of Object.keys(cols)) {
      // remove cells that are not enabled for autofit
      if (!enabledFor.includes(colLetter)) {
        delete cols[colLetter]
      }
    }
  }

  return ''
}

function xlsxCType (options) {
  if (!Object.hasOwn(options.data, 'cellType')) {
    return ''
  }

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

function xlsxChart (options) {
  const Handlebars = require('handlebars')

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

  return new Handlebars.SafeString(`$xlsxChart${Buffer.from(JSON.stringify(options.hash)).toString('base64')}$`)
}

function xlsxContext (options) {
  const Handlebars = require('handlebars')
  let data

  if (options.hash.type === 'global') {
    data = Handlebars.createFrame(options.data)
    data.evalId = options.hash.evalId
    data.calcChainUpdatesMap = new Map()
    data.styleInfo = null
    data.styleFontSizeMap = new Map()
  }

  const context = {}

  if (data) {
    context.data = data
  }

  const result = options.fn(this, context)

  return result
}

const __xlsxD = (function () {
  function ws (options) {
    const Handlebars = require('handlebars')
    const newData = Handlebars.createFrame(options.data)
    const sheetId = options.hash.sheetId

    assertOk(sheetId != null, 'sheetId arg is required')

    newData.sheetId = sheetId

    const tasks = new Map()

    newData.tasks = {
      wait (key) {
        return tasks.get(key)?.promise
      },
      add (key) {
        let taskExecution = tasks.get(key)

        if (taskExecution != null) {
          return [taskExecution.resolve, taskExecution.reject]
        }

        taskExecution = {}

        taskExecution.promise = new Promise((resolve, reject) => {
          taskExecution.resolve = resolve
          taskExecution.reject = reject
        })

        tasks.set(key, taskExecution)

        return [taskExecution.resolve, taskExecution.reject]
      }
    }

    // init tasks
    newData.tasks.add('sd')
    newData.tasks.add('lazyFormulas')

    newData.meta = {
      calcChainCellRefsSet: null,
      autofit: {
        cols: {},
        enabledFor: null
      },
      mergeCells: [],
      trackedCells: null,
      nonExistingCellsByLoopHierarchyMap: null,
      updatedOriginalCells: {},
      lazyFormulas: {},
      lastCellRef: null
    }

    newData.loopItems = []
    newData.evaluatedLoopsIds = []
    newData.outOfLoopTemplates = Object.create(null)
    newData.cellTemplatesMap = new Map()

    return options.fn(this, { data: newData })
  }

  function sd (options) {
    const [resolveTask, rejectTask] = options.data.tasks.add('sd')

    try {
      const Handlebars = require('handlebars')

      options.data.meta.calcChainCellRefsSet = new Set(options.hash.calcChainCellRefs != null ? options.hash.calcChainCellRefs.split(',') : [])

      const nonExistingCellRefs = options.hash.nonExistingCellRefs != null ? options.hash.nonExistingCellRefs.split(',') : []
      const autofitEnabledFor = options.hash.autofit != null ? options.hash.autofit.split(',') : []

      const autofitBaseCols = options.hash.autofitBCols != null
        ? options.hash.autofitBCols.split(',').map((entry) => {
            const [colLetter, size] = entry.split(':')
            return [colLetter, parseFloat(size)]
          })
        : []

      for (const [colLetter, size] of autofitBaseCols) {
        options.data.meta.autofit.cols[colLetter] = {
          size
        }
      }

      const trackedCells = {}
      const nonExistingCellsByLoopHierarchyMap = new Map()

      if (nonExistingCellRefs.length > 0) {
        for (const data of nonExistingCellRefs) {
          const parts = data.split('|')
          const ref = parts[0]
          let fromNonExistingLoopHierarchyId

          if (parts.length === 2) {
            fromNonExistingLoopHierarchyId = parts[1]
          }

          trackedCells[ref] = {
            first: ref,
            last: ref,
            count: 0
          }

          if (fromNonExistingLoopHierarchyId == null) {
            continue
          }

          let collection

          if (nonExistingCellsByLoopHierarchyMap.has(fromNonExistingLoopHierarchyId)) {
            collection = nonExistingCellsByLoopHierarchyMap.get(fromNonExistingLoopHierarchyId)
          } else {
            collection = []
            nonExistingCellsByLoopHierarchyMap.set(fromNonExistingLoopHierarchyId, collection)
          }

          const item = {
            ref,
            trackedCell: trackedCells[ref]
          }

          collection.push(item)

          // we set empty string here, just as a signal that this is going to be set
          // at runtime
          trackedCells[ref].currentLoopId = ''
          trackedCells[ref].fromNonExistingLoopHierarchyId = fromNonExistingLoopHierarchyId
        }
      }

      options.data.meta.autofit.enabledFor = autofitEnabledFor
      options.data.meta.trackedCells = trackedCells
      options.data.meta.nonExistingCellsByLoopHierarchyMap = nonExistingCellsByLoopHierarchyMap

      const result = options.fn(this, { data: options.data })
      resolveTask()
      return result
    } catch (e) {
      rejectTask(e)
      throw e
    }
  }

  // this helper is async on purpose so it can wait for the sd helper to finish.
  // this is needed because the dimension tag appears before the sheetData tag and
  // we want to keep to logic for updating this node in handlebars
  async function dimension (options) {
    const originalCellRefRange = options.hash.o

    assertOk(originalCellRefRange != null, 'originalCellRefRange arg is required')

    await options.data.tasks.wait('sd')

    const refsParts = originalCellRefRange.split(':')

    if (refsParts.length === 1) {
      return refsParts[0]
    }

    const { parseCellRef } = require('cellUtils')
    const lastCellRef = options.data.meta.lastCellRef
    const parsedEndCellRef = parseCellRef(refsParts[1])
    const parsedLastCellRef = parseCellRef(lastCellRef)

    let dimensionLetter = parsedEndCellRef.letter

    if (parsedLastCellRef.columnNumber > parsedEndCellRef.columnNumber) {
      dimensionLetter = parsedLastCellRef.letter
    }

    let dimensionRowNumber = parsedEndCellRef.rowNumber

    if (parsedLastCellRef.rowNumber > parsedEndCellRef.rowNumber) {
      dimensionRowNumber = parsedLastCellRef.rowNumber
    }

    return `${refsParts[0]}:${dimensionLetter}${dimensionRowNumber}`
  }

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
    const nonExistingCellsByLoopHierarchyMap = options.data.meta.nonExistingCellsByLoopHierarchyMap
    const newData = Handlebars.createFrame(options.data)
    const isVertical = Object.hasOwn(options.hash, 'vertical')

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

    const parentLoopItem = getParentLoopItemByHierarchy(loopItem, newData.loopItems)

    let container

    if (parentLoopItem) {
      container = parentLoopItem.children
    } else {
      container = newData.loopItems
    }

    loopItem.id = `${parentLoopItem != null ? `${parentLoopItem.id}#` : ''}${container.length}`

    container.push(loopItem)

    newData.currentLoopId = loopItem.id
    newData.evaluatedLoopsIds.push(loopItem.id)

    const nonExistingCellsInCurrentLoop = nonExistingCellsByLoopHierarchyMap.get(hierarchyId) ?? []

    // updating the currentLoopId for the non existing cells that are part of this loop
    for (const item of nonExistingCellsInCurrentLoop) {
      item.trackedCell.currentLoopId = loopItem.id
    }

    const dynamicCells = customCells || customCellsForColumns

    if (dynamicCells && !Array.isArray(targetData)) {
      throw new Error(`Invalid data to generate dynamic cells. data for ${customCells ? 'rows' : 'columns'} is not an array`)
    }

    const chunks = []

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

      const addBlockParams = options.fn.blockParams != null && options.fn.blockParams > 0

      const newOptions = {
        ...options,
        data: newData
      }

      if (addBlockParams) {
        // propagate the expected block params from the loop, this is going to be
        // used in cell templates
        newData.blockParams = [dataForItem, newData.key].slice(0, options.fn.blockParams)
      }

      chunks.push(options.fn(dataForItem, newOptions))
    }

    const result = new Handlebars.SafeString(chunks.join(''))

    loopItem.completed = true

    return result
  }

  loop.dynamicParameters = true

  function outOfLoop (options) {
    const Handlebars = require('handlebars')
    const item = options.hash.item

    assertOk(item != null, 'item arg is required')

    options.data.outOfLoopTemplates[item] = (currentLoopId, currentIdx) => {
      const newData = Handlebars.createFrame(options.data)

      newData.currentLoopId = currentLoopId

      if (currentIdx != null) {
        newData.index = currentIdx
      }

      return options.fn(this, { data: newData })
    }

    return new Handlebars.SafeString('')
  }

  function outOfLoopPlaceholder (options) {
    const Handlebars = require('handlebars')
    const item = options.hash.item

    assertOk(item != null, 'item arg is required')

    const outOfLoopTemplate = options.data.outOfLoopTemplates[item]

    assertOk(outOfLoopTemplate != null, 'outOfLoopItem was not found')

    const currentLoopId = options.data.currentLoopId

    assertOk(currentLoopId != null, 'currentLoopId not found')

    const currentIdx = options.data.index

    const output = outOfLoopTemplate(currentLoopId, currentIdx)

    return new Handlebars.SafeString(output)
  }

  function r (options) {
    const Handlebars = require('handlebars')
    const originalRowNumber = options.hash.o

    assertOk(originalRowNumber != null, 'originalRowNumber arg is required')

    const newData = Handlebars.createFrame(options.data)

    const {
      increment: rowIncrement,
      currentLoopIncrement: rowCurrentLoopIncrement,
      previousRootLoopIncrement: rowPreviousRootLoopIncrement,
      previousLoopIncrement: rowPreviousLoopIncrement
    } = getIncrementWithLoop(
      'row',
      {
        loopId: newData.currentLoopId,
        loopIndex: options.data.index,
        evaluatedLoopsIds: newData.evaluatedLoopsIds,
        loopItems: newData.loopItems
      }
    )

    newData.originalRowNumber = originalRowNumber
    newData.r = originalRowNumber + rowIncrement
    // only a value that represents the increment of previous loops defined before the cell
    newData.rowPreviousLoopIncrement = rowPreviousRootLoopIncrement
    // this is a value that represents all the executions of the current loop (considering nested loops too)
    newData.rowCurrentLoopIncrement = rowCurrentLoopIncrement + (rowPreviousLoopIncrement - rowPreviousRootLoopIncrement)

    newData.originalColumnLetter = null
    newData.originalCellRef = null
    newData.l = null
    newData.currentCellRef = null
    newData.columnPreviousLoopIncrement = null
    newData.columnCurrentLoopIncrement = null

    const result = options.fn(this, { data: newData })

    return result
  }

  function c (info, options) {
    const Handlebars = require('handlebars')
    const originalRowNumber = options.data.originalRowNumber
    const rowNumber = options.data.r
    const trackedCells = options.data.meta.trackedCells
    const { type, originalCellLetter, calcChainUpdate } = info

    const generateCellTag = type === 'autodetect'
    assertOk(originalRowNumber != null, 'originalRowNumber needs to exists on internal data')
    assertOk(rowNumber != null, 'rowNumber needs to exists on internal data')
    assertOk(trackedCells != null, 'trackedCells needs to exists on internal data')

    const { parseCellRef, getNewCellLetter } = require('cellUtils')
    const originalCellRef = `${originalCellLetter}${originalRowNumber}`

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
        rowNumber: options.data.r,
        evaluatedLoopsIds: options.data.evaluatedLoopsIds,
        loopItems: options.data.loopItems
      }
    )

    const cellLetter = getNewCellLetter(
      originalCellLetter,
      columnIncrement
    )

    const updatedCellRef = `${cellLetter}${rowNumber}`

    // keeping the lastCellRef updated
    if (options.data.meta.lastCellRef == null) {
      options.data.meta.lastCellRef = updatedCellRef
    } else {
      const parsedLastCellRef = parseCellRef(options.data.meta.lastCellRef)
      const parsedUpdatedCellRef = parseCellRef(updatedCellRef)

      if (
        (parsedUpdatedCellRef.rowNumber === parsedLastCellRef.rowNumber &&
        parsedUpdatedCellRef.columnNumber > parsedLastCellRef.columnNumber) ||
        (parsedUpdatedCellRef.rowNumber > parsedLastCellRef.rowNumber)
      ) {
        options.data.meta.lastCellRef = updatedCellRef
      }
    }

    let shouldUpdateOriginalCell

    // if we are in loop then don't add item to updatedOriginalCells
    if (options.data.currentLoopId != null) {
      shouldUpdateOriginalCell = false
    } else {
      shouldUpdateOriginalCell = originalCellRef !== updatedCellRef && options.data.meta.updatedOriginalCells[originalCellRef] == null
    }

    if (shouldUpdateOriginalCell) {
      // keeping a registry of the original cells that were updated
      options.data.meta.updatedOriginalCells[originalCellRef] = updatedCellRef
    }

    trackedCells[originalCellRef] = trackedCells[originalCellRef] || { first: null, last: null, count: 0 }

    if (options.data.currentLoopId != null) {
      const loopItem = getCurrentLoopItem(options.data.currentLoopId, options.data.loopItems)

      if (loopItem?.type === 'vertical') {
        const parsedUpdatedCellRef = parseCellRef(updatedCellRef)
        let item

        if (loopItem.trackedCells.has(originalCellRef)) {
          item = loopItem.trackedCells.get(originalCellRef)
        } else {
          item = new Map()
          loopItem.trackedCells.set(originalCellRef, item)
        }

        item.set(parsedUpdatedCellRef.letter, updatedCellRef)
      }

      trackedCells[originalCellRef].currentLoopId = options.data.currentLoopId
    }

    if (trackedCells[originalCellRef].first == null) {
      trackedCells[originalCellRef].first = updatedCellRef
    }

    trackedCells[originalCellRef].last = updatedCellRef
    trackedCells[originalCellRef].count += 1

    if (calcChainUpdate) {
      const sheetId = options.data.sheetId

      const cellRefKey = `${sheetId}-${originalCellRef}`

      let calcChainUpdatesForCellRef = options.data.calcChainUpdatesMap.get(cellRefKey)

      if (calcChainUpdatesForCellRef == null) {
        calcChainUpdatesForCellRef = []
        options.data.calcChainUpdatesMap.set(cellRefKey, calcChainUpdatesForCellRef)
      }

      calcChainUpdatesForCellRef.push(updatedCellRef)
    }

    options.data.originalColumnLetter = originalCellLetter
    options.data.originalCellRef = originalCellRef
    options.data.l = cellLetter
    options.data.currentCellRef = updatedCellRef
    // only a value that represents the increment of previous loops defined before the cell
    options.data.columnPreviousLoopIncrement = columnPreviousRootLoopIncrement
    // this is a value that represents all the executions of the current loop (considering nested loops too)
    options.data.columnCurrentLoopIncrement = columnCurrentLoopIncrement + (columnPreviousLoopIncrement - columnPreviousRootLoopIncrement)

    if (!generateCellTag) {
      return updatedCellRef
    }

    const { getTextContent } = require('cellUtils')
    const cellTemplateFn = options.data.cellTemplatesMap.get(originalCellRef)

    assertOk(cellTemplateFn != null, `template for cell "${originalCellRef}" not found`)

    const templateOptions = { ...options }

    if (options.data.blockParams) {
      templateOptions.blockParams = options.data.blockParams
    }

    options.data.cellValue = null
    options.data.cellType = null

    const cellRawValue = cellTemplateFn(this, templateOptions)

    let cellValue
    let cellType

    if (options.data.cellValue != null) {
      // there will be cellValue set if there was a cell to auto detect
      cellValue = options.data.cellValue
    } else {
      // otherwise we use the text content from the raw value
      cellValue = getTextContent(cellRawValue)
    }

    if (options.data.cellType != null) {
      cellType = options.data.cellType

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

    const enabledForCol = options.data.meta.autofit.enabledFor[0] === true ? true : options.data.meta.autofit.enabledFor.includes(originalCellLetter)

    if (enabledForCol) {
      const { getPixelWidthOfValue, getFontSizeFromStyle } = require('cellUtils')
      const fontSize = getFontSizeFromStyle(options.hash.s, options.data.styleInfo, options.data.styleFontSizeMap)
      const colInfo = options.data.meta.autofit.cols[originalCellLetter]

      const size = getPixelWidthOfValue(cellValue, fontSize)

      if (colInfo == null) {
        options.data.meta.autofit.cols[originalCellLetter] = {
          size
        }
      } else if (size > colInfo.size) {
        options.data.meta.autofit.cols[originalCellLetter] = {
          size
        }
      }
    }

    const serializedAttrs = []
    const attrsKeys = Object.keys(options.hash)

    if (!attrsKeys.includes('t')) {
      attrsKeys.push('t')
    }

    for (let idx = 0; idx < attrsKeys.length; idx++) {
      const key = attrsKeys[idx]
      let value

      if (key === 'r') {
        // ensure updated cellRef is part of cell xml
        value = updatedCellRef
      } else if (key === 't') {
        if (cellType != null) {
          value = cellType
        } else if (cellValue == null) {
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

        value = cellType
      } else {
        // keep rest of attrs
        value = options.hash[key]
      }

      serializedAttrs.push(`${key}="${value}"`)
    }

    let cellContent

    if (cellType === 'inlineStr') {
      cellContent = cellRawValue
    } else if (cellType === 'b') {
      cellContent = `<v>${cellValue ? '1' : '0'}</v>`
    } else if (cellType === 'n') {
      cellContent = `<v>${cellValue}</v>`
    }

    assertOk(cellContent != null, `cell type "${cellType}" not supported`)

    let cellOutput = `<c ${serializedAttrs.join(' ')}`

    if (cellValue == null || cellValue === '') {
      cellOutput += ' />'
    } else {
      cellOutput += `>${cellContent}</c>`
    }

    return new Handlebars.SafeString(cellOutput)
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

  // register cell templates
  function cTmpl (options) {
    const Handlebars = require('handlebars')
    const cellRef = options.hash.cellRef

    assertOk(cellRef != null, 'cellRef arg is required')

    options.data.cellTemplatesMap.set(cellRef, options.fn)

    return new Handlebars.SafeString('')
  }

  function mergeOrFormulaCell (type, options) {
    const Handlebars = require('handlebars')
    const columnLetter = options.data.l
    const rowNumber = options.data.r

    assertOk(rowNumber != null, 'rowNumber needs to exists on internal data')

    let output = ''

    if (type === 'mergeCell') {
      const originalCellRefRange = options.hash.o

      assertOk(originalCellRefRange != null, 'originalCellRefRange arg is required')

      const { evaluateCellRefsFromExpression, generateNewCellRefFrom, getNewCellLetter } = require('cellUtils')

      const { newValue } = evaluateCellRefsFromExpression(originalCellRefRange, (cellRefInfo) => {
        const isRange = cellRefInfo.type === 'rangeStart' || cellRefInfo.type === 'rangeEnd'

        assertOk(isRange, `cell ref expected to be a range. value: "${originalCellRefRange}`)

        const columnIncrement = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.columnNumber - cellRefInfo.parsedRangeStart.columnNumber : 0
        const newColumnLetter = getNewCellLetter(columnLetter, columnIncrement)

        const rowIncrement = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.rowNumber - cellRefInfo.parsedRangeStart.rowNumber : 0
        const newRowNumber = rowNumber + rowIncrement

        const newCellRef = generateNewCellRefFrom(cellRefInfo.parsed, {
          columnLetter: newColumnLetter,
          rowNumber: newRowNumber
        })

        return newCellRef
      })

      const mergeCell = {
        original: originalCellRefRange,
        value: newValue
      }

      options.data.meta.mergeCells.push(mergeCell)
    } else {
      const { parseCellRef, getNewFormula, decodeXML, encodeXML } = require('cellUtils')
      const currentCellRef = options.data.currentCellRef
      const trackedCells = options.data.meta.trackedCells
      const lazyFormulas = options.data.meta.lazyFormulas
      const originalCellRef = options.data.originalCellRef
      // formulas can contain characters that are encoded as part of the xlsx processing,
      // we ensure here that we decode the xml entities
      const originalFormula = options.hash.o != null ? decodeXML(options.hash.o) : null
      const rowPreviousLoopIncrement = options.data.rowPreviousLoopIncrement
      const rowCurrentLoopIncrement = options.data.rowCurrentLoopIncrement
      const columnPreviousLoopIncrement = options.data.columnPreviousLoopIncrement
      const columnCurrentLoopIncrement = options.data.columnCurrentLoopIncrement

      assertOk(currentCellRef != null, 'currentCellRef needs to exists on internal data')
      assertOk(trackedCells != null, 'trackedCells needs to exists on internal data')
      assertOk(lazyFormulas != null, 'lazyFormulas needs to exists on internal data')
      assertOk(originalCellRef != null, 'originalCellRef needs to exists on internal data')
      assertOk(originalFormula != null, 'originalFormula arg is required')
      assertOk(rowCurrentLoopIncrement != null, 'currentLoopIncrement needs to exists on internal data')
      assertOk(columnCurrentLoopIncrement != null, 'columnCurrentLoopIncrement needs to exists on internal data')

      const parsedOriginCellRef = parseCellRef(originalCellRef)
      const originCellIsFromLoop = options.data.currentLoopId != null

      const { lazyCellRefs = {}, formula: newFormula } = getNewFormula(originalFormula, parsedOriginCellRef, {
        type: 'normal',
        originCellIsFromLoop,
        rowPreviousLoopIncrement,
        rowCurrentLoopIncrement,
        columnPreviousLoopIncrement,
        columnCurrentLoopIncrement,
        trackedCells,
        getCurrentLoopItem: (currentLoopId) => {
          return getCurrentLoopItem(currentLoopId, options.data.loopItems)
        },
        includeLoopIncrementResolver: (cellRefIsFromLoop, cellRefInfo) => {
          // this is used when referencing a cell that it is not defined in the sheet
          return (
            cellRefIsFromLoop &&
            trackedCells[cellRefInfo.localRef] != null &&
            trackedCells[cellRefInfo.localRef].fromNonExistingLoopHierarchyId === getCurrentLoopItem(options.data.currentLoopId, options.data.loopItems)?.hierarchyId
          )
        },
        lazyFormulas,
        currentCellRef
      })

      // ensure we encode just some basic xml entities, formula values does not need to
      // have the full xml entities escaped
      if (Object.keys(lazyCellRefs).length > 0) {
        return options.data.tasks.wait('lazyFormulas').then(() => {
          const finalFormula = lazyFormulas.data[newFormula].newFormula
          return encodeXML(finalFormula, 'basic')
        })
      }

      output = encodeXML(newFormula, 'basic')
    }

    return new Handlebars.SafeString(output)
  }

  function mergeCells (options) {
    const Handlebars = require('handlebars')
    const newData = Handlebars.createFrame(options.data)

    const [resolveTask, rejectTask] = options.data.tasks.add('mergeCells')

    newData.mergeCellsCount = 0
    newData.mergeCellsTemplatesMap = new Map()

    try {
      const result = options.fn(this, { data: newData })
      resolveTask()
      return result
    } catch (e) {
      rejectTask(e)
      throw e
    }
  }

  async function mergeCellsCount (options) {
    await options.data.tasks.wait('mergeCells')
    return options.data.mergeCellsCount
  }

  function mergeCellsItems (options) {
    const Handlebars = require('handlebars')
    const targetItems = options.data.meta.mergeCells

    // run the body to fulfill the merge cells templates
    options.fn(this)

    const mergeCellsTemplatesMap = options.data.mergeCellsTemplatesMap

    let original = []
    const generated = []

    const originalOrderScore = new Map(
      Array.from(mergeCellsTemplatesMap.keys()).map((key, idx) => [key, idx])
    )

    for (const targetItem of targetItems) {
      const template = mergeCellsTemplatesMap.get(targetItem.original)
      const output = template({ newRef: targetItem.value })

      if (targetItem.original === targetItem.value) {
        original.push({ score: originalOrderScore.get(targetItem.original), output })
      } else {
        generated.push(output)
      }
    }

    // preserve the original order from xlsx file, so we avoid noise in diffs when
    // comparing xlsx output
    original.sort((a, b) => a.score - b.score)

    original = original.map((item) => item.output)

    options.data.mergeCellsCount = original.length + generated.length

    const output = `${original.join('\n')}${generated.join('\n')}`

    return new Handlebars.SafeString(output)
  }

  function mI (options) {
    const originalCellRefRange = options.hash.o

    assertOk(originalCellRefRange != null, 'originalCellRefRange arg is required')

    options.data.mergeCellsTemplatesMap.set(originalCellRefRange, options.fn)

    return ''
  }

  function formulaShared (options) {
    const columnLetter = options.data.l
    const rowNumber = options.data.r

    assertOk(rowNumber != null, 'rowNumber needs to exists on internal data')

    const originalSharedRefRange = options.hash.o

    assertOk(originalSharedRefRange != null, 'originalSharedRefRange arg is required')

    const { evaluateCellRefsFromExpression, generateNewCellRefFrom, getNewCellLetter } = require('cellUtils')

    const { newValue } = evaluateCellRefsFromExpression(originalSharedRefRange, (cellRefInfo) => {
      const isRange = cellRefInfo.type === 'rangeStart' || cellRefInfo.type === 'rangeEnd'

      assertOk(isRange, `cell ref expected to be a range. value: "${originalSharedRefRange}`)

      const columnIncrement = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.columnNumber - cellRefInfo.parsedRangeStart.columnNumber : 0
      const newColumnLetter = getNewCellLetter(columnLetter, columnIncrement)

      const rowIncrement = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.rowNumber - cellRefInfo.parsedRangeStart.rowNumber : 0
      const newRowNumber = rowNumber + rowIncrement

      const newCellRef = generateNewCellRefFrom(cellRefInfo.parsed, {
        columnLetter: newColumnLetter,
        rowNumber: newRowNumber
      })

      return newCellRef
    })

    return newValue
  }

  // TODO: this should be refactored at some point to be more generic
  // and support nested loops, maybe the logic will be similar to mergeCell or formula helpers
  // when this is done we can remove all the methods that are only used here "getNewCellRef", "getCurrentAndPreviousLoopItemsByTarget"
  function newCellRef (options) {
    const Handlebars = require('handlebars')
    const updatedOriginalCells = options.data.meta.updatedOriginalCells
    const loopItems = options.data.loopItems
    let targetItems = []
    const updated = []
    const type = 'newCellRef'

    if (type === 'newCellRef') {
      targetItems = [{ value: options.hash.originalCellRefRange }]
    }

    for (const targetItem of targetItems) {
      const regexp = /(\$?[A-Z]+\$?\d+:)?(\$?[A-Z]+\$?\d+)/g

      const newValue = targetItem.value.replace(regexp, (...args) => {
        const [match, _startingCellRef, endingCellRef] = args
        const isRange = _startingCellRef != null
        let newCellRef

        const ctx = {
          updatedOriginalCells,
          loopItems
        }

        if (isRange) {
          const startingCellRef = _startingCellRef.slice(0, -1)
          const newStartingCellRef = getNewCellRef(type === 'formulas' ? [targetItem.cellRef, startingCellRef] : startingCellRef, targetItem.loopMeta, 'rangeStart', ctx)
          const newEndingCellRef = getNewCellRef(type === 'formulas' ? [targetItem.cellRef, endingCellRef] : endingCellRef, targetItem.loopMeta, 'rangeEnd', ctx)

          return `${newStartingCellRef}:${newEndingCellRef}`
        } else {
          newCellRef = getNewCellRef(type === 'formulas' ? [targetItem.cellRef, endingCellRef] : endingCellRef, targetItem.loopMeta, 'standalone', ctx)
        }

        return newCellRef
      })

      if (type === 'newCellRef') {
        updated.push(newValue)
      }
    }

    return new Handlebars.SafeString(updated.join('\n'))
  }

  async function autofit (options) {
    const Handlebars = require('handlebars')
    const processAutofitCols = require('xlsxProcessAutofitCols')

    const existingColsXml = options.fn(this)

    await options.data.tasks.wait('sd')

    return new Handlebars.SafeString(processAutofitCols(options.data.meta.autofit, existingColsXml))
  }

  function lazyFormulas (options) {
    const [resolveTask, rejectTask] = options.data.tasks.add('lazyFormulas')

    try {
      const trackedCells = options.data.meta.trackedCells
      const lazyFormulas = options.data.meta.lazyFormulas

      assertOk(trackedCells != null, 'trackedCells needs to exists on internal data')
      assertOk(lazyFormulas != null, 'lazyFormulas needs to exists on internal data')

      if (lazyFormulas.count == null || lazyFormulas.count === 0) {
        resolveTask()
        return ''
      }

      const lazyFormulaIds = Object.keys(lazyFormulas.data)

      const { getNewFormula } = require('cellUtils')

      for (const lazyFormulaId of lazyFormulaIds) {
        const lazyFormulaInfo = lazyFormulas.data[lazyFormulaId]

        const {
          formula,
          parsedOriginCellRef,
          originCellIsFromLoop,
          rowPreviousLoopIncrement,
          rowCurrentLoopIncrement,
          columnPreviousLoopIncrement,
          columnCurrentLoopIncrement,
          cellRefs
        } = lazyFormulaInfo

        const { formula: newFormula } = getNewFormula(formula, parsedOriginCellRef, {
          type: 'lazy',
          originCellIsFromLoop,
          rowPreviousLoopIncrement,
          rowCurrentLoopIncrement,
          columnPreviousLoopIncrement,
          columnCurrentLoopIncrement,
          trackedCells,
          getCurrentLoopItem: (currentLoopId) => {
            return getCurrentLoopItem(currentLoopId, options.data.loopItems)
          },
          lazyCellRefs: cellRefs
        })

        // ensure we encode just some basic xml entities, formula values does not need to
        // have the full xml entities escaped
        lazyFormulaInfo.newFormula = newFormula
      }

      resolveTask()
      return ''
    } catch (e) {
      rejectTask(e)
      throw e
    }
  }

  function style (options) {
    const Handlebars = require('handlebars')
    const { parseStyle, getStyleInfo } = require('xlsxProcessStyle')

    const styleXml = options.fn(this)
    const styleDoc = parseStyle(styleXml)
    const styleInfo = getStyleInfo(styleDoc)

    if (styleInfo != null) {
      options.data.styleInfo = styleInfo
    }

    return new Handlebars.SafeString(styleXml)
  }

  function calcChain (options) {
    const Handlebars = require('handlebars')
    const processCalcChain = require('xlsxProcessCalcChain')

    const existingCalcChainXml = options.fn(this)

    return new Handlebars.SafeString(processCalcChain(options.data.calcChainUpdatesMap, existingCalcChainXml))
  }

  function raw (options) {
    return options.fn()
  }

  function getIncrementWithLoop (mode, { loopId, loopIndex, rowNumber, evaluatedLoopsIds, loopItems }) {
    if (mode !== 'row' && mode !== 'column') {
      throw new Error('mode must be "row" or "column"')
    }

    if (mode === 'column' && rowNumber == null) {
      throw new Error('rowNumber must be specified when using column mode')
    }

    const currentLoopItem = getCurrentLoopItem(loopId, loopItems)
    // this gets the previous loops (loops defined before a cell) and also on the case of nested loops
    // all the previous executions of the current loop
    const previousLoopItems = getPreviousLoopItems(loopId, evaluatedLoopsIds, loopItems)

    const previousMeta = {
      prev: {
        total: 0,
        loopLength: 0
      },
      rest: {
        total: 0,
        loopLength: 0
      }
    }

    const currentRootLoopIdNum = loopId != null ? parseInt(loopId.split('#')[0], 10) : -1

    let currentLoopIncrement = 0

    const validForColumnMode = ['vertical']
    const validForRowMode = ['row', 'block']

    const isValid = (cLoop) => {
      return mode === 'column' ? validForColumnMode.includes(cLoop.type) : validForRowMode.includes(cLoop.type)
    }

    const isValidPrevious = (cLoop, cRowNumber) => {
      const valid = isValid(cLoop)

      if (valid) {
        return mode === 'column' ? cLoop.rowNumber === cRowNumber : true
      }

      return valid
    }

    const isBlock = (cLoop) => mode === 'column' ? false : cLoop.type === 'block'

    for (const item of previousLoopItems) {
      const previousRootLoopIdNum = parseInt(item.id.split('#')[0], 10)
      const isPrev = currentRootLoopIdNum === -1 ? true : previousRootLoopIdNum < currentRootLoopIdNum
      let loopItemsLength = 0
      const target = isPrev ? previousMeta.prev : previousMeta.rest

      if (isValidPrevious(item, rowNumber)) {
        if (isBlock(item)) {
          loopItemsLength += getLoopItemTemplateLength(item) * (item.length - 1)
        } else {
          loopItemsLength += item.length
          target.loopLength += 1
        }
      }

      target.total += loopItemsLength
    }

    const previousRootLoopIncrement = previousMeta.prev.total + (previousMeta.prev.loopLength > 0 ? previousMeta.prev.loopLength * -1 : 0)
    const previousLoopIncrement = previousRootLoopIncrement + previousMeta.rest.total + (previousMeta.rest.loopLength > 0 ? previousMeta.rest.loopLength * -1 : 0)

    if (currentLoopItem) {
      assertOk(loopIndex != null, 'expected loop index to be defined')

      const parents = getParentsLoopItems(currentLoopItem.id, loopItems)
      let parentLoopIndex = currentLoopItem.parentLoopIndex

      parents.reverse()

      for (const parentLoopItem of parents) {
        if (isValid(parentLoopItem)) {
          currentLoopIncrement += getLoopItemTemplateLength(parentLoopItem) * parentLoopIndex
        }

        parentLoopIndex = parentLoopItem.parentLoopIndex
      }

      if (isValid(currentLoopItem)) {
        const templateLength = getLoopItemTemplateLength(currentLoopItem)
        currentLoopIncrement = currentLoopIncrement + (templateLength * loopIndex)
      }
    }

    const increment = previousLoopIncrement + currentLoopIncrement

    return { increment, currentLoopIncrement, previousRootLoopIncrement, previousLoopIncrement }
  }

  function getParentLoopItemByHierarchy (childLoopItem, loopItems) {
    assertOk(childLoopItem != null, 'getParentLoopItemByHierarchy childLoopItem arg is required')
    assertOk(Array.isArray(loopItems), 'getParentLoopItemByHierarchy loopItems arg is invalid')

    const parentHierarchyId = childLoopItem.hierarchyId.split('#').slice(0, -1).join('#')

    if (parentHierarchyId === '') {
      return
    }

    return getLoopItemById({ idName: 'hierarchyId', idValue: parentHierarchyId }, loopItems)
  }

  function getCurrentLoopItem (loopId, loopItems) {
    assertOk(Array.isArray(loopItems), 'getCurrentLoopItem loopItems arg is invalid')

    if (loopId == null) {
      return
    }

    return getLoopItemById({ idName: 'id', idValue: loopId }, loopItems)
  }

  function getPreviousLoopItems (loopId, evaluatedLoopsIds, loopItems) {
    assertOk(Array.isArray(evaluatedLoopsIds), 'getPreviousLoopItems evaluatedLoopsIds arg is invalid')
    assertOk(Array.isArray(loopItems), 'getPreviousLoopItems loopItems arg is invalid')

    const lastEvaluatedLoopId = evaluatedLoopsIds[evaluatedLoopsIds.length - 1]
    const loopItemsToGet = loopId != null && loopId === lastEvaluatedLoopId ? evaluatedLoopsIds.slice(0, -1) : evaluatedLoopsIds
    const result = []

    for (const lId of loopItemsToGet) {
      const loopItem = getLoopItemById({ idName: 'id', idValue: lId }, loopItems)

      assertOk(loopItem != null, `Can not find loop item by id "${lId}"`)

      if (!loopItem.completed) {
        continue
      }

      result.push(loopItem)
    }

    return result
  }

  function getCurrentAndPreviousLoopItemsByTarget (byTarget, loopItems) {
    assertOk(byTarget != null, 'getCurrentAndPreviousLoopItemsByTarget byTarget arg is invalid')
    assertOk(byTarget.rowNumber != null, 'getCurrentAndPreviousLoopItemsByTarget byTarget.rowNumber arg is required')
    assertOk(byTarget.columnNumber != null, 'getCurrentAndPreviousLoopItemsByTarget byTarget.columnNumber arg is required')
    assertOk(Array.isArray(loopItems), 'getCurrentAndPreviousLoopItemsByTarget loopItems arg is invalid')

    const { rowNumber, columnNumber } = byTarget

    const matchedLoopItems = loopItems.filter((item) => {
      assertOk(item.completed, 'getCurrentAndPreviousLoopItemsByTarget invalid usage, it should be called only after all loop items are completed evaluated')
      return item.start <= rowNumber
    })

    let current
    const previousAll = [...matchedLoopItems]
    const targetLoopItem = previousAll[previousAll.length - 1]
    const previous = previousAll.slice(0, -1)

    if (targetLoopItem != null) {
      let isInside = false
      const limit = targetLoopItem.type === 'block' ? targetLoopItem.end : targetLoopItem.start

      if (rowNumber === limit) {
        // for row loops we assume the row is inside when the row just matches the limit
        // (even if technically on the out of loop right case we should check columnEnd,
        // we don't do that because in that case the cell will anyway keep on its original place)
        isInside = targetLoopItem.type === 'block' ? targetLoopItem.columnEnd > columnNumber : true
      } else {
        isInside = limit > rowNumber
      }

      if (!isInside) {
        previous.push(targetLoopItem)
      } else {
        current = targetLoopItem
      }
    }

    return {
      current,
      previousAll,
      previous
    }
  }

  function getLoopItemTemplateLength (loopItem) {
    assertOk(loopItem != null, 'getLoopItemTemplateLength loopItem arg is invalid')

    let templateLength = 1

    if (loopItem.type === 'block') {
      templateLength = (loopItem.end - loopItem.start) + 1
    }

    return templateLength
  }

  function getParentsLoopItems (loopId, loopItems) {
    assertOk(loopId != null, 'getParentsLoopItems loopId arg is invalid')
    assertOk(Array.isArray(loopItems), 'getParentsLoopItems loopItems arg is invalid')

    const results = []
    const parentIdParts = loopId.split('#').slice(0, -1)

    if (parentIdParts.length === 0) {
      return results
    }

    let parentId = ''

    for (let index = 0; index < parentIdParts.length; index++) {
      parentId += parentId === '' ? parentIdParts[index] : `#${parentIdParts[index]}`

      const result = getLoopItemById({ idName: 'id', idValue: parentId }, loopItems)

      assertOk(result != null, `Can not find loop item by id "${parentId}"`)

      results.push(result)
    }

    return results
  }

  function getLoopItemById (byTarget, loopItems) {
    assertOk(byTarget != null, 'getLoopItemById byTarget arg is required')
    assertOk(Array.isArray(loopItems), 'getLoopItemById loopItems arg is invalid')

    const { idName, idValue } = byTarget

    assertOk(idName != null, 'getLoopItemById byTarget.idName arg is required')
    assertOk(typeof idName === 'string', 'getLoopItemById byTarget.idName arg is invalid')
    assertOk(idName === 'hierarchyId' || idName === 'id', 'getLoopItemById byTarget.idName should be either "hierarchyId" or "id"')
    assertOk(idValue != null, 'getLoopItemById byTarget.idValue arg is required')
    assertOk(typeof idValue === 'string', 'getLoopItemById byTarget.idValue arg is invalid')

    const idParts = idValue.split('#')
    let ctx = { children: loopItems }
    let targetIdValue = ''
    let parent

    while (idParts.length > 0) {
      const idx = idParts.shift()

      targetIdValue = targetIdValue !== '' ? `${targetIdValue}#${idx}` : `${idx}`

      const matches = ctx.children.filter((c) => c[idName] === targetIdValue)
      const result = matches[matches.length - 1]

      if (result == null) {
        break
      }

      ctx = result

      if (idParts.length === 0) {
        parent = ctx
      }
    }

    return parent
  }

  function getNewCellRef (cellRefInput, originLoopMeta, mode = 'standalone', context) {
    const type = 'newCellRef'
    const { updatedOriginalCells, loopItems } = context
    let cellRef
    let originCellRef

    if (Array.isArray(cellRefInput)) {
      originCellRef = cellRefInput[0]
      cellRef = cellRefInput[1]
    } else {
      cellRef = cellRefInput
    }

    const { parseCellRef } = require('cellUtils')
    const parsedCellRef = parseCellRef(cellRef)
    const parsedOriginCellRef = originCellRef != null ? parseCellRef(originCellRef) : undefined
    const normalizedCellRef = cellRef.replace('$', '')
    let newCellRef = updatedOriginalCells[normalizedCellRef]
    let currentLoopItem

    if (newCellRef == null) {
      // if not found on original cells then do a check if we find
      // matched loop items for the referenced row numbers
      const {
        current: currentLoopItemForTarget, previousAll: previousAllLoopItemsForTarget, previous: previousLoopItemsForTarget
      } = getCurrentAndPreviousLoopItemsByTarget({
        rowNumber: parsedCellRef.rowNumber,
        columnNumber: parsedCellRef.columnNumber
      }, loopItems)

      currentLoopItem = currentLoopItemForTarget

      if (currentLoopItemForTarget != null || previousLoopItemsForTarget.length > 0) {
        const originIsLoopItem = parsedOriginCellRef == null
          ? false
          : getCurrentAndPreviousLoopItemsByTarget({
            rowNumber: parsedOriginCellRef.rowNumber,
            columnNumber: parsedOriginCellRef.columnNumber
          }, loopItems).current != null

        const getAfterIncrement = (parsedC, all = false) => {
          const filteredLoopItems = all ? previousAllLoopItemsForTarget : previousLoopItemsForTarget

          const rowMatchedLoopItems = []

          let increment = filteredLoopItems.reduce((acu, item) => {
            let totalAcu = acu

            if (item.type === 'block') {
              totalAcu += getLoopItemTemplateLength(item) * (item.length - 1)
            } else {
              rowMatchedLoopItems.push(item)
              totalAcu += item.length
            }

            return totalAcu
          }, 0)

          increment += rowMatchedLoopItems.length > 0 ? (rowMatchedLoopItems.length * -1) : 0

          return `${parsedC.lockedColumn ? '$' : ''}${parsedC.letter}${parsedC.lockedRow ? '$' : ''}${parsedC.rowNumber + increment}`
        }

        let includeAll = false

        if (currentLoopItemForTarget != null &&
          (
            (type === 'newCellRef' && mode === 'rangeEnd') ||
            (type === 'formulas' &&
              originCellRef != null &&
              !originIsLoopItem &&
              mode === 'rangeEnd')
          )) {
          includeAll = true
        }

        newCellRef = getAfterIncrement(parsedCellRef, includeAll)
      } else {
        newCellRef = cellRef
      }
    }

    if (originLoopMeta != null) {
      const parsedNewCellRef = parseCellRef(newCellRef)
      let newRowNumber = parsedNewCellRef.rowNumber

      // when in loop don't increase the row number for locked row references
      if (!parsedNewCellRef.lockedRow) {
        if (currentLoopItem && currentLoopItem.type === 'block') {
          newRowNumber += getLoopItemTemplateLength(currentLoopItem) * originLoopMeta.index
        } else {
          newRowNumber += originLoopMeta.index
        }
      }

      newCellRef = `${parsedNewCellRef.lockedColumn ? '$' : ''}${parsedNewCellRef.letter}${parsedNewCellRef.lockedRow ? '$' : ''}${newRowNumber}`
    }

    return newCellRef
  }

  function assertOk (valid, message) {
    if (!valid) {
      throw new Error(message)
    }
  }

  const helpers = {
    ws,
    sd,
    dimension,
    loop,
    outOfLoop,
    outOfLoopPlaceholder,
    r,
    cValue,
    c: function (info, options) {
      delete options.hash.t

      // restoring original t attribute, needed when we render xml of cell
      if (options.hash.__originalT__ != null) {
        options.hash.t = options.hash.__originalT__
        delete options.hash.__originalT__
      }

      return c.call(this, info, options)
    },
    cTmpl,
    m: function (options) {
      return mergeOrFormulaCell.call(this, 'mergeCell', options)
    },
    f: function (options) {
      return mergeOrFormulaCell.call(this, 'formula', options)
    },
    fs: formulaShared,
    mergeCells,
    mergeCellsCount,
    mergeCellsItems,
    mI,
    newCellRef,
    autofit,
    lazyFormulas,
    style,
    calcChain,
    raw
  }

  return {
    resolveHelper: (helperName, argumentsLength, context, values, options) => {
      const targetHelper = helpers[helperName]
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

// alias for {{_D t='r'}} helper call, we do it this way to optimize size of the generated xml
function _R (data, options) {
  options.hash.t = 'r'
  options.hash.o = data
  return _D.call(this, options)
}

// alias for {{_D t='c'}} helper call, we do it this way to optimize size of the generated xml
function _C (data, options) {
  options.hash.t = 'c'
  return _D.call(this, { type: 'normal', originalCellLetter: data, calcChainUpdate: false }, options)
}

// alias for {{_D t='c'}} helper call with calcChainUpdate: true
function _c (data, options) {
  options.hash.t = 'c'
  return _D.call(this, { type: 'normal', originalCellLetter: data, calcChainUpdate: true }, options)
}

// alias for {{_D t='c'}} helper with autodetect call
function _T (options) {
  if (options.hash.t != null) {
    options.hash.__originalT__ = options.hash.t
  }

  options.hash.t = 'c'

  const data = { type: 'autodetect', originalCellLetter: options.hash.r, calcChainUpdate: false }

  return _D.call(this, data, options)
}

// alias for {{_D t='c'}} helper with autodetect call with calcChainUpdate: true
function _t (options) {
  if (options.hash.t != null) {
    options.hash.__originalT__ = options.hash.t
  }

  options.hash.t = 'c'

  const data = { type: 'autodetect', originalCellLetter: options.hash.r, calcChainUpdate: true }

  return _D.call(this, data, options)
}
