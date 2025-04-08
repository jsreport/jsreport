
/* eslint no-unused-vars: 0 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
function docxContext (options) {
  const Handlebars = require('handlebars')
  let data

  const processMap = {
    contentTypes: {
      module: 'docxProcessContentTypes'
    },
    documentRels: {
      module: 'docxProcessDocumentRels'
    }
  }

  const { type: contextType, ...restOfHashParameters } = options.hash

  let ctxObjValues = restOfHashParameters

  const initializeContext = (ctxValues) => {
    const createContext = require('docxCtx')
    const currentCtx = createContext('handlebars')

    for (const [key, value] of Object.entries(ctxValues)) {
      const suffix = 'MaxNumId'

      if (key.endsWith(suffix)) {
        const idKey = key.slice(0, suffix.length * -1)

        currentCtx.idManagers.set(idKey, {
          fromMaxId: value
        })
      } else {
        currentCtx.templating.set(key, value)
      }
    }

    return currentCtx
  }

  if (contextType === 'global') {
    data = Handlebars.createFrame(options.data)

    const { evalId, ...restOfGlobalParameters } = restOfHashParameters

    ctxObjValues = restOfGlobalParameters
    data.ctx = initializeContext(ctxObjValues)

    data.evalId = evalId
    data.childCache = new Map()
    data.newDefaultContentTypes = new Map()
    data.newDocumentRels = new Set()
    data.newFiles = new Map()
  } else if (contextType === 'contentTypes' || contextType === 'documentRels') {
    data = Handlebars.createFrame(options.data)
  } else if (contextType === 'document') {
    data = Handlebars.createFrame(options.data)
    data.currentSectionIdx = 0
  } else if (contextType === 'header' || contextType === 'footer') {
    data = Handlebars.createFrame(options.data)
  } else if (contextType === 'sectionIdx') {
    const idx = options.data.currentSectionIdx

    if (options.hash.increment === true) {
      options.data.currentSectionIdx += 1
    }

    return idx
  } else if (contextType === 'childContentPartial') {
    return options.data.childPartialId
  }

  if (
    contextType === 'document' ||
    contextType === 'header' ||
    contextType === 'footer'
  ) {
    data.bookmarkStartInstances = []
    data.defaultShapeTypeByObjectType = new Map()

    data.htmlCalls = {
      latest: null,
      records: new Map()
    }

    data.htmlCalls.getTaskPrefix = (_cId) => {
      return `htmlDelimiter${_cId}@`
    }

    data.htmlCalls.resolveLatest = (_cId, value) => {
      const record = data.htmlCalls.records.get(_cId)
      const oldTaskKey = record.taskKey
      const execution = record.pending.get(oldTaskKey)

      if (execution == null) {
        return
      }

      execution.resolve(value)
      const taskPrefix = data.htmlCalls.getTaskPrefix(_cId)

      record.taskKey = `${taskPrefix}${parseInt(oldTaskKey.slice(taskPrefix.length), 10) + 1}`
      record.pending.delete(oldTaskKey)
    }

    const tasks = new Map()

    data.tasks = {
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
  }

  const context = {}

  if (data) {
    context.data = data
  }

  if (contextType !== 'global') {
    data.localCtx = initializeContext(ctxObjValues)
  }

  const output = options.fn(this, context)

  // clear the child cache/partials after the global context is processed
  if (contextType === 'global') {
    const jsreport = require('jsreport-proxy')

    return jsreport.templatingEngines.waitForAsyncHelpers().then(() => output).finally(() => {
      const childCache = data.childCache

      for (const partialId of childCache.values()) {
        Handlebars.unregisterPartial(partialId)
      }

      childCache.clear()
    })
  } else if (contextType === 'contentTypes' || contextType === 'documentRels') {
    const jsreport = require('jsreport-proxy')
    const processInfo = processMap[contextType]

    if (processInfo == null) {
      throw new Error(`docxContext helper invalid usage, process module function not found for type "${contextType}"`)
    }

    const processFn = require(processInfo.module)

    return jsreport.templatingEngines.waitForAsyncHelpers().then(() => {
      return processFn(options.data, output)
    })
  } else if (
    contextType === 'document' ||
    contextType === 'header' ||
    contextType === 'footer'
  ) {
    // resolve latest html calls
    if (data.htmlCalls.latest != null) {
      for (const [cId, record] of data.htmlCalls.records) {
        if (record.pending?.size === 0) {
          continue
        }

        data.htmlCalls.resolveLatest(cId, record.counter)
      }
    }
  }

  return output
}

function docxPageBreak () {
  const Handlebars = require('handlebars')
  return new Handlebars.SafeString('')
}

function docxRaw (options) {
  const Handlebars = require('handlebars')
  const isInlineXML = options.hash.inlineXML === true
  let xmlInput = options.hash.xml

  if (isInlineXML && typeof xmlInput === 'string') {
    const decodeXML = require('docxDecodeXML')
    xmlInput = decodeXML(xmlInput)
  }

  if (typeof xmlInput === 'string' && xmlInput.startsWith('<')) {
    return new Handlebars.SafeString(xmlInput)
  }

  // Wrap not valid XML data as a literal, without any style
  return new Handlebars.SafeString('<w:r><w:t>' + xmlInput + '</w:t></w:r>')
}

function docxList (data, options) {
  const Handlebars = require('handlebars')
  return Handlebars.helpers.each(data, options)
}

async function docxTable (data, options) {
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
    optionsToUse.data.tasks.add('grid')

    const newData = Handlebars.createFrame(optionsToUse.data)

    newData.currentCell = null

    newData.colsWidth = {
      config: null,
      values: null,
      customized: false
    }

    if (optionsToUse.hash.rows != null && optionsToUse.hash.columns != null) {
      newData.rows = optionsToUse.hash.rows
      newData.columns = optionsToUse.hash.columns
      newData.activeMergedCellsItems = []
    }

    return optionsToUse.fn(this, { data: newData })
  }

  if (
    arguments.length === 1 &&
    Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'check')
  ) {
    if (
      optionsToUse.hash.check === 'colspan' &&
      optionsToUse.data.currentCell?.colspan > 1
    ) {
      return optionsToUse.fn(optionsToUse.data.currentCell.colspan)
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
      optionsToUse.hash.check === 'tableWidthValue'
    ) {
      const originalTableWidthValue = optionsToUse.hash.o

      await optionsToUse.data.tasks.wait('grid')

      if (!optionsToUse.data.colsWidth.customized) {
        return originalTableWidthValue
      }

      const newTableWidthValue = optionsToUse.data.colsWidth.values.reduce((acu, width) => {
        return acu + width
      }, 0)

      return newTableWidthValue
    }

    if (
      optionsToUse.hash.check === 'tableWidthType'
    ) {
      const originalTableWidthType = optionsToUse.hash.o

      await optionsToUse.data.tasks.wait('grid')

      if (!optionsToUse.data.colsWidth.customized) {
        return originalTableWidthType
      }

      return 'dxa'
    }

    if (
      optionsToUse.hash.check === 'grid'
    ) {
      const jsreport = require('jsreport-proxy')
      const [resolveTask, rejectTask] = optionsToUse.data.tasks.add('grid')

      try {
        const data = Handlebars.createFrame(optionsToUse.data)
        data.currentCol = { index: null }
        const colsWidthConfig = optionsToUse.hash.colsWidth ?? []
        data.colsWidth.config = colsWidthConfig
        data.colsWidth.values = []
        data.colsWidth.customized = optionsToUse.hash.colsWidth != null
        const result = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.fn(this, { data }))
        resolveTask()
        return result
      } catch (e) {
        rejectTask(e)
        throw e
      }
    }

    if (
      optionsToUse.hash.check === 'colWidth'
    ) {
      const currentCol = optionsToUse.data.currentCol
      const colsWidth = optionsToUse.data.colsWidth
      const originalWidth = optionsToUse.hash.o

      if (currentCol == null) {
        throw new Error('docxTable check="colWidth" helper invalid usage, currentCol was not found')
      }

      if (colsWidth == null) {
        throw new Error('docxTable check="colWidth" helper invalid usage, colsWidth was not found')
      }

      if (currentCol.index == null) {
        currentCol.index = 0
      } else {
        currentCol.index += 1
      }

      const currentColIdx = currentCol.index
      const colsWidthConfig = colsWidth.config
      const colsWidthValues = colsWidth.values
      let colWidth

      if (colsWidthConfig[currentColIdx] != null) {
        const getColWidth = require('docxGetColWidth')
        colWidth = getColWidth(colsWidthConfig[currentColIdx])

        if (colWidth == null) {
          throw new Error(
            `docxTable helper requires colsWidth parameter to contain valid values. widths passed should be valid number with unit (cm or px). got ${
              colsWidthConfig[currentColIdx]
            } at index ${currentColIdx}`
          )
        }
      } else {
        colWidth = originalWidth
      }

      colsWidthValues.push(colWidth)

      return colWidth
    }

    if (
      optionsToUse.hash.check === 'row'
    ) {
      optionsToUse.data.currentCell = { index: null, extra: 0 }
      return new Handlebars.SafeString('')
    }

    if (
      optionsToUse.hash.check === 'cell'
    ) {
      const currentCell = optionsToUse.data.currentCell

      if (currentCell.index == null) {
        currentCell.index = 0
      } else {
        currentCell.index += 1
      }

      if (currentCell.extra > 0) {
        currentCell.index += currentCell.extra
        currentCell.extra = 0
      }

      let gridSpan = optionsToUse.data.colspan

      if (gridSpan == null) {
        gridSpan = optionsToUse.hash.gs
      }

      if (gridSpan == null) {
        gridSpan = 1
      }

      if (gridSpan > 1) {
        currentCell.extra = gridSpan - 1
      }

      currentCell.colspan = gridSpan

      return new Handlebars.SafeString('')
    }

    if (
      optionsToUse.hash.check === 'cellWidthValue'
    ) {
      const originalWidthValue = optionsToUse.hash.o
      const colsWidth = optionsToUse.data.colsWidth
      const currentCellIndex = optionsToUse.data.currentCell.index

      const colsWidthValues = colsWidth.values

      if (!colsWidth.customized) {
        return originalWidthValue
      }

      let gridSpan = optionsToUse.data.currentCell.colspan

      if (gridSpan == null) {
        gridSpan = 1
      }

      let cellWidthValue = colsWidthValues[currentCellIndex]

      if (cellWidthValue == null) {
        cellWidthValue = originalWidthValue
      }

      if (gridSpan > 1) {
        const lastIdx = (currentCellIndex + gridSpan) - 1

        for (let idx = currentCellIndex + 1; idx <= lastIdx; idx++) {
          const currentWidthValue = colsWidthValues[idx] ?? 0
          cellWidthValue += currentWidthValue
        }
      }

      return cellWidthValue
    }

    if (
      optionsToUse.hash.check === 'cellWidthType'
    ) {
      const originalWidthType = optionsToUse.hash.o
      const colsWidth = optionsToUse.data.colsWidth
      const currentCellIndex = optionsToUse.data.currentCell.index

      const colsWidthValues = colsWidth.values

      if (!colsWidth.customized) {
        return originalWidthType
      }

      const cellWidthValue = colsWidthValues[currentCellIndex]

      if (cellWidthValue == null) {
        return originalWidthType
      }

      return 'dxa'
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
        throw new Error('docxTable full table mode needs to have both rows and columns defined as params when processing row')
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
        throw new Error('docxTable full table mode needs to have columns defined when processing column')
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

      for (const [idx, item] of cellsInRow.entries()) {
        // rowIndex + 1 because this is technically the second row on table after the row of table headers
        newData.rowIndex = isInsideRowHelper ? rowIndex + 1 : 0

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

        const currentItem = isInsideRowHelper ? optionsToUse.data.rows[rowIndex][idx] : item
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
          newData.colspan = (matchedMergedCell.colEnd - matchedMergedCell.colStart) + 1
        } else {
          newData.placeholderCell = false
        }

        chunks.push(optionsToUse.fn(cellInfo.value, { data: newData }))
      }

      return new Handlebars.SafeString(chunks.join(''))
    }
  } else {
    currentData = data
  }

  return Handlebars.helpers.each(currentData, optionsToUse)
}

function docxStyle (options) {
  const Handlebars = require('handlebars')

  const styleId = options.hash.id
  const textColor = options.hash.textColor || ''
  const backgroundColor = options.hash.backgroundColor || ''
  const validTargets = ['text', 'paragraph', 'cell', 'row']
  const target = options.hash.target || 'text'

  if (styleId == null) {
    throw new Error('docxStyle helper invalid usage, style id not found')
  }

  if (!validTargets.includes(target)) {
    throw new Error(`docxStyle helper "target" parameter must be any of these values: ${validTargets.join(', ')}, current: ${target}`)
  }

  if (options.data.styles != null) {
    if (!options.data.styles.has(styleId)) {
      options.data.styles.set(styleId, [])
    }

    const items = options.data.styles.get(styleId)

    items.push({
      textColor,
      backgroundColor,
      target
    })
  }

  return new Handlebars.SafeString(`$docxStyleStart${styleId}$`)
}

function docxCheckbox (options) {
  const Handlebars = require('handlebars')

  if (options.hash.value == null) {
    throw new Error('docxCheckbox helper requires value parameter')
  }

  options.hash.value = options.hash.value === 'true' || options.hash.value === true

  return new Handlebars.SafeString('$docxCheckbox' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}

function docxCombobox (options) {
  const Handlebars = require('handlebars')
  return new Handlebars.SafeString('$docxCombobox' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}

async function docxObject (options) {
  const Handlebars = require('handlebars')
  const jsreport = require('jsreport-proxy')

  if (options.hash.object == null) {
    throw new Error('docxObject helper requires object parameter to be set')
  }

  options.hash.object = await jsreport.templatingEngines.waitForAsyncHelper(options.hash.object)

  if (options.hash.object == null || typeof options.hash.object !== 'object') {
    throw new Error('docxObject helper requires object parameter to be set')
  }

  if (options.hash.object.content == null || typeof options.hash.object.content !== 'object') {
    throw new Error('docxObject helper requires object.content parameter to be set')
  }

  if (options.hash.object.preview == null || typeof options.hash.object.preview !== 'object') {
    throw new Error('docxObject helper requires object.preview parameter to be set')
  }

  let contentBuffer = options.hash.object.content.buffer
  const contentFileType = options.hash.object.content.fileType
  let previewBuffer = options.hash.object.preview.buffer
  let previewFileType = options.hash.object.preview.fileType
  const previewSize = options.hash.object.preview.size

  if (!Buffer.isBuffer(contentBuffer) && !ArrayBuffer.isView(contentBuffer)) {
    throw new Error('docxObject helper requires object.content.buffer parameter to be either a buffer or typed array')
  }

  contentBuffer = Buffer.isBuffer(contentBuffer) ? contentBuffer : Buffer.from(contentBuffer)

  const validContentFileTypes = ['docx']

  if (!validContentFileTypes.includes(contentFileType)) {
    throw new Error(`docxObject helper requires object.content.fileType parameter to be one of these values: ${validContentFileTypes.join(', ')}`)
  }

  if (!Buffer.isBuffer(previewBuffer) && !ArrayBuffer.isView(previewBuffer)) {
    throw new Error('docxObject helper requires object.preview.buffer parameter to be either a buffer or typed array')
  }

  previewBuffer = Buffer.isBuffer(previewBuffer) ? previewBuffer : Buffer.from(previewBuffer)

  const validPreviewFileTypes = ['jpg', 'jpeg', 'png']

  if (!validPreviewFileTypes.includes(previewFileType)) {
    throw new Error(`docxObject helper requires object.preview.fileType parameter to be one of these values: ${validPreviewFileTypes.join(', ')}`)
  }

  const targetPreviewSize = {}

  // preview size is expected to be in pt
  if (previewSize != null) {
    if (previewSize.width == null) {
      throw new Error('docxObject helper requires object.preview.size.width parameter to be set')
    }

    if (typeof previewSize.width !== 'string' && typeof previewSize.width !== 'number') {
      throw new Error('docxObject helper requires object.preview.size.width parameter to be either a string or number')
    }

    if (typeof previewSize.width === 'string') {
      const parsedWidth = parseFloat(previewSize.width)

      if (isNaN(parsedWidth)) {
        throw new Error('docxObject helper requires object.preview.size.width parameter to be a valid number')
      }

      targetPreviewSize.width = parsedWidth
    } else {
      targetPreviewSize.width = previewSize.width
    }

    if (previewSize.height == null) {
      throw new Error('docxObject helper requires object.preview.size.height parameter to be set')
    }

    if (typeof previewSize.height !== 'string' && typeof previewSize.height !== 'number') {
      throw new Error('docxObject helper requires object.preview.size.height parameter to be either a string or number')
    }

    if (typeof previewSize.height === 'string') {
      const parsedHeight = parseFloat(previewSize.height)

      if (isNaN(parsedHeight)) {
        throw new Error('docxObject helper requires object.preview.size.height parameter to be a valid number')
      }

      targetPreviewSize.height = parsedHeight
    } else {
      targetPreviewSize.height = previewSize.height
    }
  } else {
    targetPreviewSize.width = 45
    targetPreviewSize.height = 45
  }

  // normalize the alias to the common format
  if (previewFileType === 'jpg') {
    previewFileType = 'jpeg'
  }

  const processObject = require('docxProcessObject')

  return new Handlebars.SafeString(processObject(options.data, {
    content: {
      buffer: contentBuffer,
      fileType: contentFileType
    },
    preview: {
      buffer: previewBuffer,
      fileType: previewFileType,
      size: targetPreviewSize
    }
  }))
}

function docxChart (options) {
  const Handlebars = require('handlebars')

  if (options.hash.data == null) {
    throw new Error('docxChart helper requires data parameter to be set')
  }

  if (!Array.isArray(options.hash.data.labels) || options.hash.data.labels.length === 0) {
    throw new Error('docxChart helper requires data parameter with labels to be set, data.labels must be an array with items')
  }

  if (!Array.isArray(options.hash.data.datasets) || options.hash.data.datasets.length === 0) {
    throw new Error('docxChart helper requires data parameter with datasets to be set, data.datasets must be an array with items')
  }

  if (
    options.hash.options != null &&
      (
        typeof options.hash.options !== 'object' ||
        Array.isArray(options.hash.options)
      )
  ) {
    throw new Error('docxChart helper when options parameter is set, it should be an object')
  }

  return new Handlebars.SafeString('$docxChart' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}

function docxWatermark (options) {
  const Handlebars = require('handlebars')

  if (options.hash.text == null) {
    throw new Error('docxWatermark helper requires text parameter to be set')
  }

  if (options.hash.enabled != null && typeof options.hash.enabled !== 'boolean') {
    throw new Error('docxWatermark helper when enabled parameter is set, it should be a boolean')
  }

  if (
    options.hash.style != null &&
    (
      typeof options.hash.style !== 'object' ||
      Array.isArray(options.hash.style)
    )
  ) {
    throw new Error('docxWatermark helper when style parameter is set, it should be an object')
  }

  return new Handlebars.SafeString('$docxWatermark' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}

function docxHtml (options) {
  const Handlebars = require('handlebars')

  if (options.hash.content == null) {
    throw new Error('docxHtml helper requires content parameter to be set')
  }

  return new Handlebars.SafeString('$docxHtml' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}

function docxTOCOptions (options) {
  const Handlebars = require('handlebars')
  return new Handlebars.SafeString('$docxTOCOptions' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}

async function docxImage (optionsToUse) {
  const Handlebars = require('handlebars')
  const jsreport = require('jsreport-proxy')

  optionsToUse.hash.src = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.hash.src)
  optionsToUse.hash.fallbackSrc = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.hash.fallbackSrc)
  optionsToUse.hash.failurePlaceholderAction = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.hash.failurePlaceholderAction)
  optionsToUse.hash.width = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.hash.width)
  optionsToUse.hash.height = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.hash.height)
  optionsToUse.hash.usePlaceholderSize = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.hash.usePlaceholderSize)
  optionsToUse.hash.bookmarkName = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.hash.bookmarkName)

  if (
    optionsToUse.hash.src == null &&
    optionsToUse.hash.fallbackSrc == null &&
    optionsToUse.hash.failurePlaceholderAction == null
  ) {
    throw new Error(
      'docxImage helper requires src parameter to be set'
    )
  }

  const isValidSrc = (value) => {
    return (
      typeof value === 'string' &&
      (
        value.startsWith('data:image/png;base64,') ||
        value.startsWith('data:image/jpeg;base64,') ||
        value.startsWith('data:image/svg+xml;base64,') ||
        value.startsWith('http://') ||
        value.startsWith('https://')
      )
    )
  }

  if (
    optionsToUse.hash.src != null &&
    !isValidSrc(optionsToUse.hash.src)
  ) {
    throw new Error(
      'docxImage helper requires src parameter to be valid data uri for png, jpeg, svg image or a valid url. Got ' +
      optionsToUse.hash.src
    )
  }

  if (
    optionsToUse.hash.fallbackSrc != null &&
    !isValidSrc(optionsToUse.hash.fallbackSrc)
  ) {
    throw new Error(
      'docxImage helper requires fallbackSrc parameter to be valid data uri for png, jpeg, svg image or a valid url. Got ' +
      optionsToUse.hash.fallbackSrc
    )
  }

  if (
    optionsToUse.hash.failurePlaceholderAction != null &&
    (
      optionsToUse.hash.failurePlaceholderAction !== 'preserve' &&
      optionsToUse.hash.failurePlaceholderAction !== 'remove'
    )
  ) {
    throw new Error(
      'docxImage helper requires failurePlaceholderAction parameter to be either "preserve" or "remove". Got ' +
      optionsToUse.hash.failurePlaceholderAction
    )
  }

  const isValidDimensionUnit = (value) => {
    const regexp = /^(\d+(.\d+)?)(cm|px)$/
    return regexp.test(value)
  }

  if (
    optionsToUse.hash.width != null &&
    !isValidDimensionUnit(optionsToUse.hash.width)
  ) {
    throw new Error(
      'docxImage helper requires width parameter to be valid number with unit (cm or px). got ' +
      optionsToUse.hash.width
    )
  }

  if (
    optionsToUse.hash.height != null &&
    !isValidDimensionUnit(optionsToUse.hash.height)
  ) {
    throw new Error(
      'docxImage helper requires height parameter to be valid number with unit (cm or px). got ' +
      optionsToUse.hash.height
    )
  }

  const imageConfig = {
    src: optionsToUse.hash.src,
    fallbackSrc: optionsToUse.hash.fallbackSrc,
    failurePlaceholderAction: optionsToUse.hash.failurePlaceholderAction,
    width: optionsToUse.hash.width,
    height: optionsToUse.hash.height,
    usePlaceholderSize: (
      optionsToUse.hash.usePlaceholderSize === true ||
      optionsToUse.hash.usePlaceholderSize === 'true'
    ),
    bookmarkName: optionsToUse.hash.bookmarkName
  }

  const content = `$docxImage${
    Buffer.from(JSON.stringify(imageConfig)).toString('base64')
  }$`

  if (optionsToUse.data.imageWrapperContext) {
    optionsToUse.data.imageConfig = imageConfig
  }

  return new Handlebars.SafeString(content)
}

async function docxSData (data, options) {
  const Handlebars = require('handlebars')
  const optionsToUse = options == null ? data : options
  const type = optionsToUse.hash.type

  if (type == null) {
    throw new Error('docxSData helper type arg is required')
  }

  if (
    arguments.length === 1 &&
    type === 'bookmarkValidation'
  ) {
    const bookmarkType = optionsToUse.hash.bookmarkType
    let bookmarkId = optionsToUse.hash.bookmarkId
    const forImage = optionsToUse.hash.bookmarkForImage === 'true'

    if (bookmarkType == null) {
      throw new Error(
        'docxSData "bookmarkValidation" helper requires bookmarkType parameter to be set'
      )
    }

    if (bookmarkType !== 'start' && bookmarkType !== 'end') {
      throw new Error(
        'docxSData "bookmarkValidation" helper requires bookmarkType parameter to be either "start" or "end"'
      )
    }

    if (bookmarkId == null) {
      throw new Error(
        'docxSData "bookmarkValidation" helper requires bookmarkId parameter to be set'
      )
    }

    bookmarkId = parseInt(bookmarkId, 10)

    if (isNaN(bookmarkId)) {
      throw new Error(
        'docxSData "bookmarkValidation" helper requires bookmarkId parameter to be a number'
      )
    }

    // we immediately remove bookmark if there was not a docxImage call for it
    if (forImage && optionsToUse.data.imageWrapperContext && optionsToUse.data.imageConfig == null) {
      return ''
    }

    let shouldRemove = false

    if (bookmarkType === 'start') {
      const startInstances = optionsToUse.data.bookmarkStartInstances
      shouldRemove = startInstances.includes(bookmarkId)

      if (!shouldRemove) {
        startInstances.push(bookmarkId)
      }
    } else {
      const startInstances = optionsToUse.data.bookmarkStartInstances
      const startIdx = startInstances.indexOf(bookmarkId)
      const hasStarted = startIdx !== -1

      if (!hasStarted) {
        shouldRemove = true
      } else {
        startInstances.splice(startIdx, 1)
      }
    }

    if (shouldRemove) {
      return ''
    }

    return optionsToUse.fn(this, { data: optionsToUse.data })
  }

  if (
    arguments.length === 1 &&
    (type === 'htmlDelimiterStart' || type === 'htmlDelimiterEnd')
  ) {
    if (optionsToUse.hash.cId == null) {
      throw new Error('docxSData "htmlDelimiter" helper cId not found')
    }

    if (optionsToUse.data.htmlCalls == null) {
      throw new Error('docxSData "htmlDelimiter" helper htmlCalls data not found')
    }

    const cId = optionsToUse.hash.cId
    const htmlCalls = optionsToUse.data.htmlCalls
    const { getTaskPrefix, resolveLatest } = htmlCalls

    const latestRecord = htmlCalls.records.get(htmlCalls.latest)
    const currentType = type === 'htmlDelimiterStart' ? 'start' : 'end'
    let result = ''

    // this case indicates an error, somehow handlebars generated output
    // does not contain valid start and end delimiters
    if (
      htmlCalls.latest != null &&
      htmlCalls.latest !== cId &&
      latestRecord != null
    ) {
      if (latestRecord.type === 'end') {
        resolveLatest(htmlCalls.latest, latestRecord.counter)
      } else {
        resolveLatest(htmlCalls.latest, null)
      }
    }

    if (type === 'htmlDelimiterStart') {
      if (htmlCalls.latest === cId && latestRecord?.type === 'end') {
        resolveLatest(htmlCalls.latest, latestRecord.counter)
      }

      if (!htmlCalls.records.has(cId)) {
        htmlCalls.records.set(cId, {
          taskKey: `${getTaskPrefix(cId)}1`,
          type: null,
          counter: 0,
          pending: new Map()
        })
      }

      htmlCalls.latest = cId
      htmlCalls.records.get(cId).type = currentType
    } else if (htmlCalls.records.get(cId) != null) {
      // if there is no record it means we got a closing delimiter without a start,
      // this means we should just ignore it
      const currentRecord = htmlCalls.records.get(cId)
      const { taskKey, counter: baseCounter, pending } = currentRecord

      const [resolve, reject] = optionsToUse.data.tasks.add(taskKey)

      if (!pending.has(taskKey)) {
        pending.set(taskKey, { resolve, reject })
      }

      const currentCounter = baseCounter + 1
      currentRecord.counter = currentCounter

      htmlCalls.latest = cId
      currentRecord.type = currentType

      const latestCounter = await optionsToUse.data.tasks.wait(taskKey)

      if (latestCounter === currentCounter) {
        result = '<!--__html_embed_container__-->'
      }
    }

    return new Handlebars.SafeString(result)
  }

  if (
    arguments.length === 1 &&
    type === 'image'
  ) {
    const jsreport = require('jsreport-proxy')
    const newData = Handlebars.createFrame(optionsToUse.data)

    newData.imageWrapperContext = true
    newData.imageBookmarkName = ''
    newData.imageTooltip = ''

    const imageTooltip = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.fn(this, { data: newData }))

    newData.imageTooltip = imageTooltip

    if (
      newData.imageConfig != null &&
      newData.imageConfig.bookmarkName != null &&
      typeof newData.imageConfig.bookmarkName === 'string' &&
      newData.imageConfig.bookmarkName !== ''
    ) {
      newData.imageBookmarkName = newData.imageConfig.bookmarkName
    }

    const content = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.inverse(this, { data: newData }))
    return content
  }

  if (
    arguments.length === 1 &&
    type === 'imageTooltip'
  ) {
    const jsreport = require('jsreport-proxy')
    const newTooltip = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.fn(this, { data: optionsToUse.data }))
    return newTooltip
  }

  if (
    arguments.length === 2 &&
    type === 'child'
  ) {
    const evalId = optionsToUse.data.evalId

    if (evalId == null) {
      throw new Error('docxSData type="child" helper invalid usage, evalId was not found')
    }

    const assetNamePathOrObject = data

    if (assetNamePathOrObject == null) {
      throw new Error('docxSData type="child" helper needs assetNamePathOrObject arg is required')
    }

    const newData = Handlebars.createFrame(optionsToUse.data)

    const docxChildInfo = {}

    if (typeof assetNamePathOrObject === 'object' && assetNamePathOrObject.content != null) {
      if (typeof assetNamePathOrObject.content !== 'string') {
        throw new Error('docxChild helper requires when asset parameter is object, a .content property exists and it to be a string')
      }

      docxChildInfo.content = assetNamePathOrObject.content
      docxChildInfo.encoding = assetNamePathOrObject.encoding || 'base64'
    } else {
      const jsreport = require('jsreport-proxy')

      if (typeof assetNamePathOrObject !== 'string') {
        throw new Error('docxChild helper requires asset parameter to be a string or an object with .content property')
      }

      const assetBase64Content = await jsreport.assets.read(assetNamePathOrObject, 'base64')

      docxChildInfo.content = assetBase64Content
      docxChildInfo.encoding = 'base64'
    }

    const childCacheKey = `${docxChildInfo.encoding}:${docxChildInfo.content}`

    if (!newData.childCache.has(childCacheKey)) {
      const childDocxAwaiter = {}

      childDocxAwaiter.promise = new Promise((resolve, reject) => {
        childDocxAwaiter.resolve = resolve
        childDocxAwaiter.reject = reject
      })

      newData.childCache.set(childCacheKey, childDocxAwaiter)

      try {
        const childDocxBuf = Buffer.from(docxChildInfo.content, docxChildInfo.encoding)
        const processChildEmbed = require('docxProcessChildEmbed')
        const xmlOutput = await processChildEmbed(childDocxBuf)
        const partialId = `docxChild${evalId}${newData.childCache.size}`
        Handlebars.registerPartial(partialId, xmlOutput)
        newData.childCache.set(childCacheKey, partialId)
        childDocxAwaiter.resolve(partialId)
      } catch (error) {
        childDocxAwaiter.reject(error)
      }
    }

    const childPartialResult = newData.childCache.get(childCacheKey)

    if (typeof childPartialResult !== 'string') {
      newData.childPartialId = await childPartialResult.promise
    } else {
      newData.childPartialId = childPartialResult
    }

    return optionsToUse.fn(this, { data: newData })
  }

  if (
    arguments.length === 1 &&
    type === 'childCaller'
  ) {
    return new Handlebars.SafeString('')
  }

  if (
    arguments.length === 1 &&
    type === 'styles'
  ) {
    const jsreport = require('jsreport-proxy')
    const newData = Handlebars.createFrame(optionsToUse.data)

    newData.styles = new Map()

    let result = await jsreport.templatingEngines.waitForAsyncHelper(optionsToUse.fn(this, { data: newData }))

    const processStyles = require('docxProcessStyles')

    result = processStyles(newData.styles, result)

    return result
  }

  if (
    arguments.length === 1 &&
    type === 'newFiles'
  ) {
    const jsreport = require('jsreport-proxy')

    await jsreport.templatingEngines.waitForAsyncHelpers()

    const output = []

    for (const [filePath, content] of optionsToUse.data.newFiles) {
      output.push(`${filePath}\n${content.toString('base64')}`)
    }

    const separator = '$$$'

    if (output.length === 0) {
      return ''
    }

    return new Handlebars.SafeString(`${separator}docxFile${separator}${output.join(`${separator}docxFile${separator}`)}`)
  }

  throw new Error(`invalid usage of docxSData helper${type != null ? ` (type: ${type})` : ''}`)
}
