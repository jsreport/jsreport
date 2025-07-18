
/* eslint no-unused-vars: 0 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
function docxContext (options) {
  const Handlebars = require('handlebars')
  let data

  const { type: contextType, path: docxFilePath } = options.hash

  if (contextType === 'global') {
    const jsreport = require('jsreport-proxy')
    data = Handlebars.createFrame(options.data)

    jsreport.req.context.__docxSharedData.htmlCalls = new Map()

    const { evalId } = options.hash

    data.evalId = evalId
    data.childCache = new Map()
    data.newDefaultContentTypes = new Map()
    data.newDocumentRels = new Set()
    data.newFiles = new Map()
  } else if (contextType === 'contentTypes' || contextType === 'documentRels') {
    data = Handlebars.createFrame(options.data)
  } else if (contextType === 'document' || contextType === 'header' || contextType === 'footer' || contextType === 'section') {
    data = Handlebars.createFrame(options.data)
  } else if (contextType === 'childContentPartial') {
    return options.data.childPartialId
  }

  if (
    contextType === 'document' ||
    contextType === 'header' ||
    contextType === 'footer'
  ) {
    data.documentType = contextType

    if (contextType !== 'document') {
      data.headerFooterName = options.hash.name
    }

    data.bookmarkStartInstances = []
    data.defaultShapeTypeByObjectType = new Map()

    data.htmlCalls = {
      latestContainerInstanceId: null,
      callsRecords: new Map(),
      latestDelimiter: null,
      delimiterRecords: new Map()
    }

    data.htmlCalls.getDelimiterTaskPrefix = (_cId) => {
      return `htmlDelimiter${_cId}@`
    }

    data.htmlCalls.resolveLatestDelimiter = (_cId, value) => {
      const record = data.htmlCalls.delimiterRecords.get(_cId)
      const oldTaskKey = record.taskKey
      const execution = record.pending.get(oldTaskKey)

      if (execution == null) {
        return
      }

      execution.resolve(value)
      const taskPrefix = data.htmlCalls.getDelimiterTaskPrefix(_cId)

      record.taskKey = `${taskPrefix}${parseInt(oldTaskKey.slice(taskPrefix.length), 10) + 1}`
      record.pending.delete(oldTaskKey)
    }

    data.htmlCalls.resolveLatestCall = (_cId) => {
      // resolving means that we should resolve all pending promises collected until this point
      // and parse the html of them
      const record = data.htmlCalls.callsRecords.get(_cId)

      if (record == null) {
        return
      }

      const jsreport = require('jsreport-proxy')

      const pendingTasks = [...record.pending.keys()]
      const tasksMap = new Map()
      const embedTypes = []

      // resolve possible async values for content and inline values of docxHtml call
      for (const taskKey of pendingTasks) {
        const { sectionId, content, inline, imageLoader, resolve, reject } = record.pending.get(taskKey)

        const task = {
          sectionId,
          imageLoader,
          resolve,
          reject,
          promise: Promise.all([
            jsreport.templatingEngines.waitForAsyncHelper(content),
            jsreport.templatingEngines.waitForAsyncHelper(inline)
          ]).then(([resolvedContent, resolvedInline]) => {
            if (resolvedContent == null) {
              throw new Error('docxHtml helper requires content parameter to be set')
            }

            task.content = resolvedContent
            task.inline = resolvedInline

            embedTypes.push(resolvedInline)

            return taskKey
          }).catch((err) => {
            err.taskKey = taskKey
            throw err
          })
        }

        tasksMap.set(taskKey, task)
        record.pending.delete(taskKey)
      }

      const taskValuePromises = [...tasksMap.values()].map((t) => t.promise)

      // we just wait until all values are resolved to start processing
      Promise.all(taskValuePromises).then((results) => {
        const embedType = embedTypes.every((value) => value === true) ? 'inline' : 'block'
        const sectionsData = jsreport.req.context.__docxSharedData.sections
        const processParseHtmlToDocxMeta = jsreport.req.context.__docxSharedData.processParseHtmlToDocxMeta

        const processPromises = []

        for (const taskKey of results) {
          const task = tasksMap.get(taskKey)
          const section = sectionsData.template.data.get(task.sectionId)

          if (section == null) {
            throw new Error(`Could not find section for id "${task.sectionId}" while processing docxHtml`)
          }

          processPromises.push(
            processParseHtmlToDocxMeta(
              task.content,
              embedType,
              section.colsWidth,
              task.imageLoader,
              jsreport.writeTempFileStream,
              jsreport.req.context.__docxSharedData.imageLoaderLock
            ).then((docxMeta) => {
              task.resolve({
                inline: task.inline,
                docxMeta
              })
            })
          )
        }

        return Promise.all(processPromises)
      }).catch((err) => {
        const allTaskKeys = [...tasksMap.keys()]
        const errTaskKeyIndex = err.taskKey != null ? allTaskKeys.indexOf(err.taskKey) : -1

        if (errTaskKeyIndex !== -1) {
          // ensure we reject the task that caused the error first
          const taskKey = allTaskKeys[errTaskKeyIndex]
          allTaskKeys.splice(errTaskKeyIndex, 1)
          allTaskKeys.unshift(taskKey)
        }

        // on any error we ensure that all pending
        // promises are settled
        for (const taskKey of allTaskKeys) {
          tasksMap.get(taskKey).reject(err)
        }
      })
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

  if (data == null) {
    throw new Error(`data was not initialized in "${contextType}"`)
  }

  if (contextType !== 'global' && docxFilePath != null) {
    data.docxFilePath = docxFilePath
  }

  const context = { data }

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

    const processMap = {
      contentTypes: {
        fn: jsreport.req.context.__docxSharedData.processContentTypes
      },
      documentRels: {
        fn: jsreport.req.context.__docxSharedData.processDocumentRels
      }
    }

    const processInfo = processMap[contextType]

    if (processInfo == null) {
      throw new Error(`docxContext helper invalid usage, process module function not found for type "${contextType}"`)
    }

    const processFn = processInfo.fn

    return jsreport.templatingEngines.waitForAsyncHelpers().then(() => {
      return processFn({
        ...options.data,
        idManagers: jsreport.req.context.__docxSharedData.idManagers
      }, output)
    })
  } else if (
    contextType === 'document' ||
    contextType === 'header' ||
    contextType === 'footer'
  ) {
    // resolve latest html calls delimiters
    if (data.htmlCalls.latestDelimiter != null) {
      for (const [cId, record] of data.htmlCalls.delimiterRecords) {
        if (record.pending?.size === 0) {
          continue
        }

        data.htmlCalls.resolveLatestDelimiter(cId, record.counter)
      }
    }

    // resolve latest html call
    if (data.htmlCalls.latestContainerInstanceId != null) {
      for (const [cId, record] of data.htmlCalls.callsRecords) {
        if (record.pending?.size === 0) {
          continue
        }

        data.htmlCalls.resolveLatestCall(cId)
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
  const jsreport = require('jsreport-proxy')
  const Handlebars = require('handlebars')
  const isInlineXML = options.hash.inlineXML === true
  let xmlInput = options.hash.xml

  if (isInlineXML && typeof xmlInput === 'string') {
    const decodeXML = jsreport.req.context.__docxSharedData.decodeXML
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
      const jsreport = require('jsreport-proxy')
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
        const getColWidth = jsreport.req.context.__docxSharedData.getColWidth
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

  const processObject = jsreport.req.context.__docxSharedData.processObject

  return new Handlebars.SafeString(processObject({
    ...options.data,
    idManagers: jsreport.req.context.__docxSharedData.idManagers,
    localIdManagers: jsreport.req.context.__docxSharedData.localIdManagers(options.data.docxFilePath)
  }, {
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

async function docxHtml (options) {
  const jsreport = require('jsreport-proxy')
  const Handlebars = require('handlebars')

  if (options.hash.cId == null) {
    throw new Error('docxHtml helper parameter cId not found')
  }

  const cId = options.hash.cId
  const htmlCalls = options.data.htmlCalls

  const delimiterRecord = htmlCalls.delimiterRecords.get(cId)

  if (delimiterRecord == null) {
    throw new Error('docxHtml helper invalid usage, delimiter record not found')
  }

  const latestContainerInstanceId = htmlCalls.latestContainerInstanceId
  const currentContainerInstanceId = delimiterRecord.taskKey

  if (!htmlCalls.callsRecords.has(currentContainerInstanceId)) {
    htmlCalls.callsRecords.set(currentContainerInstanceId, {
      id: 0,
      pending: new Map()
    })
  }

  if (latestContainerInstanceId != null && latestContainerInstanceId !== currentContainerInstanceId) {
    const { resolveLatestCall } = htmlCalls
    resolveLatestCall(latestContainerInstanceId)
  }

  htmlCalls.latestContainerInstanceId = currentContainerInstanceId

  const callRecord = htmlCalls.callsRecords.get(currentContainerInstanceId)

  callRecord.id += 1

  const taskKey = `${currentContainerInstanceId.replace('htmlDelimiter', 'htmlCall')}.${callRecord.id}`

  const [resolve, reject] = options.data.tasks.add(taskKey)

  let sectionId

  if (options.data.documentType === 'document') {
    if (options.hash.sId == null) {
      throw new Error('docxHtml helper parameter sId not found')
    }

    sectionId = options.hash.sId
  } else {
    sectionId = jsreport.req.context.__docxSharedData.headerAndFooterSections.get(options.data.headerFooterName)
  }

  if (sectionId == null) {
    throw new Error('could not find section id, for docxHtml call')
  }

  callRecord.pending.set(taskKey, {
    sectionId,
    content: options.hash.content,
    inline: options.hash.inline,
    imageLoader: options.hash.imageLoader,
    resolve,
    reject
  })

  const resolved = await options.data.tasks.wait(taskKey)

  const htmlCallResultId = (jsreport.req.context.__docxSharedData.htmlCalls.size + 1).toString()

  jsreport.req.context.__docxSharedData.htmlCalls.set(htmlCallResultId, resolved)

  return new Handlebars.SafeString(`$docxHtml${htmlCallResultId}$`)
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
    if (typeof value === 'function') {
      return true
    }

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
      'docxImage helper requires src parameter to be valid data uri (for png, jpeg, svg image), a valid url or a custom loader function. Got ' +
      optionsToUse.hash.src
    )
  }

  if (
    optionsToUse.hash.fallbackSrc != null &&
    !isValidSrc(optionsToUse.hash.fallbackSrc)
  ) {
    throw new Error(
      'docxImage helper requires fallbackSrc parameter to be valid data uri (for png, jpeg, svg image), a valid url or a custom loader function. Got ' +
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

  const processImageLoader = jsreport.req.context.__docxSharedData.processImageLoader
  let imageResolved

  try {
    imageResolved = await processImageLoader(
      optionsToUse.hash.src,
      optionsToUse.hash.fallbackSrc,
      jsreport.writeTempFileStream,
      jsreport.req.context.__docxSharedData.imageLoaderLock
    )
  } catch (imageLoaderError) {
    if (optionsToUse.hash.failurePlaceholderAction == null) {
      throw imageLoaderError
    }
  }

  const imageConfig = {
    image: imageResolved,
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
    const { getDelimiterTaskPrefix, resolveLatestDelimiter } = htmlCalls

    const latestDelimiterRecord = htmlCalls.delimiterRecords.get(htmlCalls.latestDelimiter)
    const currentType = type === 'htmlDelimiterStart' ? 'start' : 'end'
    let result = ''

    if (
      htmlCalls.latestDelimiter != null &&
      htmlCalls.latestDelimiter !== cId &&
      latestDelimiterRecord != null
    ) {
      if (latestDelimiterRecord.type === 'end') {
        // we are into another container, we should resolve the last delimiter
        resolveLatestDelimiter(htmlCalls.latestDelimiter, latestDelimiterRecord.counter)
      } else {
        // this case indicates an error, somehow handlebars generated output
        // does not contain valid start and end delimiters
        resolveLatestDelimiter(htmlCalls.latestDelimiter, null)
      }
    }

    if (type === 'htmlDelimiterStart') {
      if (htmlCalls.latestDelimiter === cId && latestDelimiterRecord?.type === 'end') {
        // we are in same container, the last delimiter was and end, this indicates that
        // delimiters are in loop, repeating it-selfs
        resolveLatestDelimiter(htmlCalls.latestDelimiter, latestDelimiterRecord.counter)
      }

      if (!htmlCalls.delimiterRecords.has(cId)) {
        htmlCalls.delimiterRecords.set(cId, {
          taskKey: `${getDelimiterTaskPrefix(cId)}1`,
          type: null,
          counter: 0,
          pending: new Map()
        })
      }

      htmlCalls.latestDelimiter = cId
      htmlCalls.delimiterRecords.get(cId).type = currentType
    } else if (htmlCalls.delimiterRecords.get(cId) != null) {
      // if there is no record it means we got a closing delimiter without a start,
      // this means we should just ignore it
      const currentDelimiterRecord = htmlCalls.delimiterRecords.get(cId)
      const { taskKey, counter: baseCounter, pending } = currentDelimiterRecord

      const [resolve, reject] = optionsToUse.data.tasks.add(taskKey)

      if (!pending.has(taskKey)) {
        pending.set(taskKey, { resolve, reject })
      }

      const currentCounter = baseCounter + 1
      currentDelimiterRecord.counter = currentCounter

      htmlCalls.latestDelimiter = cId
      currentDelimiterRecord.type = currentType

      const latestCounter = await optionsToUse.data.tasks.wait(taskKey)

      if (latestCounter === currentCounter) {
        result = '<!--__html_embed_container__-->'
      }
    }

    return new Handlebars.SafeString(result)
  }

  if (
    arguments.length === 1 &&
    type === 'sectionMark'
  ) {
    if (optionsToUse.hash.cId == null) {
      throw new Error('docxSData "sectionMark" helper cId not found')
    }

    const jsreport = require('jsreport-proxy')
    const sectionsData = jsreport.req.context.__docxSharedData.sections

    const currentCount = (sectionsData.output.counter.get(optionsToUse.hash.cId) ?? 0) + 1

    sectionsData.output.counter.set(optionsToUse.hash.cId, currentCount)

    return new Handlebars.SafeString(`<!--__docxSectionPr${optionsToUse.hash.cId}__-->`)
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
    const jsreport = require('jsreport-proxy')
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
        const processChildEmbed = jsreport.req.context.__docxSharedData.processChildEmbed
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

    const processStyles = jsreport.req.context.__docxSharedData.processStyles

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
