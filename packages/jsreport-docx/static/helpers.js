/* eslint no-unused-vars: 0 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
function docxContext (options) {
  const Handlebars = require('handlebars')
  let data

  if (options.hash.type === 'global') {
    data = Handlebars.createFrame(options.data)
    data.evalId = options.hash.evalId
    data.childCache = new Map()
  } else if (options.hash.type === 'document') {
    data = Handlebars.createFrame(options.data)
    data.currentSectionIdx = 0
    data.bookmarkStartInstances = []
  } else if (options.hash.type === 'header' || options.hash.type === 'footer') {
    data = Handlebars.createFrame(options.data)
    data.bookmarkStartInstances = []
  } else if (options.hash.type === 'sectionIdx') {
    const idx = options.data.currentSectionIdx

    if (options.hash.increment === true) {
      options.data.currentSectionIdx += 1
    }

    return idx
  } else if (options.hash.type === 'childContentPartial') {
    return options.data.childPartialId
  }

  const context = {}

  if (data) {
    context.data = data
  }

  const output = options.fn(this, context)

  // clear the child cache/partials after the global context is processed
  if (options.hash.type === 'global') {
    const jsreport = require('jsreport-proxy')

    return jsreport.templatingEngines.waitForAsyncHelpers().then(() => output).finally(() => {
      const childCache = data.childCache

      for (const partialId of childCache.values()) {
        Handlebars.unregisterPartial(partialId)
      }

      childCache.clear()
    })
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

function docxTable (data, options) {
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
    const newData = Handlebars.createFrame({})
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
      optionsToUse.hash.check === 'colspan' &&
      optionsToUse.data.colspan > 1
    ) {
      return optionsToUse.fn(optionsToUse.data.colspan)
    }

    if (
      optionsToUse.hash.check === 'rowspan'
    ) {
      const matchedMergedCell = getMatchedMergedCell(optionsToUse.data.rowIndex, optionsToUse.data.columnIndex, optionsToUse.data.activeMergedCellsItems)

      if (matchedMergedCell != null && matchedMergedCell.rowStart !== matchedMergedCell.rowEnd) {
        const data = Handlebars.createFrame({})
        data.empty = matchedMergedCell.rowStart !== optionsToUse.data.rowIndex
        return optionsToUse.fn({}, { data })
      }
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
    const newData = Handlebars.createFrame(optionsToUse.data)

    newData.styles = new Map()

    let result = optionsToUse.fn(this, { data: newData })

    const processStyles = require('docxProcessStyles')

    result = processStyles(newData.styles, result)

    return result
  }

  throw new Error(`invalid usage of docxSData helper${type != null ? ` (type: ${type})` : ''}`)
}
