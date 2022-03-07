/* eslint no-unused-vars: 0 */

function xlsxSData (data, options) {
  const Handlebars = require('handlebars')
  const optionsToUse = options == null ? data : options
  const type = optionsToUse.hash.type

  if (type == null) {
    throw new Error('xlsxSData helper type arg is required')
  }

  if (
    arguments.length === 1 &&
    type === 'root'
  ) {
    const newData = Handlebars.createFrame({})
    newData.meta = {
      mergeCells: [],
      formulas: [],
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
      start,
      length: targetData.length
    })

    return Handlebars.helpers.each(targetData, { ...optionsToUse, data: newData })
  }

  const parseCellRef = (cellRef) => {
    const cellRefRegexp = /^(\$?[A-Z]+)(\$?\d+)$/
    const matches = cellRef.match(cellRefRegexp)

    if (matches == null || matches[1] == null) {
      throw new Error(`"${cellRef}" is not a valid cell reference`)
    }

    const lockedColumn = matches[1].startsWith('$')
    const lockedRow = matches[2].startsWith('$')
    const letter = lockedColumn ? matches[1].slice(1) : matches[1]

    return {
      letter,
      lockedColumn,
      lockedRow,
      rowNumber: parseInt(lockedRow ? matches[2].slice(1) : matches[2], 10)
    }
  }

  const getMatchedLoopItems = (rowNumber, loopItems, filterEmpty = true) => {
    return loopItems.filter((item) => {
      let result = rowNumber >= item.start

      if (filterEmpty) {
        result = result && item.length > 0
      }

      return result
    })
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
    const matchedLoopItems = getMatchedLoopItems(originalRowNumber, newData.loopItems)

    if (matchedLoopItems.length === 0) {
      newData.rowNumber = originalRowNumber
    } else {
      let increment = 0

      const isLoopItem = matchedLoopItems.find((item) => item.start === originalRowNumber) != null

      if (isLoopItem) {
        const previousMatches = matchedLoopItems.filter((item) => {
          return item.start < originalRowNumber
        })

        let totalPrev = 0

        if (previousMatches.length > 0) {
          totalPrev = previousMatches.reduce((acu, item) => {
            return acu + item.length
          }, 0)

          totalPrev += (previousMatches.length * -1)
        }

        increment = totalPrev + optionsToUse.data.index
      } else {
        increment = matchedLoopItems.reduce((acu, item) => {
          return acu + item.length
        }, 0)

        increment += (matchedLoopItems.length * -1)
      }

      newData.rowNumber = originalRowNumber + increment
    }

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
    optionsToUse.data.meta.lastCellRef = updatedCellRef

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

    return optionsToUse.fn(this, { data: newData })
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
    } else if (typeof cellValue === 'boolean') {
      cellType = 'b'
    } else if (typeof cellValue === 'number') {
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

    if (newCellRef == null) {
      // if not found on original cells then do a check if we find
      // matched loop items for the referenced row number
      const matchedLoopItems = getMatchedLoopItems(parsedCellRef.rowNumber, loopItems)

      if (matchedLoopItems.length === 0) {
        newCellRef = cellRef
      } else {
        const isLoopItem = matchedLoopItems.find((item) => item.start === parsedCellRef.rowNumber) != null
        const originIsLoopItem = parsedOriginCellRef == null ? false : matchedLoopItems.find((item) => item.start === parsedOriginCellRef.rowNumber) != null

        const getAfterIncrement = (parsedC, all = false) => {
          let filteredItems

          if (all) {
            filteredItems = matchedLoopItems
          } else {
            filteredItems = matchedLoopItems.filter((item) => item.start < parsedCellRef.rowNumber)
          }

          let increment = filteredItems.reduce((acu, item) => {
            return acu + item.length
          }, 0)

          increment += (filteredItems.length * -1)

          return `${parsedC.lockedColumn ? '$' : ''}${parsedC.letter}${parsedC.lockedRow ? '$' : ''}${parsedC.rowNumber + increment}`
        }

        if (isLoopItem) {
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
        newRowNumber += loopIndex
      }

      newCellRef = `${parsedNewCellRef.lockedColumn ? '$' : ''}${parsedNewCellRef.letter}${parsedNewCellRef.lockedRow ? '$' : ''}${newRowNumber}`
    }

    return newCellRef
  }

  if (
    arguments.length === 1 &&
    type === 'formulaIndex'
  ) {
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

      return ''
    }
  }

  if (
    arguments.length === 1 &&
    (type === 'newCellRef' || type === 'mergeCells' || type === 'formulas')
  ) {
    const updatedOriginalCells = optionsToUse.data.meta.updatedOriginalCells
    const loopItems = optionsToUse.data.loopItems
    let targetItems = []
    const updated = []

    if (type === 'newCellRef') {
      targetItems = [{ value: optionsToUse.hash.originalCellRef }]
    } else if (type === 'mergeCells') {
      targetItems = optionsToUse.data.meta.mergeCells
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

  throw new Error('invalid usage of xlsxSData helper')
}
