const { assertOk } = require('../../generationUtils')
const { getColumnFor, generateNewCellRefFrom, evaluateCellRefsFromExpression } = require('../../cellUtils')

module.exports.createFormulasRuntime = createFormulasRuntime

// keeps the state needed to update the formulas, it works in two phases:
// - while the data template is rendered we only record: the renders of the cells referenced by
//   formulas (or its removal), and the renders of the formula cells (copies)
// - at the end (resolve) we compute the text of all the copies of the formulas
// it receives the formulas of the sheet
function createFormulasRuntime (formulas) {
  const state = {
    formulas,
    // the renders of the refs of formulas (formula id -> ref index -> place), the place keeps:
    // - firstRender: the first render of the cell (used for the locked rows/columns)
    // - byScope: scope key -> { first, last }, the first and last render of the cell in the scope
    places: new Map(),
    // the renders of formula cells { formula, coord, path, cellOutput }
    copies: [],
    // the coordinate of the first render of each formula cell, used to know how much the
    // formula was copied (loops)
    firstCoords: new Map(),
    // the local refs of formulas by the cell of the template (cell ref -> [{ formula, refIdx }]),
    // used to record the renders of the cells
    refsByCell: formulas.values().reduce((refsByCell, formula) => {
      for (const [refIdx, cellRefPart] of formula.refParts.entries()) {
        if (!cellRefPart.isLocalRef) {
          continue
        }

        if (!refsByCell.has(cellRefPart.localRef)) {
          refsByCell.set(cellRefPart.localRef, [])
        }

        refsByCell.get(cellRefPart.localRef).push({ formula, refIdx })
      }

      return refsByCell
    }, new Map()),
    // the local refs of formulas by the row of the template (row -> [{ formula, refIdx }]),
    // used to find the refs to the cells removed by false conditions
    refsByRow: formulas.values().reduce((refsByRow, formula) => {
      for (const [refIdx, cellRefPart] of formula.refParts.entries()) {
        if (!cellRefPart.isLocalRef) {
          continue
        }

        const rowNumber = cellRefPart.parsed.rowNumber

        if (!refsByRow.has(rowNumber)) {
          refsByRow.set(rowNumber, [])
        }

        refsByRow.get(rowNumber).push({ formula, refIdx })
      }

      return refsByRow
    }, new Map())
  }

  return {
    // records the coordinate of a render of a cell of the template (originalCellRef)
    recordCell (originalCellRef, { coord, path }) {
      const refs = state.refsByCell.get(originalCellRef)

      if (refs == null) {
        return
      }

      for (const { formula, refIdx } of refs) {
        record(state, formula, refIdx, path, { ...coord })
      }
    },
    // records a render of a formula cell, the text of the formula is set at the end (resolve)
    // in the cellOutput of the returned copy
    addCopy (formulaId, { coord, path }) {
      const formula = getFormula(state, formulaId)

      if (!state.firstCoords.has(formula.id)) {
        state.firstCoords.set(formula.id, { ...coord })
      }

      const copy = { formula, coord: { ...coord }, path, cellOutput: null }

      state.copies.push(copy)

      return copy
    },
    // records that an area of the template was not rendered (removed),
    // the area is either:
    // - { type: 'rows', originalStart, originalEnd, previousNumber }, rows of the template
    // - { type: 'cells', originalRow, row, originalStart, originalEnd, previousNumber }, columns of
    //   a row of the template (row is the number generated for the row)
    // previousNumber is the number (row or column) generated for the content just before the area
    recordRemoved (area, { path }) {
      const removed = { ...area }

      for (const { formula, refIdx } of getRefsInArea(state, area)) {
        record(state, formula, refIdx, path, { removed })
      }
    },
    // computes the text of all the copies of formulas, it should be called
    // after all the cells were rendered
    resolve () {
      for (const copy of state.copies) {
        const { formula } = copy
        const firstCoord = state.firstCoords.get(formula.id)

        // how much the formula was copied (the distance from its first render), the refs to other
        // sheets only change when the formula is copied
        const copyOffset = {
          row: copy.coord.row - firstCoord.row,
          column: copy.coord.column - firstCoord.column
        }

        const newRefs = formula.refParts.map((cellRefPart, refIdx) => (
          cellRefPart.isLocalRef
            ? getNewCellRef(state, formula, refIdx, copy.path)
            : getNewCellRefForOtherSheet(cellRefPart, copyOffset)
        ))

        assertOk(copy.cellOutput != null, `formula ${formula.id} copy does not have cell output to update`)

        copy.cellOutput.value = copy.cellOutput.value.getFormula(
          getFormulaText(formula, newRefs),
          copy.cellOutput.value.attributes
        )
      }

      state.copies = []
    }
  }
}

function getFormula (state, formulaId) {
  const formula = state.formulas.get(formulaId)

  assertOk(formula != null, `formula ${formulaId} not found`)

  return formula
}

function getRefsInArea (state, area) {
  const refsInArea = []

  if (area.type === 'rows') {
    for (let rowNumber = area.originalStart; rowNumber <= area.originalEnd; rowNumber++) {
      refsInArea.push(...(state.refsByRow.get(rowNumber) ?? []))
    }
  } else {
    for (const ref of state.refsByRow.get(area.originalRow) ?? []) {
      const { columnNumber } = ref.formula.refParts[ref.refIdx].parsed

      if (columnNumber >= area.originalStart && columnNumber <= area.originalEnd) {
        refsInArea.push(ref)
      }
    }
  }

  return refsInArea
}

