const { DOMParser } = require('@xmldom/xmldom')
const { parseCellRef, getColumnFor, generateNewCellRefFrom, evaluateCellRefsFromExpression } = require('./cellUtils')

function assertOk (valid, message) {
  if (!valid) {
    throw new Error(message)
  }
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

function updateDimension (runtime, cellNumbers) {
  if (cellNumbers.rowNumber == null && cellNumbers.columnNumber == null) {
    throw new Error('cellNumbers must have at least rowNumber or columnNumber properties defined')
  }

  // keeping dimension updated
  if (runtime.dimension == null) {
    runtime.dimension = {
      start: { ...cellNumbers },
      end: { ...cellNumbers }
    }
  } else if (
    (cellNumbers.rowNumber === runtime.dimension.end.rowNumber &&
    cellNumbers.columnNumber > runtime.dimension.end.columnNumber) ||
    (cellNumbers.rowNumber > runtime.dimension.end.rowNumber)
  ) {
    runtime.dimension.end = { ...cellNumbers }
  }
}

function updateMergeCells (mergeCellItems, originalCellInfo, updatedStartCell) {
  const { newValue } = evaluateCellRefsFromExpression(originalCellInfo.ref, (cellRefInfo) => {
    const isRange = cellRefInfo.type === 'rangeStart' || cellRefInfo.type === 'rangeEnd'

    assertOk(isRange, `cell ref expected to be a range. value: "${originalCellInfo.ref}"`)

    const columnIncrement = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.columnNumber - cellRefInfo.parsedRangeStart.columnNumber : 0
    const [newColumnLetter] = getColumnFor(updatedStartCell.letter, columnIncrement)

    const rowIncrement = cellRefInfo.type === 'rangeEnd' ? cellRefInfo.parsedRangeEnd.rowNumber - cellRefInfo.parsedRangeStart.rowNumber : 0
    const newRowNumber = updatedStartCell.rowNumber + rowIncrement

    const newCellRef = generateNewCellRefFrom(cellRefInfo.parsed, {
      columnLetter: newColumnLetter,
      rowNumber: newRowNumber
    })

    return newCellRef
  })

  mergeCellItems.push({ idx: originalCellInfo.idx, ref: newValue })
}

function renderDataItems (doc, dataItems, meta, outputFullDocument = true) {
  const domParser = new DOMParser()

  for (const dataItem of dataItems) {
    const pending = []

    let newItem

    if (meta?.prepareItem != null) {
      newItem = meta.prepareItem(dataItem)

      if (newItem == null) {
        throw new Error('prepareItem should return an item object')
      }
    } else {
      newItem = dataItem
    }

    pending.push({
      containerEl: doc.documentElement,
      type: newItem.type,
      item: newItem
    })

    while (pending.length > 0) {
      const { containerEl, type, parentItem, item } = pending.shift()
      let itemType = type

      if (itemType == null) {
        if (meta?.getDefaultItemType) {
          itemType = meta.getDefaultItemType(parentItem)
        }
      }

      if (itemType == null) {
        throw new Error('Data item .type is not defined')
      }

      let el

      if (itemType === '#raw') {
        const tmpDoc = domParser.parseFromString(`<fragment>${item.value}</fragment>`)

        for (const childNode of Array.from(tmpDoc.documentElement.childNodes)) {
          containerEl.appendChild(doc.importNode(childNode, true))
        }

        continue
      }

      if (itemType === '#text') {
        el = doc.createTextNode(item.value)
      } else if (itemType === '#comment') {
        el = doc.createComment(item.value)
      } else {
        el = doc.createElement(itemType)
      }

      const attributeListsToProcess = []

      if (item.attributes != null) {
        attributeListsToProcess.push({
          origin: 'attributes',
          list: item.attributes
        })
      }

      if (item.customAttributes != null) {
        attributeListsToProcess.push({
          origin: 'customAttributes',
          list: item.customAttributes
        })
      }

      for (const { origin, list } of attributeListsToProcess) {
        for (const [_attrName, _attrValue] of list) {
          let attrName = _attrName
          let attrValue = _attrValue

          if (meta?.processAttribute != null) {
            const attrResult = meta.processAttribute(origin, itemType, attrName, attrValue)

            if (attrResult != null) {
              [attrName, attrValue] = attrResult
            }
          }

          if (attrValue == null) {
            el.removeAttribute(attrName)
          } else {
            el.setAttribute(attrName, attrValue)
          }
        }
      }

      containerEl.appendChild(el)

      if (!item.children || item.children.length === 0) {
        continue
      }

      pending.unshift(...item.children.map((childItem) => {
        const childItemType = childItem.type

        if (childItemType == null) {
          throw new Error('Data child item .type is not defined')
        }

        return {
          containerEl: el,
          type: childItemType,
          parentItem: item,
          item: childItem
        }
      }))
    }
  }

  if (!outputFullDocument) {
    const parts = []

    for (const el of Array.from(doc.documentElement.childNodes)) {
      parts.push(el.toString())
    }

    return parts.join('')
  }

  return doc.toString()
}

function getAttributeFromElementTypeAttributes (elementTypeAttributesMap, itemType, attrNameIdx, attrValueIdx) {
  const elementAttributes = elementTypeAttributesMap.get(itemType)

  if (!elementAttributes) {
    throw new Error(`No attributes found for element type "${itemType}"`)
  }

  const attributeStore = elementAttributes[attrNameIdx]
  const attributeName = attributeStore[0]
  const attributeValue = attributeStore[1][attrValueIdx]

  return [attributeName, attributeValue]
}

function getNewFormula (originalFormula, parsedOriginCellRef, meta) {
  let newFormula
  const result = {}

  if (meta.type === 'normal') {
    result.lazyUsedCells = {}
  }

  if (meta.type !== 'normal' && meta.type !== 'lazy') {
    throw new Error('meta parameter must be either "normal" or "lazy"')
  }

  const {
    originCellIsFromLoop, rowPreviousLoopIncrement, rowCurrentLoopIncrement,
    columnPreviousLoopIncrement, columnCurrentLoopIncrement, trackedCells
  } = meta

  const { newValue } = evaluateCellRefsFromExpression(originalFormula, (cellRefInfo, cellRefPosition) => {
    const originMetadata = { workbookName: parsedOriginCellRef.workbookName, sheetName: parsedOriginCellRef.sheetName }
    const targetMetadata = { workbookName: cellRefInfo.parsed.workbookName, sheetName: cellRefInfo.parsed.sheetName }
    const lazyUsedCellId = `${cellRefInfo.localRef}@${cellRefPosition}`

    if (meta.type === 'lazy') {
      const { lazyUsedCells } = meta
      const shouldEvaluate = lazyUsedCells[lazyUsedCellId] != null

      // reuse already calculated cell refs
      if (!shouldEvaluate) {
        return generateNewCellRefFrom(cellRefInfo.parsed, {
          columnLetter: cellRefInfo.parsed.letter,
          rowNumber: cellRefInfo.parsed.rowNumber
        })
      }
    }

    let isLocalRef = true

    if (
      originMetadata.workbookName !== targetMetadata.workbookName ||
      originMetadata.sheetName !== targetMetadata.sheetName
    ) {
      isLocalRef = false
    }

    let cellRefIsFromLoop = false

    if (isLocalRef && trackedCells.has(cellRefInfo.localRef)) {
      cellRefIsFromLoop = trackedCells.get(cellRefInfo.localRef).currentLoopId != null
    }

    let includeLoopIncrement

    if (meta.type === 'normal') {
      const { includeLoopIncrementResolver } = meta
      includeLoopIncrement = includeLoopIncrementResolver(cellRefIsFromLoop, cellRefInfo)
    } else {
      const { lazyUsedCells } = meta
      const found = lazyUsedCells[lazyUsedCellId]
      includeLoopIncrement = found != null ? found.includeLoopIncrement : false
    }

    let newRowNumber
    let newColumnLetter

    if (!isLocalRef) {
      // cell references to other sheets
      newColumnLetter = cellRefInfo.parsed.letter
      newRowNumber = cellRefInfo.parsed.rowNumber

      if (!cellRefInfo.parsed.lockedRow) {
        newRowNumber += rowCurrentLoopIncrement
      }

      if (!cellRefInfo.parsed.lockedColumn) {
        [newColumnLetter] = getColumnFor(cellRefInfo.parsed.columnNumber, columnCurrentLoopIncrement)
      }
    } else if (
      meta.type === 'normal' &&
      (
        parsedOriginCellRef.rowNumber < cellRefInfo.parsed.rowNumber ||
        parsedOriginCellRef.columnNumber < cellRefInfo.parsed.columnNumber
      )
    ) {
      // if formula has a cell reference that is greater than origin then we
      // mark it as lazy
      result.lazyUsedCells[lazyUsedCellId] = {
        cellRef: cellRefInfo.localRef,
        position: cellRefPosition,
        includeLoopIncrement
      }

      // let the cell as it is
      // (the final row number will be calculated later in other helper)
      newRowNumber = cellRefInfo.parsed.rowNumber
      newColumnLetter = cellRefInfo.parsed.letter
    } else {
      let columnIncrement
      let rowIncrement
      const trackedCell = trackedCells.get(cellRefInfo.localRef)

      if (trackedCell?.count > 0) {
        const { currentCellRef, getCurrentLoopItem } = meta

        const shouldUseFirstForRow = (
          cellRefInfo.parsed.lockedRow ||
          (!originCellIsFromLoop && cellRefIsFromLoop && cellRefInfo.type === 'rangeStart')
        )

        let parsedLastCellRef = shouldUseFirstForRow ? parseCellRef(trackedCell.first) : parseCellRef(trackedCell.last)
        rowIncrement = parsedLastCellRef.rowNumber - cellRefInfo.parsed.rowNumber

        let cellRefLoopItem

        if (cellRefIsFromLoop) {
          cellRefLoopItem = getCurrentLoopItem(trackedCell.currentLoopId)
        }

        if (!cellRefInfo.parsed.lockedColumn && originCellIsFromLoop && cellRefLoopItem?.type === 'vertical') {
          const parsedOriginCurrentCellRef = parseCellRef(currentCellRef)
          parsedLastCellRef = parseCellRef(cellRefLoopItem.trackedCells.get(cellRefInfo.localRef)?.get(parsedOriginCurrentCellRef.letter) ?? currentCellRef)
        } else {
          const shouldUseFirstForColumn = (
            cellRefInfo.parsed.lockedColumn ||
            (!originCellIsFromLoop && cellRefIsFromLoop && cellRefInfo.type === 'rangeStart')
          )

          parsedLastCellRef = shouldUseFirstForColumn ? parseCellRef(trackedCell.first) : parseCellRef(trackedCell.last)
        }

        columnIncrement = parsedLastCellRef.columnNumber - cellRefInfo.parsed.columnNumber
      } else {
        // cell reference points to cell which does not exists as content of the template
        rowIncrement = rowPreviousLoopIncrement

        if (includeLoopIncrement) {
          rowIncrement += rowCurrentLoopIncrement
        }

        columnIncrement = columnPreviousLoopIncrement

        if (includeLoopIncrement) {
          columnIncrement += columnCurrentLoopIncrement
        }
      }

      [newColumnLetter] = getColumnFor(cellRefInfo.parsed.columnNumber, columnIncrement)
      newRowNumber = cellRefInfo.parsed.rowNumber + rowIncrement
    }

    const newCellRef = generateNewCellRefFrom(cellRefInfo.parsed, {
      columnLetter: newColumnLetter,
      rowNumber: newRowNumber
    })

    return newCellRef
  })

  const lazyUsedCellsCount = result.lazyUsedCells != null ? Object.keys(result.lazyUsedCells).length : 0

  if (meta.type === 'normal' && lazyUsedCellsCount > 0) {
    const { lazyFormulas, currentCellRef } = meta
    lazyFormulas.lastSeq = (lazyFormulas.lastSeq ?? 0) + 1
    const lazyFormulaRefId = `$lazyFormulaRef${lazyFormulas.lastSeq}`

    const lazyCellRefs = Object.keys(result.lazyUsedCells).reduce((acu, key) => {
      const lazyUsedCellItem = result.lazyUsedCells[key]

      if (!acu.includes(lazyUsedCellItem.cellRef)) {
        acu.push(lazyUsedCellItem.cellRef)
      }

      return acu
    }, [])

    lazyFormulas.data.set(lazyFormulaRefId, {
      // the formulaCellRef is the origin cell ref but updated to include the changes from additions)
      formulaCellRef: currentCellRef,
      formula: newValue,
      // just placeholder for the key, this is going to be fill at runtime
      //  with the updated formula
      newFormula: null,
      originCellRef: `${parsedOriginCellRef.letter}${parsedOriginCellRef.rowNumber}`,
      parsedOriginCellRef,
      originCellIsFromLoop,
      rowPreviousLoopIncrement,
      rowCurrentLoopIncrement,
      columnPreviousLoopIncrement,
      columnCurrentLoopIncrement,
      // information about the cell refs used in the formula, it contains position
      // in the formula, etc
      usedCells: result.lazyUsedCells,
      // all unique lazy cell refs in the formula
      cellRefs: lazyCellRefs,
      // cell refs that are pending to resolve
      pendingCellRefs: [...lazyCellRefs],
      // this is going to be fill at runtime with a reference to the output of the cell
      // that contains the formula, this reference is going to be used later to resolve
      // the final formula value
      cellOutput: null
    })

    newFormula = lazyFormulaRefId
  } else {
    newFormula = newValue
  }

  result.formula = newFormula

  return result
}

function tryToResolvePendingLazyFormula (lazyFormulaId, cellRef, lazyFormulas, trackedCells, loopItems) {
  const lazyFormulaInfo = lazyFormulas.data.get(lazyFormulaId)

  const matchIdx = lazyFormulaInfo.pendingCellRefs.indexOf(cellRef)

  if (matchIdx === -1) {
    return
  }

  lazyFormulaInfo.pendingCellRefs.splice(matchIdx, 1)

  // the formula is not yet ready to be resolved, we need to wait until its last
  // cell ref is called
  if (lazyFormulaInfo.pendingCellRefs.length > 0) {
    return
  }

  const {
    formula,
    formulaCellRef,
    parsedOriginCellRef,
    originCellIsFromLoop,
    rowPreviousLoopIncrement,
    rowCurrentLoopIncrement,
    columnPreviousLoopIncrement,
    columnCurrentLoopIncrement,
    usedCells
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
      return getCurrentLoopItem(currentLoopId, loopItems)
    },
    lazyUsedCells: usedCells,
    currentCellRef: formulaCellRef
  })

  // update the cell output with the new formula
  lazyFormulaInfo.cellOutput.value = lazyFormulaInfo.cellOutput.value.getFormula(
    newFormula,
    lazyFormulaInfo.cellOutput.value.attributes
  )

  for (const cellRef of lazyFormulaInfo.cellRefs) {
    const originalLazyFormulaIds = lazyFormulas.pending.cellsToFormulaIds.get(cellRef)
    const matchIdx = originalLazyFormulaIds.indexOf(lazyFormulaId)

    if (matchIdx !== -1) {
      originalLazyFormulaIds.splice(matchIdx, 1)
    }

    if (originalLazyFormulaIds.length === 0) {
      lazyFormulas.pending.cellsToFormulaIds.delete(cellRef)
    }
  }

  lazyFormulas.data.delete(lazyFormulaId)
}

module.exports.assertOk = assertOk
module.exports.getIncrementWithLoop = getIncrementWithLoop
module.exports.getParentLoopItemByHierarchy = getParentLoopItemByHierarchy
module.exports.getCurrentLoopItem = getCurrentLoopItem
module.exports.updateDimension = updateDimension
module.exports.updateMergeCells = updateMergeCells
module.exports.renderDataItems = renderDataItems
module.exports.getAttributeFromElementTypeAttributes = getAttributeFromElementTypeAttributes
module.exports.getNewFormula = getNewFormula
module.exports.tryToResolvePendingLazyFormula = tryToResolvePendingLazyFormula
