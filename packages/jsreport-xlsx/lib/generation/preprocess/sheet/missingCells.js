const { parseCellRef, evaluateCellRefsFromExpression } = require('../../../cellUtils')
const { nodeListToArray } = require('../../../utils')

module.exports.addMissingCellDefinitions = addMissingCellDefinitions

// adds the cells (and rows) that are referenced by merged cells or formulas but that do not have a definition
// in the template, the logic of the helpers (new refs of merged cells, coordinates of formula refs) needs
// a helper call for them.
// - the start cells of merged cells are real cells (with the inherited style), Excel writes a cell
//   for the cells of merged cells
// - the cells referenced only by formulas are virtual, it returns them (and the rows created only for them),
//   the helpers run the logic for them (the sequence of refs continues) but they do not produce output
function addMissingCellDefinitions (sheetDoc, sheetDataEl, mergeCellRefs) {
  const colsEl = sheetDoc.getElementsByTagName('cols')[0]
  const colEls = colsEl != null ? nodeListToArray(colsEl.childNodes).filter((el) => el.nodeName === 'col') : []
  const rowEls = nodeListToArray(sheetDataEl.childNodes).filter((el) => el.nodeName === 'row')
  const rowElsByNumber = new Map(rowEls.map((rowEl) => [parseInt(rowEl.getAttribute('r'), 10), rowEl]))

  // cell ref -> true when the cell is virtual (only referenced by formulas)
  const targetCellRefs = new Map()
  const virtualDefinitions = { rows: new Set(), cells: new Set() }

  for (const mergeCellRef of mergeCellRefs) {
    targetCellRefs.set(mergeCellRef.split(':')[0], false)
  }

  for (const rowEl of rowEls) {
    const cellEls = nodeListToArray(rowEl.childNodes).filter((el) => el.nodeName === 'c')

    for (const cellEl of cellEls) {
      const formulaEl = nodeListToArray(cellEl.childNodes).find((el) => el.nodeName === 'f')

      if (formulaEl == null || formulaEl.textContent === '') {
        continue
      }

      const { refParts } = evaluateCellRefsFromExpression(formulaEl.textContent)

      for (const cellRefInfo of refParts) {
        // the refs to other sheets are not part of this sheet
        if (cellRefInfo.parsed.sheetName != null) {
          continue
        }

        if (!targetCellRefs.has(cellRefInfo.localRef)) {
          targetCellRefs.set(cellRefInfo.localRef, true)
        }
      }
    }
  }

  // the rows created for the cells, the row is virtual when all its cells are virtual
  const createdRows = new Map()

  for (const [targetCellRef, isVirtual] of targetCellRefs) {
    const parsedTargetCellRef = parseCellRef(targetCellRef)
    let rowEl = rowElsByNumber.get(parsedTargetCellRef.rowNumber)

    if (rowEl == null) {
      createdRows.set(parsedTargetCellRef.rowNumber, true)
      rowEl = sheetDoc.createElement('row')
      rowEl.setAttribute('r', parsedTargetCellRef.rowNumber.toString())

      // the rows should be in ascending order in sheetData
      const nextRowEl = [...rowElsByNumber.entries()]
        .sort((a, b) => a[0] - b[0])
        .find(([rowNumber]) => rowNumber > parsedTargetCellRef.rowNumber)?.[1]

      if (nextRowEl != null) {
        sheetDataEl.insertBefore(rowEl, nextRowEl)
      } else {
        sheetDataEl.appendChild(rowEl)
      }

      rowElsByNumber.set(parsedTargetCellRef.rowNumber, rowEl)
    }

    const cellEls = nodeListToArray(rowEl.childNodes).filter((el) => el.nodeName === 'c')

    if (cellEls.some((cellEl) => cellEl.getAttribute('r') === targetCellRef)) {
      continue
    }

    if (createdRows.has(parsedTargetCellRef.rowNumber) && !isVirtual) {
      createdRows.set(parsedTargetCellRef.rowNumber, false)
    }

    const newCellEl = sheetDoc.createElement('c')
    newCellEl.setAttribute('r', targetCellRef)

    if (isVirtual) {
      virtualDefinitions.cells.add(targetCellRef)
    }

    // the style that the cell inherits when it does not have a definition in the template,
    // the style of the row has priority (only when the row has custom format), then the style of the column
    let inheritedStyleId

    if (rowEl.getAttribute('customFormat') === '1' && rowEl.hasAttribute('s')) {
      inheritedStyleId = rowEl.getAttribute('s')
    } else {
      const colEl = colEls.find((el) => (
        parseInt(el.getAttribute('min'), 10) <= parsedTargetCellRef.columnNumber &&
        parseInt(el.getAttribute('max'), 10) >= parsedTargetCellRef.columnNumber
      ))

      if (colEl != null && colEl.hasAttribute('style')) {
        inheritedStyleId = colEl.getAttribute('style')
      }
    }

    if (inheritedStyleId != null) {
      newCellEl.setAttribute('s', inheritedStyleId)
    }

    // the cells should be in ascending order in the row
    const nextCellEl = cellEls.find((cellEl) => parseCellRef(cellEl.getAttribute('r')).columnNumber > parsedTargetCellRef.columnNumber)

    if (nextCellEl != null) {
      rowEl.insertBefore(newCellEl, nextCellEl)
    } else {
      rowEl.appendChild(newCellEl)
    }
  }

  for (const [rowNumber, isVirtual] of createdRows) {
    if (isVirtual) {
      virtualDefinitions.rows.add(rowNumber)
    }
  }

  return virtualDefinitions
}