// the scope groups the renders of a ref that belong to the same copies of the formula. the path is
// the list of loop iterations of the render ("/<loop hierarchyId>:<index>/..."), the scope key is the
// path cut after the iteration of the scope loop of the ref (the innermost loop that contains both the
// ref and the formula cell), so a copy of the formula and the renders of its ref in the same iteration
// of the scope loop share the key. returns null when the scope loop is not in the path
function getScopeKey (path, scopeLoopId) {
  if (scopeLoopId == null) {
    return ''
  }

  const start = path?.indexOf(`/${scopeLoopId}:`) ?? -1

  if (start === -1) {
    return null
  }

  const end = path.indexOf('/', start + 1)

  return end === -1 ? path : path.slice(0, end)
}

function record (state, formula, refIdx, path, entry) {
  const scopeKey = getScopeKey(path, formula.refParts[refIdx].scopeLoopId)

  // the render is outside of the scope loop, this happens when a condition that contains the scope loop
  // is removed, the formula cell is inside the scope loop so it is removed too, there is no copy to update
  if (scopeKey == null) {
    return
  }

  let placesOfFormula = state.places.get(formula.id)

  if (placesOfFormula == null) {
    placesOfFormula = new Map()
    state.places.set(formula.id, placesOfFormula)
  }

  let place = placesOfFormula.get(refIdx)

  if (place == null) {
    place = { firstRender: null, byScope: new Map() }
    placesOfFormula.set(refIdx, place)
  }

  // the locked rows/columns ($) should point to a render, not to a removal
  if (place.firstRender == null && entry.removed == null) {
    place.firstRender = entry
  }

  const scope = place.byScope.get(scopeKey)

  if (scope == null) {
    place.byScope.set(scopeKey, { first: entry, last: entry })
  } else {
    scope.last = entry
  }
}

// the render of the ref used by the copy of the formula,
// the start of a range uses the first render in the scope,
// the rest of refs use the last one
function getEntry (state, formula, refIdx, path) {
  const cellRefPart = formula.refParts[refIdx]
  const scopeKey = getScopeKey(path, cellRefPart.scopeLoopId)
  const scope = scopeKey != null ? state.places.get(formula.id)?.get(refIdx)?.byScope.get(scopeKey) : null

  // the cells are always either rendered or removed (a loop with no items renders its cells once)
  assertOk(scope != null, `formula ${formula.id} ref ${cellRefPart.ref} was not rendered or removed`)

  return cellRefPart.type === 'rangeStart' ? scope.first : scope.last
}

function getNewCellRef (state, formula, refIdx, path) {
  const cellRefPart = formula.refParts[refIdx]
  const entry = getEntry(state, formula, refIdx, path)

  if (entry.removed != null) {
    return getNewCellRefForRemoved(state, formula, refIdx, path, entry.removed)
  }

  const place = state.places.get(formula.id).get(refIdx)

  // the locked rows/columns ($) point to the first render of the cell
  const rowNumber = cellRefPart.parsed.lockedRow ? place.firstRender.row : entry.row
  const columnNumber = cellRefPart.parsed.lockedColumn ? place.firstRender.column : entry.column

  return generateNewCellRefFrom(cellRefPart.parsed, {
    columnLetter: getColumnFor(columnNumber)[0],
    rowNumber
  })
}

// the new ref of a cell that was removed, the ref is updated like Excel does
// when deleting cells:
// - the start of a range moves to the first cell after the removed area
// - the end of a range moves to the last cell before the removed area
// - a single ref, or a range with no cell left between its ends, becomes #REF!
function getNewCellRefForRemoved (state, formula, refIdx, path, removed) {
  const cellRefPart = formula.refParts[refIdx]

  if (cellRefPart.type === 'standalone') {
    return '#REF!'
  }

  const isStart = cellRefPart.type === 'rangeStart'
  const otherEnd = getEntry(state, formula, isStart ? refIdx + 1 : refIdx - 1, path)

  // when both ends were removed in the same direction (rows or cells) we can check if there
  // is something left between them
  if (otherEnd.removed != null && otherEnd.removed.type === removed.type) {
    const startRemoved = isStart ? removed : otherEnd.removed
    const endRemoved = isStart ? otherEnd.removed : removed

    if (startRemoved.previousNumber + 1 > endRemoved.previousNumber) {
      return '#REF!'
    }
  }

  const number = isStart ? removed.previousNumber + 1 : removed.previousNumber
  let rowNumber
  let columnNumber

  if (removed.type === 'rows') {
    rowNumber = number
    columnNumber = cellRefPart.parsed.columnNumber
  } else {
    rowNumber = removed.row
    columnNumber = number
  }

  return generateNewCellRefFrom(cellRefPart.parsed, {
    columnLetter: getColumnFor(columnNumber)[0],
    rowNumber
  })
}

function getNewCellRefForOtherSheet (cellRefPart, copyOffset) {
  let newRowNumber = cellRefPart.parsed.rowNumber
  let newColumnLetter = cellRefPart.parsed.letter

  if (!cellRefPart.parsed.lockedRow) {
    newRowNumber += copyOffset.row
  }

  if (!cellRefPart.parsed.lockedColumn) {
    [newColumnLetter] = getColumnFor(cellRefPart.parsed.columnNumber, copyOffset.column)
  }

  return generateNewCellRefFrom(cellRefPart.parsed, {
    columnLetter: newColumnLetter,
    rowNumber: newRowNumber
  })
}

// replaces the refs in the formula text with the new refs (by ref index), the refs are evaluated
// in the same order than formula refParts
function getFormulaText (formula, newRefs) {
  const { newValue } = evaluateCellRefsFromExpression(formula.value, (_, positionIdx) => newRefs[positionIdx])
  return newValue
}
