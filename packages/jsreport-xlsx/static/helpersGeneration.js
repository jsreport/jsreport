/* eslint no-unused-vars: 0 */

function xlsxColAutofit (options) {
  if (
    options?.data?.meta?.autofit?.enabledFor?.length > 0 &&
    options.hash.all === true
  ) {
    options.data.meta.autofit.enabledFor = [true]
  }

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
    throw new Error('docxChart helper when options parameter is set, it should be an object')
  }

  return new Handlebars.SafeString(`$xlsxChart${Buffer.from(JSON.stringify(options.hash)).toString('base64')}$`)
}

function xlsxSData (data, options) {
  const Handlebars = require('handlebars')
  const optionsToUse = options == null ? data : options
  const type = optionsToUse.hash.type

  if (type == null) {
    throw new Error('xlsxSData helper type arg is required')
  }

  if (
    arguments.length === 1 &&
    type === 'raw'
  ) {
    return optionsToUse.fn()
  }

  if (
    arguments.length === 1 &&
    type === 'root'
  ) {
    const newData = Handlebars.createFrame({})
    let nonExistingCellRefs = optionsToUse.hash.nonExistingCellRefs != null ? optionsToUse.hash.nonExistingCellRefs.split(',') : []
    const autofit = optionsToUse.hash.autofit != null ? optionsToUse.hash.autofit.split(',') : []
    const trackedCells = {}

    if (nonExistingCellRefs.length > 0) {
      nonExistingCellRefs = nonExistingCellRefs.map((cellRef) => {
        const parts = cellRef.split('|')
        const result = {
          ref: parts[0]
        }

        if (parts.length === 2) {
          result.inLoop = true
          result.loopHierarchyId = parts[1]
        }

        return result
      })

      for (const cellRefEntry of nonExistingCellRefs) {
        trackedCells[cellRefEntry.ref] = {
          first: cellRefEntry.ref,
          last: cellRefEntry.ref,
          count: 0
        }

        if (cellRefEntry.inLoop) {
          trackedCells[cellRefEntry.ref].inLoop = cellRefEntry.inLoop
          trackedCells[cellRefEntry.ref].loopHierarchyId = cellRefEntry.loopHierarchyId
        } else {
          trackedCells[cellRefEntry.ref].inLoop = false
        }
      }
    }

    newData.meta = {
      autofit: {
        cols: {},
        enabledFor: autofit
      },
      mergeCells: [],
      trackedCells,
      updatedOriginalCells: {},
      lazyFormulas: {},
      lastCellRef: null
    }

    newData.loopItems = []
    newData.evaluatedLoopsIds = []
    newData.outOfLoopTemplates = Object.create(null)

    return optionsToUse.fn(this, { data: newData })
  }

  const getLoopItemById = (byTarget, loopItems) => {
    if (byTarget == null) {
      throw new Error('getLoopItemById byTarget arg is invalid')
    }

    if (!Array.isArray(loopItems)) {
      throw new Error('getLoopItemById loopItems arg is invalid')
    }

    const { idName, idValue } = byTarget

    if (idName == null || typeof idName !== 'string') {
      throw new Error('getLoopItemById byTarget.idName arg is invalid')
    }

    if (idName !== 'hierarchyId' && idName !== 'id') {
      throw new Error('getLoopItemById byTarget.idName should be either "hierarchyId" or "id"')
    }

    if (idValue == null || typeof idValue !== 'string') {
      throw new Error('getLoopItemById byTarget.idValue arg is invalid')
    }

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

  const getParentLoopItemByHierarchy = (childLoopItem, loopItems) => {
    if (childLoopItem == null) {
      throw new Error('getParentLoopItemByHierarchy childLoopItem arg is invalid')
    }

    if (!Array.isArray(loopItems)) {
      throw new Error('getParentLoopItemByHierarchy loopItems arg is invalid')
    }

    const parentHierarchyId = childLoopItem.hierarchyId.split('#').slice(0, -1).join('#')

    if (parentHierarchyId === '') {
      return
    }

    return getLoopItemById({ idName: 'hierarchyId', idValue: parentHierarchyId }, loopItems)
  }

  if (
    arguments.length === 2 &&
    type === 'loop'
  ) {
    const start = optionsToUse.hash.start
    const columnStart = optionsToUse.hash.columnStart
    const end = optionsToUse.hash.end
    const columnEnd = optionsToUse.hash.columnEnd
    const hierarchyId = optionsToUse.hash.hierarchyId
    const newData = Handlebars.createFrame(optionsToUse.data)

    if (start == null) {
      throw new Error('xlsxSData type="loop" helper start arg is required')
    }

    if (columnStart == null) {
      throw new Error('xlsxSData type="loop" helper columnStart arg is required')
    }

    if (columnEnd == null) {
      throw new Error('xlsxSData type="loop" helper columnEnd arg is required')
    }

    if (hierarchyId == null) {
      throw new Error('xlsxSData type="loop" helper hierarchyId arg is required')
    }

    let targetData = data

    // for empty we create an array with one empty object,
    // this is needed because we want to preserve the original row
    if (
      targetData == null ||
      (Array.isArray(targetData) && targetData.length === 0)
    ) {
      targetData = [{}]
    }

    const loopItem = {
      type: end == null ? 'row' : 'block',
      id: null,
      hierarchyId,
      start,
      columnStart,
      end,
      columnEnd,
      length: targetData.length,
      parentLoopIndex: optionsToUse.data.index,
      children: [],
      completed: false
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

    const result = Handlebars.helpers.each(targetData, { ...optionsToUse, data: newData })

    loopItem.completed = true

    return result
  }

  if (
    arguments.length === 1 &&
    type === 'outOfLoop'
  ) {
    const item = optionsToUse.hash.item

    if (item == null) {
      throw new Error('xlsxSData type="outOfLoop" helper item arg is required')
    }

    optionsToUse.data.outOfLoopTemplates[item] = (currentLoopId, currentIdx) => {
      const newData = Handlebars.createFrame(optionsToUse.data)

      newData.currentLoopId = currentLoopId

      if (currentIdx != null) {
        newData.index = currentIdx
      }

      return optionsToUse.fn(this, { data: newData })
    }

    return new Handlebars.SafeString('')
  }

  if (
    arguments.length === 1 &&
    type === 'outOfLoopPlaceholder'
  ) {
    const item = optionsToUse.hash.item

    if (item == null) {
      throw new Error('xlsxSData type="outOfLoopPlaceholder" helper item arg is required')
    }

    const outOfLoopTemplate = optionsToUse.data.outOfLoopTemplates[item]

    if (outOfLoopTemplate == null) {
      throw new Error('xlsxSData type="outOfLoopPlaceholder" helper invalid usage, outOfLoopItem was not found')
    }

    const currentLoopId = optionsToUse.data.currentLoopId

    if (currentLoopId == null) {
      throw new Error('xlsxSData type="outOfLoopPlaceholder" helper invalid usage, currentLoopId not found')
    }

    const currentIdx = optionsToUse.data.index

    const output = outOfLoopTemplate(currentLoopId, currentIdx)

    return new Handlebars.SafeString(output)
  }

  const { parseCellRef, evaluateCellRefsFromExpression, getNewFormula, generateNewCellRefFromRow } = require('cellUtils')

  const getCurrentLoopItem = (loopId, loopItems) => {
    if (!Array.isArray(loopItems)) {
      throw new Error('getCurrentLoopItem loopItems arg is invalid')
    }

    if (loopId == null) {
      return
    }

    return getLoopItemById({ idName: 'id', idValue: loopId }, loopItems)
  }

  const getPreviousLoopItems = (loopId, evaluatedLoopsIds, loopItems) => {
    if (!Array.isArray(evaluatedLoopsIds)) {
      throw new Error('getPreviousLoopItems evaluatedLoopsIds arg is invalid')
    }

    if (!Array.isArray(loopItems)) {
      throw new Error('getPreviousLoopItems loopItems arg is invalid')
    }

    const lastEvaluatedLoopId = evaluatedLoopsIds[evaluatedLoopsIds.length - 1]
    const loopItemsToGet = loopId != null && loopId === lastEvaluatedLoopId ? evaluatedLoopsIds.slice(0, -1) : evaluatedLoopsIds
    const result = []

    for (const lId of loopItemsToGet) {
      const loopItem = getLoopItemById({ idName: 'id', idValue: lId }, loopItems)

      if (loopItem == null) {
        throw new Error(`Can not find loop item by id "${lId}"`)
      }

      if (!loopItem.completed) {
        continue
      }

      result.push(loopItem)
    }

    return result
  }

  const getCurrentAndPreviousLoopItemsByTarget = (byTarget, loopItems) => {
    if (byTarget == null) {
      throw new Error('getCurrentAndPreviousLoopItemsByTarget byTarget arg is invalid')
    }

    if (byTarget.rowNumber == null) {
      throw new Error('getCurrentAndPreviousLoopItemsByTarget byTarget.rowNumber arg is required')
    }

    if (byTarget.columnNumber == null) {
      throw new Error('getCurrentAndPreviousLoopItemsByTarget byTarget.columnNumber arg is required')
    }

    if (!Array.isArray(loopItems)) {
      throw new Error('getCurrentAndPreviousLoopItemsByTarget loopItems arg is invalid')
    }

    const { rowNumber, columnNumber } = byTarget

    const matchedLoopItems = loopItems.filter((item) => {
      if (!item.completed) {
        throw new Error('getCurrentAndPreviousLoopItemsByTarget invalid usage, it should be called only after all loop items are completed evaluated')
      }

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

  const getLoopItemTemplateLength = (loopItem) => {
    if (loopItem == null) {
      throw new Error('getLoopItemTemplateLength loopItem arg is invalid')
    }

    let templateLength = 1

    if (loopItem.type === 'block') {
      templateLength = (loopItem.end - loopItem.start) + 1
    }

    return templateLength
  }

  const getParentsLoopItems = (loopId, loopItems) => {
    if (loopId == null) {
      throw new Error('getParentsLoopItems loopId arg is invalid')
    }

    if (!Array.isArray(loopItems)) {
      throw new Error('getParentsLoopItems loopItems arg is invalid')
    }

    const results = []
    const parentIdParts = loopId.split('#').slice(0, -1)

    if (parentIdParts.length === 0) {
      return results
    }

    let parentId = ''

    for (let index = 0; index < parentIdParts.length; index++) {
      parentId += parentId === '' ? parentIdParts[index] : `#${parentIdParts[index]}`

      const result = getLoopItemById({ idName: 'id', idValue: parentId }, loopItems)

      if (!result) {
        throw new Error(`Can not find loop item by id "${parentId}"`)
      }

      results.push(result)
    }

    return results
  }

  if (
    arguments.length === 1 &&
    type === 'row'
  ) {
    const originalRowNumber = optionsToUse.hash.originalRowNumber

    if (originalRowNumber == null) {
      throw new Error('xlsxSData type="row" helper originalRowNumber arg is required')
    }

    const newData = Handlebars.createFrame(optionsToUse.data)

    const currentLoopItem = getCurrentLoopItem(newData.currentLoopId, newData.loopItems)
    // this gets the previous loops (loops defined before a cell) and also on the case of nested loops
    // all the previous executions of the current loop
    const previousLoopItems = getPreviousLoopItems(newData.currentLoopId, newData.evaluatedLoopsIds, newData.loopItems)

    const previousMeta = {
      prev: {
        total: 0,
        rowLoopLength: 0
      },
      rest: {
        total: 0,
        rowLoopLength: 0
      }
    }

    const currentRootLoopIdNum = newData.currentLoopId != null ? parseInt(newData.currentLoopId.split('#')[0], 10) : -1

    let currentLoopIncrement = 0

    for (const item of previousLoopItems) {
      const previousRootLoopIdNum = parseInt(item.id.split('#')[0], 10)
      const isPrev = currentRootLoopIdNum === -1 ? true : previousRootLoopIdNum < currentRootLoopIdNum
      let loopItemsLength = 0
      const target = isPrev ? previousMeta.prev : previousMeta.rest

      if (item.type === 'block') {
        loopItemsLength += getLoopItemTemplateLength(item) * (item.length - 1)
      } else {
        loopItemsLength += item.length
        target.rowLoopLength += 1
      }

      target.total += loopItemsLength
    }

    const previousRootLoopIncrement = previousMeta.prev.total + (previousMeta.prev.rowLoopLength > 0 ? previousMeta.prev.rowLoopLength * -1 : 0)
    const previousLoopIncrement = previousRootLoopIncrement + previousMeta.rest.total + (previousMeta.rest.rowLoopLength > 0 ? previousMeta.rest.rowLoopLength * -1 : 0)

    if (currentLoopItem) {
      const loopIndex = optionsToUse.data.index

      if (loopIndex == null) {
        throw new Error('xlsxSData type="row" helper expected loop index to be defined')
      }

      const parents = getParentsLoopItems(currentLoopItem.id, newData.loopItems)
      let parentLoopIndex = currentLoopItem.parentLoopIndex

      parents.reverse()

      for (const parentLoopItem of parents) {
        currentLoopIncrement += getLoopItemTemplateLength(parentLoopItem) * parentLoopIndex
        parentLoopIndex = parentLoopItem.parentLoopIndex
      }

      const templateLength = getLoopItemTemplateLength(currentLoopItem)

      currentLoopIncrement = currentLoopIncrement + (templateLength * loopIndex)
    }

    const increment = previousLoopIncrement + currentLoopIncrement

    newData.rowNumber = originalRowNumber + increment
    // only a value that represents the increment of previous loops defined before the cell
    newData.previousLoopIncrement = previousRootLoopIncrement
    // this is a value that represents all the executions of the current loop (considering nested loops too)
    newData.currentLoopIncrement = currentLoopIncrement + (previousLoopIncrement - previousRootLoopIncrement)

    newData.columnLetter = null
    newData.currentCellRef = null

    const result = optionsToUse.fn(this, { data: newData })

    return result
  }

  if (
    arguments.length === 1 &&
    type === 'rowNumber'
  ) {
    return optionsToUse.data.rowNumber
  }

  if (
    arguments.length === 1 &&
    type === 'cellRef'
  ) {
    const rowNumber = optionsToUse.data.rowNumber
    const trackedCells = optionsToUse.data.meta.trackedCells
    const originalCellRef = optionsToUse.hash.originalCellRef
    const isShadowCall = optionsToUse.hash.shadow === true

    if (rowNumber == null) {
      throw new Error(`xlsxSData type="${type}" invalid usage, rowNumber needs to exists on internal data`)
    }

    if (trackedCells == null) {
      throw new Error(`xlsxSData type="${type}" invalid usage, trackedCells needs to exists on internal data`)
    }

    if (originalCellRef == null) {
      throw new Error('xlsxSData type="cellRef" helper originalCellRef arg is required')
    }

    const parsedOriginalCellRef = parseCellRef(originalCellRef)
    const updatedCellRef = `${parsedOriginalCellRef.letter}${rowNumber}`

    // keeping the lastCellRef updated
    if (optionsToUse.data.meta.lastCellRef == null) {
      optionsToUse.data.meta.lastCellRef = updatedCellRef
    } else {
      const parsedLastCellRef = parseCellRef(optionsToUse.data.meta.lastCellRef)
      const parsedUpdatedCellRef = parseCellRef(updatedCellRef)

      if (
        (parsedUpdatedCellRef.rowNumber === parsedLastCellRef.rowNumber &&
        parsedUpdatedCellRef.columnNumber > parsedLastCellRef.columnNumber) ||
        (parsedUpdatedCellRef.rowNumber > parsedLastCellRef.rowNumber)
      ) {
        optionsToUse.data.meta.lastCellRef = updatedCellRef
      }
    }

    let shouldUpdateOriginalCell

    // if we are in loop then don't add item to updatedOriginalCells
    if (optionsToUse.data.currentLoopId != null) {
      shouldUpdateOriginalCell = false
    } else {
      shouldUpdateOriginalCell = originalCellRef !== updatedCellRef && optionsToUse.data.meta.updatedOriginalCells[originalCellRef] == null
    }

    if (shouldUpdateOriginalCell) {
      // keeping a registry of the original cells that were updated
      optionsToUse.data.meta.updatedOriginalCells[originalCellRef] = updatedCellRef
    }

    if (!isShadowCall) {
      trackedCells[originalCellRef] = trackedCells[originalCellRef] || { first: null, last: null, count: 0 }

      if (trackedCells[originalCellRef].inLoop == null) {
        trackedCells[originalCellRef].inLoop = optionsToUse.data.currentLoopId != null
      }

      if (trackedCells[originalCellRef].first == null) {
        trackedCells[originalCellRef].first = updatedCellRef
      }

      trackedCells[originalCellRef].last = updatedCellRef
      trackedCells[originalCellRef].count += 1
    }

    optionsToUse.data.columnLetter = parsedOriginalCellRef.letter
    optionsToUse.data.currentCellRef = updatedCellRef

    return updatedCellRef
  }

  if (
    arguments.length === 1 &&
    type === 'cellValue'
  ) {
    const newData = Handlebars.createFrame(optionsToUse.data)

    newData.currentCellValueInfo = {}

    if (Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'value')) {
      newData.currentCellValueInfo.value = optionsToUse.hash.value

      let toEscape = false

      // escape should be there when the original handlebars expression was intended
      // to be escaped, we preserve that intend here and escape it, we need to do this
      // because handlebars does not escape automatically the helper parameter hash,
      // which we use as an implementation detail of our auto detect cell type logic
      if (Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'escape')) {
        toEscape = optionsToUse.hash.escape === true && typeof newData.currentCellValueInfo.value === 'string'
      }

      if (toEscape) {
        newData.currentCellValueInfo.value = Handlebars.escapeExpression(newData.currentCellValueInfo.value)
      }
    }

    const result = optionsToUse.fn(this, { data: newData })
    const enabledForCol = newData.meta.autofit.enabledFor[0] === true ? true : newData.meta.autofit.enabledFor.includes(newData.columnLetter)

    if (enabledForCol) {
      const pixelWidth = require('string-pixel-width')
      const fontSize = optionsToUse.hash.fontSize
      const fontSizeInPx = fontSize * (96 / 72)
      const currentValue = newData.currentCellValueInfo.value
      const maxInfo = newData.meta.autofit.cols[newData.columnLetter]

      const size = pixelWidth(currentValue, { font: 'Arial', size: fontSizeInPx })

      if (maxInfo == null) {
        newData.meta.autofit.cols[newData.columnLetter] = {
          value: currentValue,
          size
        }
      } else if (size > maxInfo.size) {
        newData.meta.autofit.cols[newData.columnLetter] = {
          value: currentValue,
          size
        }
      }
    }

    return result
  }

  if (
    arguments.length === 1 &&
    type === 'cellValueRaw'
  ) {
    const newData = Handlebars.createFrame(optionsToUse.data)
    const result = optionsToUse.fn(this, { data: newData })

    if (
      optionsToUse?.data?.currentCellValueInfo != null &&
      !Object.prototype.hasOwnProperty.call(optionsToUse.data.currentCellValueInfo, 'value')
    ) {
      optionsToUse.data.currentCellValueInfo.value = result
    }

    return ''
  }

  if (
    arguments.length === 1 &&
    type === 'cellValueType'
  ) {
    const cellValue = optionsToUse.data.currentCellValueInfo.value
    let cellType

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

    optionsToUse.data.currentCellValueInfo.type = cellType

    return cellType
  }

  if (
    arguments.length === 1 &&
    type === 'cellContent'
  ) {
    const cellType = optionsToUse.data.currentCellValueInfo.type
    const cellValue = optionsToUse.data.currentCellValueInfo.value
    let result

    if (cellType === 'inlineStr') {
      result = `<is><t>${cellValue == null ? '' : cellValue}</t></is>`
    } else if (cellType === 'b') {
      result = `<v>${cellValue ? '1' : '0'}</v>`
    } else if (cellType === 'n') {
      result = `<v>${cellValue}</v>`
    }

    if (result == null) {
      throw new Error(`xlsxSData type="cellContent" helper does not support cell type "${cellType}"`)
    }

    return new Handlebars.SafeString(result)
  }

  if (
    arguments.length === 1 &&
    type === 'autofit'
  ) {
    const result = []
    const autofitInfo = optionsToUse.data.meta.autofit

    for (const [colLetter, colInfo] of Object.entries(autofitInfo.cols)) {
      result.push(`<col ref="${colLetter}" size="${colInfo.size}" />`)
    }

    return new Handlebars.SafeString(result.join('\n'))
  }

  const getNewCellRef = (cellRefInput, originLoopMeta, mode = 'standalone', context) => {
    const { updatedOriginalCells, loopItems } = context
    let cellRef
    let originCellRef

    if (Array.isArray(cellRefInput)) {
      originCellRef = cellRefInput[0]
      cellRef = cellRefInput[1]
    } else {
      cellRef = cellRefInput
    }

    const parsedCellRef = parseCellRef(cellRef)
    const parsedOriginCellRef = originCellRef != null ? parseCellRef(originCellRef) : undefined
    const normalizedCellRef = cellRef.replace('$', '')
    let newCellRef = updatedOriginalCells[normalizedCellRef]
    let currentLoopItem

    if (newCellRef == null) {
      // if not found on original cells then do a check if we find
      // matched loop items for the referenced row numbers
      const {
        current: currentLoopItemForTarget,
        previousAll: previousAllLoopItemsForTarget,
        previous: previousLoopItemsForTarget
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

        if (
          currentLoopItemForTarget != null &&
          (
            (type === 'newCellRef' && mode === 'rangeEnd') ||
            (type === 'formulas' &&
            originCellRef != null &&
            !originIsLoopItem &&
            mode === 'rangeEnd')
          )
        ) {
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

  if (
    arguments.length === 1 &&
    (type === 'mergeCell' || type === 'formula')
  ) {
    const rowNumber = optionsToUse.data.rowNumber

    if (rowNumber == null) {
      throw new Error(`xlsxSData type="${type}" invalid usage, rowNumber needs to exists on internal data`)
    }

    let output = ''

    if (type === 'mergeCell') {
      const originalCellRefRange = optionsToUse.hash.originalCellRefRange

      if (originalCellRefRange == null) {
        throw new Error(`xlsxSData type="${type}" helper originalCellRefRange arg is required`)
      }

      const { newValue } = evaluateCellRefsFromExpression(originalCellRefRange, (cellRefInfo) => {
        const isRange = cellRefInfo.type === 'rangeStart' || cellRefInfo.type === 'rangeEnd'

        if (!isRange) {
          throw new Error(`xlsxSData type="mergeCell" helper only support range for cell refs. value: "${originalCellRefRange}"`)
        }

        const increment = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.rowNumber - cellRefInfo.parsedRangeStart.rowNumber : 0

        const newCellRef = generateNewCellRefFromRow(cellRefInfo.parsed, rowNumber + increment)

        return newCellRef
      })

      const mergeCell = {
        original: originalCellRefRange,
        value: newValue
      }

      optionsToUse.data.meta.mergeCells.push(mergeCell)
    } else {
      const currentCellRef = optionsToUse.data.currentCellRef
      const trackedCells = optionsToUse.data.meta.trackedCells
      const lazyFormulas = optionsToUse.data.meta.lazyFormulas
      const originalCellRef = optionsToUse.hash.originalCellRef
      const originalFormula = optionsToUse.hash.originalFormula
      const previousLoopIncrement = optionsToUse.data.previousLoopIncrement
      const currentLoopIncrement = optionsToUse.data.currentLoopIncrement

      if (currentCellRef == null) {
        throw new Error(`xlsxSData type="${type}" invalid usage, currentCellRef needs to exists on internal data`)
      }

      if (trackedCells == null) {
        throw new Error(`xlsxSData type="${type}" invalid usage, trackedCells needs to exists on internal data`)
      }

      if (lazyFormulas == null) {
        throw new Error(`xlsxSData type="${type}" invalid usage, lazyFormulas needs to exists on internal data`)
      }

      if (originalCellRef == null) {
        throw new Error('xlsxSData type="formula" helper originalCellRef arg is required')
      }

      if (originalFormula == null) {
        throw new Error('xlsxSData type="formula" helper originalFormula arg is required')
      }

      if (currentLoopIncrement == null) {
        throw new Error(`xlsxSData type="${type}" invalid usage, currentLoopIncrement needs to exists on internal data`)
      }

      const parsedOriginCellRef = parseCellRef(originalCellRef)
      const originCellIsFromLoop = optionsToUse.data.currentLoopId != null

      const { formula: newFormula } = getNewFormula(type, originalFormula, parsedOriginCellRef, {
        type: 'normal',
        originCellIsFromLoop,
        previousLoopIncrement,
        currentLoopIncrement,
        trackedCells,
        includeLoopIncrementResolver: (cellRefIsFromLoop, cellRefInfo) => {
          return (
            cellRefIsFromLoop &&
            trackedCells[cellRefInfo.localRef] != null &&
            trackedCells[cellRefInfo.localRef].loopHierarchyId === getCurrentLoopItem(optionsToUse.data.currentLoopId, optionsToUse.data.loopItems)?.hierarchyId
          )
        },
        lazyFormulas,
        currentCellRef
      })

      output = newFormula
    }

    return output
  }

  if (
    arguments.length === 1 &&
    type === 'mergeCells'
  ) {
    const targetItems = optionsToUse.data.meta.mergeCells
    const newData = Handlebars.createFrame(optionsToUse.data)

    newData.mergeCellsCount = targetItems.length
    newData.mergeCellsTemplates = Object.create(null)

    return optionsToUse.fn(this, { data: newData })
  }

  if (
    arguments.length === 1 &&
    type === 'mergeCellsItems'
  ) {
    const targetItems = optionsToUse.data.meta.mergeCells

    // run the body to fulfill the merge cells templates
    optionsToUse.fn(this)

    const mergeCellsTemplates = optionsToUse.data.mergeCellsTemplates

    const updated = []

    for (const targetItem of targetItems) {
      const template = mergeCellsTemplates[targetItem.original]
      const output = template({ newRef: targetItem.value })
      updated.push(output)
    }

    return new Handlebars.SafeString(updated.join('\n'))
  }

  if (
    arguments.length === 1 &&
    type === 'mergeCellItem'
  ) {
    const originalCellRefRange = optionsToUse.hash.originalCellRefRange

    if (originalCellRefRange == null) {
      throw new Error('xlsxSData type="mergeCellItem" helper originalCellRefRange arg is required')
    }

    optionsToUse.data.mergeCellsTemplates[originalCellRefRange] = optionsToUse.fn

    return ''
  }

  if (
    arguments.length === 1 &&
    type === 'formulaSharedRefRange'
  ) {
    const rowNumber = optionsToUse.data.rowNumber

    if (rowNumber == null) {
      throw new Error('xlsxSData type="formulaSharedRefRange" invalid usage, rowNumber needs to exists on internal data')
    }

    const originalSharedRefRange = optionsToUse.hash.originalSharedRefRange

    if (originalSharedRefRange == null) {
      throw new Error('xlsxSData type="formulaSharedRefRange" helper originalSharedRefRange arg is required')
    }

    const { newValue } = evaluateCellRefsFromExpression(originalSharedRefRange, (cellRefInfo) => {
      const newCellRef = generateNewCellRefFromRow(cellRefInfo.parsed, rowNumber)
      return newCellRef
    })

    return newValue
  }

  if (
    arguments.length === 1 &&
    type === 'lazyFormulas'
  ) {
    const trackedCells = optionsToUse.data.meta.trackedCells
    const lazyFormulas = optionsToUse.data.meta.lazyFormulas

    if (trackedCells == null) {
      throw new Error(`xlsxSData type="${type}" invalid usage, trackedCells needs to exists on internal data`)
    }

    if (lazyFormulas == null) {
      throw new Error(`xlsxSData type="${type}" invalid usage, lazyFormulas needs to exists on internal data`)
    }

    if (lazyFormulas.count == null || lazyFormulas.count === 0) {
      return new Handlebars.SafeString('')
    }

    const result = []

    const lazyFormulaIds = Object.keys(lazyFormulas.data)

    for (const lazyFormulaId of lazyFormulaIds) {
      const lazyFormulaInfo = lazyFormulas.data[lazyFormulaId]

      const {
        formula,
        parsedOriginCellRef,
        originCellIsFromLoop,
        previousLoopIncrement,
        currentLoopIncrement,
        cellRefs
      } = lazyFormulaInfo

      const { formula: newFormula } = getNewFormula(type, formula, parsedOriginCellRef, {
        type: 'lazy',
        originCellIsFromLoop,
        previousLoopIncrement,
        currentLoopIncrement,
        trackedCells,
        lazyCellRefs: cellRefs
      })

      result.push(`<item id="${lazyFormulaId}">${newFormula}</item>`)
    }

    return new Handlebars.SafeString(`<lazyFormulas>${result.join('\n')}</lazyFormulas>`)
  }

  // TODO: this should be refactored at some point to be more generic
  // and support nested loops, maybe the logic will be similar to mergeCell or formula helpers
  // when this is done we can remove all the methods that are only used here "getNewCellRef", "getCurrentAndPreviousLoopItemsByTarget"
  if (
    arguments.length === 1 &&
    type === 'newCellRef'
  ) {
    const updatedOriginalCells = optionsToUse.data.meta.updatedOriginalCells
    const loopItems = optionsToUse.data.loopItems
    let targetItems = []
    const updated = []

    if (type === 'newCellRef') {
      targetItems = [{ value: optionsToUse.hash.originalCellRefRange }]
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

  if (
    arguments.length === 1 &&
    type === 'dimensionRef'
  ) {
    const originalCellRefRange = optionsToUse.hash.originalCellRefRange

    if (originalCellRefRange == null) {
      throw new Error('xlsxSData type="dimensionRef" helper originalCellRefRange arg is required')
    }

    const refsParts = originalCellRefRange.split(':')

    if (refsParts.length === 1) {
      return refsParts[0]
    }

    const lastCellRef = optionsToUse.data.meta.lastCellRef
    const parsedEndCellRef = parseCellRef(refsParts[1])
    const parsedLastCellRef = parseCellRef(lastCellRef)
    return `${refsParts[0]}:${parsedEndCellRef.letter}${parsedLastCellRef.rowNumber}`
  }

  throw new Error(`invalid usage of xlsxSData helper${type != null ? ` (type: ${type})` : ''}`)
}
