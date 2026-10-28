const { parseCellRef } = require('../../../cellUtils')

module.exports.addFormula = addFormula
module.exports.addFormulaRefScopes = addFormulaRefScopes

// adds the formula of a static cell of the template to the formulas of the sheet (formula id -> formula),
// each ref of the formula knows if it is a ref to the same sheet (local) or to another sheet.
// returns the id of the formula
function addFormula (formulas, cellRef, parsedCellRef, formula) {
  const formulaEntry = {
    id: `f${formulas.size}`,
    cellRef,
    ...formula
  }

  formulaEntry.refParts = formula.refParts.map((cellRefPart) => {
    const newCellRefPart = { ...cellRefPart }
    let isLocalRef = true

    if (
      parsedCellRef.workbookName !== cellRefPart.parsed.workbookName ||
      parsedCellRef.sheetName !== cellRefPart.parsed.sheetName
    ) {
      isLocalRef = false
    }

    newCellRefPart.isLocalRef = isLocalRef
    return newCellRefPart
  })

  formulas.set(formulaEntry.id, formulaEntry)

  return formulaEntry.id
}

// adds the scope loop to each local ref of the formulas, the innermost loop that contains both the
// ref and the formula cell.
// the renders of the ref and the copies of the formula in the same iteration
// of this loop belong together
function addFormulaRefScopes (formulas, loops) {
  const getLoopsForCell = (cellNumbers) => loops.filter((loop) => isCellInLoop(loop, cellNumbers))

  for (const formula of formulas.values()) {
    const formulaLoops = getLoopsForCell(parseCellRef(formula.cellRef))

    for (const cellRefPart of formula.refParts) {
      if (!cellRefPart.isLocalRef) {
        continue
      }

      // the loops are in the order they were started, so the outer loops are first
      const sharedLoop = getLoopsForCell(cellRefPart.parsed).filter((loop) => formulaLoops.includes(loop)).at(-1)

      cellRefPart.scopeLoopId = sharedLoop?.hierarchyId ?? null
    }
  }
}

function isCellInLoop (loop, cellNumbers) {
  const { start, end } = loop.block

  if (cellNumbers.rowNumber < start.rowNumber || cellNumbers.rowNumber > end.rowNumber) {
    return false
  }

  if (loop.type === 'vertical') {
    return (
      cellNumbers.columnNumber >= start.columnNumber &&
      cellNumbers.columnNumber <= end.columnNumber
    )
  }

  if (cellNumbers.rowNumber === start.rowNumber && cellNumbers.columnNumber < start.columnNumber) {
    return false
  }

  if (cellNumbers.rowNumber === end.rowNumber && cellNumbers.columnNumber > end.columnNumber) {
    return false
  }

  return true
}
