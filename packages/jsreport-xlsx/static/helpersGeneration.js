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

    newData.meta = {
      autofit: {
        cols: {},
        enabledFor: optionsToUse.hash.autofit != null ? optionsToUse.hash.autofit.split(',') : []
      },
      mergeCells: [],
      formulas: [],
      sharedFormulas: [],
      updatedOriginalCells: {},
      lastCellRef: null
    }
    newData.loopItems = []
    return optionsToUse.fn(this, { data: newData })
  }

  if (
    arguments.length === 2 &&
    type === 'loop'
  ) {
    const start = optionsToUse.hash.start
    const columnStart = optionsToUse.hash.columnStart
    const end = optionsToUse.hash.end
    const columnEnd = optionsToUse.hash.columnEnd
    const newData = Handlebars.createFrame(optionsToUse.data)

    if (start == null) {
      throw new Error('xlsxSData type="loop" helper start arg is required')
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

    newData.loopItems.push({
      type: end == null ? 'row' : 'block',
      start,
      columnStart,
      end,
      columnEnd,
      length: targetData.length
    })

    return Handlebars.helpers.each(targetData, { ...optionsToUse, data: newData })
  }

  const parseCellRef = require('parseCellRef')

  const getMatchedLoopItems = (rowNumber, loopItems, filterEmpty = true) => {
    return loopItems.filter((item) => {
      let result = rowNumber >= item.start

      if (filterEmpty) {
        result = result && item.length > 0
      }

      return result
    })
  }

  const getCurrentLoopItem = (matchedLoopItems, byTarget) => {
    if (byTarget == null || byTarget.rowNumber == null) {
      throw new Error('getCurrentLoopItem byTarget arg is invalid')
    }

    return matchedLoopItems.find((item) => {
      let match = false
      let byRowsMatch = false

      if (item.type === 'block') {
        byRowsMatch = (
          byTarget.rowNumber >= item.start &&
          byTarget.rowNumber <= item.end
        )
      } else {
        byRowsMatch = item.start === byTarget.rowNumber
      }

      if (byTarget.columnNumber == null) {
        return byRowsMatch
      }

      if (byRowsMatch) {
        let byColumnsMatch = false

        if (item.type === 'block') {
          if (item.start === byTarget.rowNumber) {
            byColumnsMatch = byTarget.columnNumber >= item.columnStart
          } else if (item.end === byTarget.rowNumber) {
            byColumnsMatch = byTarget.columnNumber <= item.columnEnd
          } else {
            byColumnsMatch = true
          }
        } else {
          byColumnsMatch = (
            byTarget.columnNumber >= item.columnStart &&
            byTarget.columnNumber <= item.columnEnd
          )
        }

        match = byColumnsMatch
      }

      return match
    })
  }

  const getPreviousLoopItems = (matchedLoopItems, byTarget) => {
    if (byTarget == null || byTarget.rowNumber == null) {
      throw new Error('getCurrentLoopItem byTarget arg is invalid')
    }

    return matchedLoopItems.filter((item) => {
      let match = false

      const limit = item.type === 'block' ? item.end : item.start

      if (byTarget.rowNumber === limit) {
        if (byTarget.columnNumber == null) {
          match = false
        } else {
          // for row loops we assume there is no previous loop item even if cell
          // colum comes after column end of end of loop
          // this is because in that case that cell will anyway keep on its original place
          match = item.type === 'block' ? byTarget.columnNumber > item.columnEnd : false
        }
      } else {
        match = byTarget.rowNumber > limit
      }

      return match
    })
  }

  if (
    arguments.length === 1 &&
    type === 'row'
  ) {
    const originalRowNumber = optionsToUse.hash.originalRowNumber
    // a default loop index will exists for example for out of loop items
    const defaultLoopIndex = optionsToUse.hash.loopIndex

    if (originalRowNumber == null) {
      throw new Error('xlsxSData type="row" helper originalRowNumber arg is required')
    }

    const newData = Handlebars.createFrame(optionsToUse.data)
    const matchedLoopItems = getMatchedLoopItems(originalRowNumber, newData.loopItems)

    if (matchedLoopItems.length === 0) {
      newData.rowNumber = originalRowNumber
    } else {
      let increment = 0

      const currentLoopItem = getCurrentLoopItem(matchedLoopItems, {
        rowNumber: originalRowNumber
      })

      if (currentLoopItem) {
        const previousLoopItems = getPreviousLoopItems(matchedLoopItems, {
          rowNumber: originalRowNumber
        })

        let totalPrev = 0

        if (previousLoopItems.length > 0) {
          const previousRowMatchedLoopItems = []

          totalPrev = previousLoopItems.reduce((acu, item) => {
            if (item.type === 'block') {
              return acu + (((item.end - item.start) + 1) * (item.length - 1))
            } else {
              previousRowMatchedLoopItems.push(item)
            }

            return acu + item.length
          }, 0)

          totalPrev += previousRowMatchedLoopItems.length > 0 ? (previousRowMatchedLoopItems.length * -1) : 0
        }

        let loopIndex = optionsToUse.data.index != null ? optionsToUse.data.index : defaultLoopIndex

        if (Array.isArray(loopIndex)) {
          loopIndex = loopIndex.length - 1
        }

        if (optionsToUse.data.index == null && loopIndex != null) {
          newData.index = loopIndex
        }

        if (currentLoopItem.type === 'block') {
          increment = totalPrev + (((currentLoopItem.end - currentLoopItem.start) + 1) * loopIndex)
        } else {
          increment = totalPrev + loopIndex
        }
      } else {
        const rowMatchedLoopItems = []

        increment = matchedLoopItems.reduce((acu, item) => {
          if (item.type === 'block') {
            return acu + (((item.end - item.start) + 1) * (item.length - 1))
          } else {
            rowMatchedLoopItems.push(item)
          }

          return acu + item.length
        }, 0)

        increment += rowMatchedLoopItems.length > 0 ? (rowMatchedLoopItems.length * -1) : 0
      }

      newData.rowNumber = originalRowNumber + increment
    }

    newData.columnLetter = null
    newData.currentCellRef = null

    return optionsToUse.fn(this, { data: newData })
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
    const originalCellRef = optionsToUse.hash.originalCellRef

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
    if (optionsToUse.data.index != null) {
      shouldUpdateOriginalCell = false
    } else {
      shouldUpdateOriginalCell = originalCellRef !== updatedCellRef && optionsToUse.data.meta.updatedOriginalCells[originalCellRef] == null
    }

    if (shouldUpdateOriginalCell) {
      // keeping a registry of the original cells that were updated
      optionsToUse.data.meta.updatedOriginalCells[originalCellRef] = updatedCellRef
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

    return result
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

  const getNewCellRef = (cellRefInput, loopIndex, mode = 'standalone', context) => {
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
      // matched loop items for the referenced row number
      const matchedLoopItems = getMatchedLoopItems(parsedCellRef.rowNumber, loopItems)

      if (matchedLoopItems.length === 0) {
        newCellRef = cellRef
      } else {
        currentLoopItem = getCurrentLoopItem(matchedLoopItems, {
          rowNumber: parsedCellRef.rowNumber,
          columnNumber: parsedCellRef.columnNumber
        })

        const originIsLoopItem = parsedOriginCellRef == null
          ? false
          : getCurrentLoopItem(matchedLoopItems, {
            rowNumber: parsedOriginCellRef.rowNumber,
            columnNumber: parsedOriginCellRef.columnNumber
          }) != null

        const getAfterIncrement = (parsedC, all = false) => {
          let filteredItems

          if (all) {
            filteredItems = matchedLoopItems
          } else {
            const previousLoopItems = getPreviousLoopItems(matchedLoopItems, {
              rowNumber: parsedC.rowNumber,
              columnNumber: parsedC.columnNumber
            })

            filteredItems = previousLoopItems
          }

          const rowMatchedLoopItems = []

          let increment = filteredItems.reduce((acu, item) => {
            if (item.type === 'block') {
              return acu + (((item.end - item.start) + 1) * (item.length - 1))
            } else {
              rowMatchedLoopItems.push(item)
            }

            return acu + item.length
          }, 0)

          increment += rowMatchedLoopItems.length > 0 ? (rowMatchedLoopItems.length * -1) : 0

          return `${parsedC.lockedColumn ? '$' : ''}${parsedC.letter}${parsedC.lockedRow ? '$' : ''}${parsedC.rowNumber + increment}`
        }

        if (currentLoopItem) {
          let includeAll = false

          if (
            (type === 'newCellRef' && mode === 'rangeEnd') ||
            (type === 'formulas' &&
            originCellRef != null &&
            !originIsLoopItem &&
            mode === 'rangeEnd')
          ) {
            includeAll = true
          }

          newCellRef = getAfterIncrement(parsedCellRef, includeAll)
        } else {
          newCellRef = getAfterIncrement(parsedCellRef)
        }
      }
    }

    if (loopIndex != null) {
      const parsedNewCellRef = parseCellRef(newCellRef)
      let newRowNumber = parsedNewCellRef.rowNumber

      // when in loop don't increase the row number for locked row references
      if (!parsedNewCellRef.lockedRow) {
        if (currentLoopItem && currentLoopItem.type === 'block') {
          newRowNumber += (((currentLoopItem.end - currentLoopItem.start) + 1) * loopIndex)
        } else {
          newRowNumber += loopIndex
        }
      }

      newCellRef = `${parsedNewCellRef.lockedColumn ? '$' : ''}${parsedNewCellRef.letter}${parsedNewCellRef.lockedRow ? '$' : ''}${newRowNumber}`
    }

    return newCellRef
  }

  if (
    arguments.length === 1 &&
    (type === 'formulaIndex' || type === 'sharedFormulaIndex')
  ) {
    if (type === 'sharedFormulaIndex') {
      return optionsToUse.data.meta.sharedFormulas.length
    }

    return optionsToUse.data.meta.formulas.length
  }

  if (
    arguments.length === 1 &&
    (type === 'mergeCell' || type === 'formula')
  ) {
    const fromLoop = optionsToUse.hash.fromLoop === true && Object.prototype.hasOwnProperty.call(optionsToUse.data, 'index')

    if (type === 'mergeCell') {
      const originalCellRefRange = optionsToUse.hash.originalCellRefRange

      if (originalCellRefRange == null) {
        throw new Error('xlsxSData type="mergeCell" helper originalCellRefRange arg is required')
      }

      const mergeCell = {
        value: originalCellRefRange
      }

      if (fromLoop) {
        mergeCell.loopIndex = optionsToUse.data.index
      }

      optionsToUse.data.meta.mergeCells.push(mergeCell)

      return ''
    } else if (type === 'formula') {
      const originalCellRef = optionsToUse.hash.originalCellRef
      const originalFormula = optionsToUse.hash.originalFormula
      const originalSharedRefRange = optionsToUse.hash.originalSharedRefRange

      if (originalCellRef == null) {
        throw new Error('xlsxSData type="formula" helper originalCellRef arg is required')
      }

      if (originalFormula == null) {
        throw new Error('xlsxSData type="formula" helper originalFormula arg is required')
      }

      const formula = {
        cellRef: originalCellRef,
        value: originalFormula
      }

      if (fromLoop) {
        formula.loopIndex = optionsToUse.data.index
      }

      optionsToUse.data.meta.formulas.push(formula)

      if (originalSharedRefRange != null) {
        const sharedFormula = { ...formula }
        sharedFormula.value = originalSharedRefRange
        optionsToUse.data.meta.sharedFormulas.push(sharedFormula)
      }

      return ''
    }
  }

  if (
    arguments.length === 1 &&
    (type === 'newCellRef' || type === 'mergeCells' || type === 'formulas' || type === 'sharedFormulas')
  ) {
    const updatedOriginalCells = optionsToUse.data.meta.updatedOriginalCells
    const loopItems = optionsToUse.data.loopItems
    let targetItems = []
    const updated = []

    if (type === 'newCellRef') {
      targetItems = [{ value: optionsToUse.hash.originalCellRef }]
    } else if (type === 'mergeCells') {
      targetItems = optionsToUse.data.meta.mergeCells
    } else if (type === 'sharedFormulas') {
      targetItems = optionsToUse.data.meta.sharedFormulas
    } else {
      targetItems = optionsToUse.data.meta.formulas
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
          const newStartingCellRef = getNewCellRef(type === 'formulas' ? [targetItem.cellRef, startingCellRef] : startingCellRef, targetItem.loopIndex, 'rangeStart', ctx)
          const newEndingCellRef = getNewCellRef(type === 'formulas' ? [targetItem.cellRef, endingCellRef] : endingCellRef, targetItem.loopIndex, 'rangeEnd', ctx)

          return `${newStartingCellRef}:${newEndingCellRef}`
        } else {
          newCellRef = getNewCellRef(type === 'formulas' ? [targetItem.cellRef, endingCellRef] : endingCellRef, targetItem.loopIndex, 'standalone', ctx)
        }

        return newCellRef
      })

      if (type === 'newCellRef') {
        updated.push(newValue)
      } else if (type === 'mergeCells') {
        updated.push(`<mergeCell ref="${newValue}" />`)
      } else {
        updated.push(`<f>${newValue}</f>`)
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

  throw new Error('invalid usage of xlsxSData helper')
}
