const path = require('path')
const { num2col } = require('xlsx-coordinates')
const { nodeListToArray, isWorksheetFile, isWorksheetRelsFile, parseCellRef } = require('../../utils')
const regexp = /{{#each ([^{}]{0,500})}}/

module.exports = (files) => {
  const workbookPath = 'xl/workbook.xml'
  const workbookDoc = files.find((file) => file.path === workbookPath)?.doc
  const workbookRelsDoc = files.find((file) => file.path === 'xl/_rels/workbook.xml.rels')?.doc
  const sharedStringsDoc = files.find((f) => f.path === 'xl/sharedStrings.xml')?.doc
  const calcChainDoc = files.find((f) => f.path === 'xl/calcChain.xml')?.doc

  const workbookCalcPrEl = workbookDoc.getElementsByTagName('calcPr')[0]

  let stylesInfo = {}
  let workbookSheetsEls = []
  let workbookRelsEls = []
  let sharedStringsEls = []
  let calcChainEls = []

  if (workbookDoc) {
    workbookSheetsEls = nodeListToArray(workbookDoc.getElementsByTagName('sheet'))
  }

  if (workbookRelsDoc != null) {
    workbookRelsEls = nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship'))

    const styleRel = workbookRelsEls.find((el) => el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles')

    if (styleRel != null) {
      const stylePath = path.posix.join(path.posix.dirname(workbookPath), styleRel.getAttribute('Target'))
      const stylesDoc = files.find((file) => file.path === stylePath)?.doc

      if (stylesDoc != null) {
        stylesInfo = {
          doc: stylesDoc
        }
      }
    }
  }

  if (sharedStringsDoc != null) {
    sharedStringsEls = nodeListToArray(sharedStringsDoc.getElementsByTagName('si'))
  }

  if (calcChainDoc != null) {
    calcChainEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    // we store the existing cell ref into other attribute
    // because later the attribute that contains the cell ref
    // is going to be updated
    for (const calcChainEl of calcChainEls) {
      calcChainEl.setAttribute('oldR', calcChainEl.getAttribute('r'))
    }
  }

  if (workbookCalcPrEl != null) {
    // set that this workbook should perform a full
    // recalculation when the workbook is opened
    workbookCalcPrEl.setAttribute('fullCalcOnLoad', '1')
  }

  const sharedStringElsToClean = []

  for (const f of files.filter((f) => isWorksheetFile(f.path))) {
    const sheetFilepath = f.path
    const sheetFilename = path.posix.basename(sheetFilepath)
    const sheetDoc = f.doc
    const sheetDataEl = sheetDoc.getElementsByTagName('sheetData')[0]
    const colsEl = sheetDoc.getElementsByTagName('cols')[0]

    if (sheetDataEl == null) {
      throw new Error(`Could not find sheet data for sheet at ${sheetFilepath}`)
    }

    const sheetInfo = getSheetInfo(sheetFilepath, workbookSheetsEls, workbookRelsEls)

    if (sheetInfo == null) {
      throw new Error(`Could not find sheet info for sheet at ${sheetFilepath}`)
    }

    const sheetRelsDoc = files.find((file) => isWorksheetRelsFile(sheetFilename, file.path))?.doc
    const rowsEls = nodeListToArray(sheetDataEl.getElementsByTagName('row'))

    // looking for comments in the sheet
    const resultAutofitConfigured = findAutofitConfigured(sheetFilepath, sheetDoc, sheetRelsDoc, files)
    const isAutofitConfigured = resultAutofitConfigured.length > 0
    const autoFitColLettersStr = resultAutofitConfigured.map((r) => num2col(r.column)).join(',')

    // wrap the <sheetData> into wrapper so we can store data during helper calls
    processOpeningTag(sheetDoc, sheetDataEl, `{{#xlsxSData type='root'${isAutofitConfigured ? ` autofit="${autoFitColLettersStr}"` : ''}}}`)
    processClosingTag(sheetDoc, sheetDataEl, '{{/xlsxSData}}')

    // add <formulasUpdated> with a helper call so we can process and update
    // all the formulas references at the end of template processing
    const formulasUpdatedEl = sheetDoc.createElement('formulasUpdated')
    const formulasUpdatedItemsEl = sheetDoc.createElement('items')
    formulasUpdatedItemsEl.textContent = "{{xlsxSData type='formulas'}}"
    formulasUpdatedEl.appendChild(formulasUpdatedItemsEl)
    sheetDataEl.appendChild(formulasUpdatedEl)

    const mergeCellsEl = sheetDoc.getElementsByTagName('mergeCells')[0]
    const mergeCellEls = mergeCellsEl == null ? [] : nodeListToArray(mergeCellsEl.getElementsByTagName('mergeCell'))

    if (mergeCellsEl != null) {
      const mergeCellsUpdatedEl = sheetDoc.createElement('mergeCellsUpdated')
      // add <mergeCellsUpdated> with a helper call so we can process and update
      // all the merge cells references at the end of template processing
      const mergeCellsUpdatedItems = sheetDoc.createElement('items')

      mergeCellsUpdatedItems.textContent = '{{xlsxSData type="mergeCells"}}'

      mergeCellsUpdatedEl.appendChild(mergeCellsUpdatedItems)
      sheetDataEl.appendChild(mergeCellsUpdatedEl)
    }

    const dimensionEl = sheetDoc.getElementsByTagName('dimension')[0]

    if (dimensionEl != null && rowsEls.length > 0) {
      // if sheetData has rows we add the dimension tag into the sheetData to be able to update
      // the ref by the handlebars
      const newDimensionEl = sheetDoc.createElement('dimensionUpdated')
      const refsParts = dimensionEl.getAttribute('ref').split(':')

      newDimensionEl.setAttribute('ref', `${refsParts[0]}:{{@meta.lastCellRef}}`)
      sheetDataEl.appendChild(newDimensionEl)
    }

    if (sheetRelsDoc != null) {
      const relationshipEls = nodeListToArray(sheetRelsDoc.getElementsByTagName('Relationship'))
      const tableRelEls = relationshipEls.filter((rel) => rel.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/table')

      if (tableRelEls.length > 0) {
        const newTablesUpdatedEl = sheetDoc.createElement('tablesUpdated')

        for (const tableRelEl of tableRelEls) {
          const newTableUpdatedEl = sheetDoc.createElement('tableUpdated')

          const tablePath = path.posix.join(path.posix.dirname(sheetFilepath), tableRelEl.getAttribute('Target'))

          newTableUpdatedEl.setAttribute('file', tablePath)

          const tableDoc = files.find((file) => file.path === tablePath)?.doc

          if (tableDoc == null) {
            throw new Error(`Could not find table definition info for sheet at ${sheetFilepath}`)
          }

          newTableUpdatedEl.setAttribute('ref', `{{xlsxSData type='newCellRef' originalCellRef='${tableDoc.documentElement.getAttribute('ref')}'}}`)

          const autoFilterEl = tableDoc.getElementsByTagName('autoFilter')[0]

          if (autoFilterEl != null) {
            const newAutoFilterRef = sheetDoc.createElement('autoFilterRef')
            newAutoFilterRef.setAttribute('ref', `{{xlsxSData type='newCellRef' originalCellRef='${autoFilterEl.getAttribute('ref')}'}}`)
            newTableUpdatedEl.appendChild(newAutoFilterRef)
          }

          newTablesUpdatedEl.appendChild(newTableUpdatedEl)
        }

        sheetDataEl.appendChild(newTablesUpdatedEl)
      }
    }

    if (isAutofitConfigured) {
      for (const conf of resultAutofitConfigured) {
        const tEls = nodeListToArray(conf.commentEl.getElementsByTagName('t'))
        let shouldRemoveComment = false

        const tCallEl = tEls.find((tEl) => tEl.textContent.startsWith('{{xlsxColAutofit'))

        if (conf.row === 0 && conf.column === 0 && tCallEl != null) {
          processOpeningTag(sheetDoc, sheetDataEl.firstChild, tCallEl.textContent)
        }

        if (tEls[0].textContent.endsWith(':')) {
          const remainingText = tEls.slice(1).map((el) => el.textContent).join('')
          const expectedRegexp = /^\r?\n?{{xlsxColAutofit( [^}]*)?}}$/
          shouldRemoveComment = expectedRegexp.test(remainingText)
        }

        if (shouldRemoveComment) {
          conf.commentEl.parentNode.removeChild(conf.commentEl)
          conf.shapeEl.parentNode.removeChild(conf.shapeEl)
        }
      }

      const newAutofitEl = sheetDoc.createElement('autofitUpdated')
      newAutofitEl.textContent = '{{xlsxSData type="autofit"}}'
      sheetDataEl.appendChild(newAutofitEl)

      if (colsEl == null) {
        const newColsEl = sheetDoc.createElement('cols')
        newColsEl.textContent = 'placeholder for autofit'
        sheetDataEl.parentNode.insertBefore(newColsEl, sheetDataEl)
      }
    }

    const loopsDetected = []

    const lastRowIdx = rowsEls.length - 1

    for (const [rowIdx, rowEl] of rowsEls.entries()) {
      let originalRowNumber = rowEl.getAttribute('r')
      const isLastRow = rowIdx === lastRowIdx
      const standardCellElsToHandle = []
      const contentDetectCellElsToHandle = []
      const mergeCellElsToHandle = []
      const calcCellElsToHandle = []
      const formulaCellElsToHandle = []

      if (originalRowNumber == null || originalRowNumber === '') {
        throw new Error('Expected row to contain r attribute defined')
      }

      originalRowNumber = parseInt(originalRowNumber, 10)

      // wrap the <row> into wrapper so we can store data during helper calls
      processOpeningTag(sheetDoc, rowEl, `{{#xlsxSData type='row' originalRowNumber=${originalRowNumber}}}`)
      processClosingTag(sheetDoc, rowEl, '{{/xlsxSData}}')

      // update the row number to be based on helper call
      rowEl.setAttribute('r', "{{xlsxSData type='rowNumber'}}")

      const cellsEls = nodeListToArray(rowEl.getElementsByTagName('c'))

      for (const cellEl of cellsEls) {
        const cellRef = cellEl.getAttribute('r')

        cellEl.setAttribute('r', `{{xlsxSData type='cellRef' originalCellRef='${cellRef}'}}`)

        // search if we need to update some calc cell
        const calcCellEl = findCellElInCalcChain(sheetInfo.id, cellRef, calcChainEls)

        if (calcCellEl != null) {
          calcCellElsToHandle.push({
            calcCellEl,
            cellRef,
            cellEl
          })
        }

        // check if the cell starts a merge cell, if yes
        // then queue it to process it later
        const mergeCellEl = mergeCellEls.find((mergeCellEl) => {
          const ref = mergeCellEl.getAttribute('ref')
          return ref.startsWith(`${cellRef}:`)
        })

        if (mergeCellEl != null) {
          mergeCellElsToHandle.push({ ref: mergeCellEl.getAttribute('ref') })
        }

        const currentLoopDetected = loopsDetected[loopsDetected.length - 1]
        const info = getCellInfo(cellEl, sharedStringsEls, sheetFilepath)

        if (
          info != null &&
          (info.type === 'inlineStr' ||
          info.type === 's')
        ) {
          // only do content detection for the cells with handlebars
          if (info.value.includes('{{') && info.value.includes('}}')) {
            contentDetectCellElsToHandle.push(cellEl)
          } else if (isAutofitConfigured) {
            standardCellElsToHandle.push(cellEl)
          }

          if (
            currentLoopDetected != null &&
            info.value.includes('{{/each}}')
          ) {
            currentLoopDetected.end = {
              el: cellEl,
              cellRef,
              info,
              originalRowNumber
            }

            if (currentLoopDetected.end.originalRowNumber === currentLoopDetected.start.originalRowNumber) {
              currentLoopDetected.type = 'row'
            }
          } else if (
            info.value.includes('{{#each') &&
            !info.value.includes('{{/each}}')
          ) {
            loopsDetected.push({
              // TODO: change this to "block" when we are to reveal the block loop support
              type: 'row',
              start: {
                el: cellEl,
                cellRef,
                info,
                originalRowNumber
              }
            })
          }
        } else if (
          info != null &&
          info.type === 'str'
        ) {
          // if cell was error but detected as formula
          // we updated to formula
          if (cellEl.getAttribute('t') === 'e') {
            cellEl.setAttribute('t', info.type)
          }

          formulaCellElsToHandle.push({
            cellRef,
            cellEl
          })
        }
      }

      const rowLoops = loopsDetected.filter((l) => l.type === 'row' && l.start.originalRowNumber === originalRowNumber)
      const invalidRowLoop = rowLoops.find((l) => l.end == null)

      if (invalidRowLoop != null) {
        throw new Error(`Unable to find end of loop (#each) in ${f.path}. {{/each}} is missing`)
      }

      for (const currentRowLoopDetected of rowLoops) {
        let currentCell = currentRowLoopDetected.start.el

        // we should unset the cells that are using shared strings
        while (currentCell != null) {
          const currentCellInfo = getCellInfo(currentCell, sharedStringsEls, sheetFilepath)

          if (currentCellInfo != null) {
            if (currentCell === currentRowLoopDetected.start.el) {
              if (currentCellInfo.type === 's') {
                sharedStringElsToClean.push(currentCellInfo.valueEl)
              } else {
                currentCellInfo.valueEl.textContent = currentCellInfo.valueEl.textContent.replace(regexp, '')
              }
            }

            if (currentCell === currentRowLoopDetected.end.el) {
              if (currentCellInfo.type === 's') {
                sharedStringElsToClean.push(currentCellInfo.valueEl)
              } else {
                currentCellInfo.valueEl.textContent = currentCellInfo.valueEl.textContent.replace('{{/each}}', '')
              }
            }
          }

          if (currentCell === currentRowLoopDetected.end.el) {
            currentCell = null
          } else {
            currentCell = currentCell.nextSibling
          }
        }

        const rowEl = currentRowLoopDetected.start.el.parentNode
        const loopHelperCall = currentRowLoopDetected.start.info.value.match(regexp)[0]

        if (currentRowLoopDetected.start.el.previousSibling != null) {
          // we include a if condition to preserve the cells that are before the each
          processOpeningTag(sheetDoc, cellsEls[0], '{{#if @first}}')
          processClosingTag(sheetDoc, currentRowLoopDetected.start.el.previousSibling, '{{/if}}')
        }

        if (currentRowLoopDetected.end.el.nextSibling != null) {
          // we include a if condition to preserve the cells that are after the each
          processOpeningTag(sheetDoc, currentRowLoopDetected.end.el.nextSibling, '{{#if @first}}')
          processClosingTag(sheetDoc, cellsEls[cellsEls.length - 1], '{{/if}}')
        }

        // we want to put the loop wrapper around the row wrapper
        processOpeningTag(sheetDoc, rowEl.previousSibling, loopHelperCall.replace(regexp, (match, valueInsideEachCall) => {
          return `{{#xlsxSData ${valueInsideEachCall} type='loop' start=${originalRowNumber} }}`
        }))

        // we want to put the loop wrapper around the row wrapper
        processClosingTag(sheetDoc, rowEl.nextSibling, '{{/xlsxSData}}')
      }

      const blockLoops = loopsDetected.filter((l) => l.type === 'block' && l.end?.originalRowNumber === originalRowNumber)

      if (isLastRow) {
        const invalidBlockLoop = blockLoops.find((l) => l.end == null)

        if (invalidBlockLoop) {
          throw new Error(`Unable to find end of block loop (#each) in ${f.path}. {{/each}} is missing`)
        }
      }

      for (const currentBlockLoopDetected of blockLoops) {
        // we should unset the cells that are using shared strings
        // TODO: add implementation here

        // TODO: add condition to render only on the left of block starting row

        // TODO: add condition to render only on the right of block ending row

        const startingRowEl = currentBlockLoopDetected.start.el.parentNode
        const endingRowEl = currentBlockLoopDetected.end.el.parentNode
        const loopHelperCall = currentBlockLoopDetected.start.info.value.match(regexp)[0]

        // we want to put the loop wrapper around the start row wrapper
        processOpeningTag(sheetDoc, startingRowEl.previousSibling, loopHelperCall.replace(regexp, (match, valueInsideEachCall) => {
          return `{{#xlsxSData ${valueInsideEachCall} type='loop' start=${currentBlockLoopDetected.start.originalRowNumber} end=${currentBlockLoopDetected.end.originalRowNumber} }}`
        }))

        // we want to put the loop wrapper around the row wrapper
        processClosingTag(sheetDoc, endingRowEl.nextSibling, '{{/xlsxSData}}')
      }

      for (const cellEl of standardCellElsToHandle) {
        const cellInfo = getCellInfo(cellEl, sharedStringsEls, sheetFilepath)
        const fontSize = findCellFontSize(cellEl, stylesInfo)

        // wrap the cell <v> into wrapper so we can check the value size for
        // auto-size logic
        processOpeningTag(sheetDoc, cellEl.firstChild, `{{#xlsxSData type='cellValue' value="${cellInfo.value}" fontSize=${fontSize}}}`)
        processClosingTag(sheetDoc, cellEl.firstChild.nextSibling, '{{/xlsxSData}}')
      }

      for (const cellEl of contentDetectCellElsToHandle) {
        const cellInfo = getCellInfo(cellEl, sharedStringsEls, sheetFilepath)

        cellEl.setAttribute('__detectCellContent__', 'true')

        let newTextValue

        const isPartOfLoopStart = loopsDetected.find((l) => l.start.el === cellEl) != null
        const isPartOfLoopEnd = loopsDetected.find((l) => l.end?.el === cellEl) != null

        if (isPartOfLoopStart) {
          newTextValue = cellInfo.value.replace(regexp, '')
        } else if (isPartOfLoopEnd) {
          newTextValue = cellInfo.value.replace('{{/each}}', '')
        } else {
          newTextValue = cellInfo.value
        }

        const newContentEl = sheetDoc.createElement('info')
        const cellValueWrapperEl = sheetDoc.createElement('xlsxRemove')
        const cellValueWrapperEndEl = sheetDoc.createElement('xlsxRemove')
        const rawEl = sheetDoc.createElement('raw')
        const typeEl = sheetDoc.createElement('type')
        const contentEl = sheetDoc.createElement('content')
        const handlebarsRegexp = /{{{?(#[a-z]+ )?([a-z]+[^\n\r}]*)}?}}/g
        const matches = Array.from(newTextValue.matchAll(handlebarsRegexp))
        const isSingleMatch = matches.length === 1 && matches[0][0] === newTextValue && matches[0][1] == null
        const fontSize = findCellFontSize(cellEl, stylesInfo)

        if (isSingleMatch) {
          const match = matches[0]
          const expressionValue = match[2]

          cellValueWrapperEl.textContent = `{{#xlsxSData type='cellValue' value=${expressionValue.includes(' ') ? `(${expressionValue})` : expressionValue}`
        } else {
          cellValueWrapperEl.textContent = "{{#xlsxSData type='cellValue'"
        }

        cellValueWrapperEl.textContent += ` fontSize=${fontSize}}}`

        if (!isSingleMatch) {
          rawEl.textContent = `{{#xlsxSData type='cellValueRaw' }}${newTextValue}{{/xlsxSData}}`
        }

        typeEl.textContent = "{{xlsxSData type='cellValueType' }}"
        contentEl.textContent = "{{xlsxSData type='cellContent' }}"
        cellValueWrapperEndEl.textContent = '{{/xlsxSData}}'

        newContentEl.appendChild(cellValueWrapperEl)

        if (!isSingleMatch) {
          newContentEl.appendChild(rawEl)
        }

        newContentEl.appendChild(typeEl)
        newContentEl.appendChild(contentEl)
        newContentEl.appendChild(cellValueWrapperEndEl)

        cellEl.replaceChild(newContentEl, cellInfo.contentEl)
      }

      for (const { ref } of mergeCellElsToHandle) {
        // we want to put the all the mergeCell that affect this row
        // as its the last child
        const newMergeCellWrapperEl = sheetDoc.createElement('mergeCellUpdated')
        const newMergeCellEl = sheetDoc.createElement('mergeCell')

        let content = `type='mergeCell' originalCellRefRange='${ref}'`
        let fromLoop = false

        const mergeStartCellRef = ref.split(':')[0]
        const parsedMergeStart = parseCellRef(mergeStartCellRef)

        const loopDetected = loopsDetected.find((l) => (
          l.start.originalRowNumber === parsedMergeStart.rowNumber
        ))

        if (loopDetected != null) {
          const parsedLoopStart = parseCellRef(loopDetected.start.cellRef)
          const parsedLoopEnd = parseCellRef(loopDetected.end.cellRef)

          fromLoop = (
            parsedMergeStart.columnNumber >= parsedLoopStart.columnNumber &&
            parsedMergeStart.columnNumber <= parsedLoopEnd.columnNumber &&
            parsedMergeStart.rowNumber === parsedLoopStart.rowNumber
          )
        }

        if (fromLoop) {
          content += ' fromLoop=true'
        }

        newMergeCellEl.setAttribute('ref', `{{xlsxSData ${content}}}`)

        newMergeCellWrapperEl.appendChild(newMergeCellEl)
        rowEl.appendChild(newMergeCellWrapperEl)

        // if there is loop in row but the merge cell is not part
        // of it, we need to include a condition to only render
        // the mergeCellUpdated for the first item in the loop,
        // this is needed because we insert mergeCellUpdated nodes
        // inside the row
        if (loopDetected != null && !fromLoop) {
          processOpeningTag(sheetDoc, newMergeCellWrapperEl, '{{#if @first}}')
          processClosingTag(sheetDoc, newMergeCellWrapperEl, '{{/if}}')
        }
      }

      for (const { calcCellEl, cellRef, cellEl } of calcCellElsToHandle) {
        // we add the referenced cell in the calcChain in the cell
        // to be able to update the ref by the handlebars
        const newCalcCellEl = calcCellEl.cloneNode(true)

        newCalcCellEl.setAttribute('r', `{{xlsxSData type='cellRef' originalCellRef='${cellRef}'}}`)
        newCalcCellEl.setAttribute('oldR', cellRef)

        const wrapperElement = sheetDoc.createElement('calcChainCellUpdated')

        wrapperElement.appendChild(newCalcCellEl)
        // on the contrary with the merge cells case, the calcChainCellUpdated is inserted
        // in the cell, so there is no need for a wrapper that only renders it
        // for the first item in loop
        cellEl.insertBefore(wrapperElement, cellEl.firstChild)
      }

      for (const { cellEl, cellRef } of formulaCellElsToHandle) {
        const newFormulaWrapperEl = sheetDoc.createElement('formulaUpdated')
        const info = getCellInfo(cellEl, sharedStringsEls, sheetFilepath)
        let fromLoop = false

        const parsedCell = parseCellRef(cellRef)
        let formulaContent = `type='formula' originalCellRef='${cellRef}' originalFormula='${info.value}'`

        const loopDetected = loopsDetected.find((l) => (
          l.start.originalRowNumber === parsedCell.rowNumber
        ))

        if (loopDetected != null) {
          const parsedLoopStart = parseCellRef(loopDetected.start.cellRef)
          const parsedLoopEnd = parseCellRef(loopDetected.end.cellRef)

          fromLoop = (
            parsedCell.columnNumber >= parsedLoopStart.columnNumber &&
            parsedCell.columnNumber <= parsedLoopEnd.columnNumber &&
            parsedCell.rowNumber === parsedLoopStart.rowNumber
          )
        }

        if (fromLoop) {
          formulaContent += ' fromLoop=true'
        }

        // on the contrary with the merge cells case, the formulaUpdated is inserted
        // in the cell, so there is no need for a wrapper that only renders it
        // for the first item in loop
        info.valueEl.setAttribute('formulaIndex', "{{xlsxSData type='formulaIndex'}}")
        info.valueEl.textContent = `{{xlsxSData ${formulaContent}}}`
        info.valueEl.parentNode.replaceChild(newFormulaWrapperEl, info.valueEl)
        newFormulaWrapperEl.appendChild(info.valueEl)
      }
    }
  }

  // clean the shared string values used in the loop items
  for (const sharedStringEl of sharedStringElsToClean) {
    sharedStringEl.textContent = ''
  }
}

function getSheetInfo (_sheetPath, workbookSheetsEls, workbookRelsEls) {
  const sheetPath = _sheetPath.startsWith('xl/') ? _sheetPath.replace(/^xl\//, '') : _sheetPath

  const sheetRefEl = workbookRelsEls.find((el) => (
    el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet' &&
    el.getAttribute('Target') === sheetPath
  ))

  if (sheetRefEl == null) {
    return
  }

  const sheetEl = workbookSheetsEls.find((el) => el.getAttribute('r:id') === sheetRefEl.getAttribute('Id'))

  if (sheetEl == null) {
    return
  }

  return {
    id: sheetEl.getAttribute('sheetId'),
    name: sheetEl.getAttribute('name'),
    rId: sheetRefEl.getAttribute('Id'),
    path: sheetPath
  }
}

function getCellInfo (cellEl, sharedStringsEls, sheetFilepath) {
  let type
  let value
  let valueEl
  let contentEl

  if (cellEl.childNodes.length === 0) {
    return
  }

  const explicitType = cellEl.getAttribute('t')
  const childEls = nodeListToArray(cellEl.childNodes)

  if (explicitType != null && explicitType !== '') {
    type = explicitType

    switch (explicitType) {
      case 'b':
      case 'd':
      case 'n': {
        const vEl = childEls.find((el) => el.nodeName === 'v')

        if (vEl != null) {
          value = vEl.textContent
          valueEl = vEl
          contentEl = vEl
        }

        break
      }
      case 'inlineStr': {
        const isEl = childEls.find((el) => el.nodeName === 'is')
        let tEl

        if (isEl != null) {
          tEl = nodeListToArray(isEl.childNodes).find((el) => el.nodeName === 't')
        }

        if (tEl != null) {
          value = tEl.textContent
          valueEl = tEl
          contentEl = isEl
        }

        break
      }
      case 's': {
        const vEl = childEls.find((el) => el.nodeName === 'v')
        let sharedIndex

        if (vEl != null) {
          sharedIndex = parseInt(vEl.textContent, 10)
        }

        let sharedStringEl

        if (sharedIndex != null && !isNaN(sharedIndex)) {
          sharedStringEl = sharedStringsEls[sharedIndex]
        }

        if (sharedStringEl == null) {
          throw new Error(`Unable to find shared string with index ${sharedIndex}, sheet: ${sheetFilepath}`)
        }

        // the "t" node can be also wrapped in <si> and <r> when the text is styled
        // so we search for the first <t> node
        const tEl = sharedStringEl.getElementsByTagName('t')[0]

        if (tEl != null) {
          value = tEl.textContent
          valueEl = tEl
          contentEl = vEl
        }

        break
      }
      // we check for "e" because the xlsx can
      // contain formula with error
      case 'e':
      case 'str': {
        if (explicitType === 'e') {
          type = 'str'
        }

        const fEl = childEls.find((el) => el.nodeName === 'f')

        if (fEl != null) {
          value = fEl.textContent
          valueEl = fEl
          contentEl = fEl
        }

        break
      }
    }
  } else {
    // checking if the cell is inline string value
    const isEl = childEls.find((el) => el.nodeName === 'is')

    if (isEl != null) {
      const tEl = nodeListToArray(isEl.childNodes).find((el) => el.nodeName === 't')

      if (tEl != null) {
        type = 'inlineStr'
        value = tEl.textContent
        valueEl = tEl
        contentEl = isEl
      }
    }

    // now checking if the cell is formula value
    const fEl = childEls.find((el) => el.nodeName === 'f')

    if (type == null && fEl != null) {
      type = 'str'
      value = fEl.textContent
      valueEl = fEl
      contentEl = fEl
    }

    const vEl = childEls.find((el) => el.nodeName === 'v')
    const excelNumberAndDecimalRegExp = /^-?\d+(\.\d+)?(E-\d+)?$/

    // finally checking if the cell is number value
    if (type == null && vEl != null && excelNumberAndDecimalRegExp.test(vEl.textContent)) {
      type = 'n'
      value = vEl.textContent
      valueEl = vEl
      contentEl = vEl
    }
  }

  if (value == null) {
    throw new Error(`Expected value to be found in cell, sheet: ${sheetFilepath}`)
  }

  return {
    type,
    value,
    valueEl,
    contentEl
  }
}

function findCellFontSize (cellEl, styleInfo) {
  let styleId = cellEl.getAttribute('s')

  if (styleId != null && styleId !== '') {
    styleId = parseInt(styleId, 10)
  } else {
    styleId = 0
  }

  const cellXfsEls = styleInfo.cellXfsEls ?? nodeListToArray(styleInfo.doc.getElementsByTagName('cellXfs')[0]?.getElementsByTagName('xf'))
  const cellStyleXfsEls = styleInfo.cellStyleXfsEls ?? nodeListToArray(styleInfo.doc.getElementsByTagName('cellStyleXfs')[0]?.getElementsByTagName('xf'))
  const fontEls = styleInfo.fontEls ?? nodeListToArray(styleInfo.doc.getElementsByTagName('fonts')[0]?.getElementsByTagName('font'))

  const selectedXfEl = cellXfsEls[styleId]

  let fontId = selectedXfEl.getAttribute('fontId')
  const applyFont = selectedXfEl.getAttribute('applyFont')
  const xfId = selectedXfEl.getAttribute('xfId')

  if (
    applyFont == null ||
    applyFont === '' ||
    applyFont === '0'
  ) {
    const selectedStyleXfEl = cellStyleXfsEls[xfId]
    const nestedFontId = selectedStyleXfEl.getAttribute('fontId')
    const nestedApplyFont = selectedStyleXfEl.getAttribute('applyFont')

    if (
      nestedApplyFont == null ||
      nestedApplyFont === '' ||
      nestedApplyFont === '1'
    ) {
      fontId = nestedFontId
    }
  }

  const fontEl = fontEls[fontId]
  const sizeEl = fontEl.getElementsByTagName('sz')[0]

  // size stored in xlsx is in pt
  return parseFloat(sizeEl.getAttribute('val'))
}

function findCellElInCalcChain (sheetId, cellRef, calcChainEls) {
  const foundIndex = calcChainEls.findIndex((el) => {
    return el.getAttribute('r') === cellRef && el.getAttribute('i') === sheetId
  })

  if (foundIndex === -1) {
    return
  }

  const cellEl = calcChainEls[foundIndex]

  return cellEl
}

function findAutofitConfigured (sheetFilepath, sheetDoc, sheetRelsDoc, files) {
  const result = []
  const legacyDrawingEls = nodeListToArray(sheetDoc.getElementsByTagName('legacyDrawing'))
  const relationshipEls = sheetRelsDoc == null ? [] : nodeListToArray(sheetRelsDoc.getElementsByTagName('Relationship'))
  const commentRelEl = relationshipEls.find((el) => el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments')

  let commentsDoc

  if (commentRelEl != null) {
    const commentsFilePath = path.posix.join(path.posix.dirname(sheetFilepath), commentRelEl.getAttribute('Target'))
    commentsDoc = files.find((file) => file.path === commentsFilePath)?.doc
  }

  if (commentsDoc == null) {
    return result
  }

  const commentEls = nodeListToArray(commentsDoc.getElementsByTagName('comment'))

  for (const legacyDrawingEl of legacyDrawingEls) {
    const rId = legacyDrawingEl.getAttribute('r:id')

    if (rId == null) {
      continue
    }

    const relationshipEl = relationshipEls.find((el) => {
      return el.getAttribute('Id') === rId && el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing'
    })

    if (relationshipEl == null) {
      continue
    }

    const vmlDrawingFilePath = path.posix.join(path.posix.dirname(sheetFilepath), relationshipEl.getAttribute('Target'))
    const vmlDrawingDoc = files.find((file) => file.path === vmlDrawingFilePath)?.doc

    if (vmlDrawingDoc == null) {
      continue
    }

    const vShapeEls = nodeListToArray(vmlDrawingDoc.getElementsByTagName('v:shape'))

    for (const vShapeEl of vShapeEls) {
      const vClientDataEl = vShapeEl.getElementsByTagName('x:ClientData')[0]

      if (vClientDataEl == null) {
        continue
      }

      const type = vClientDataEl.getAttribute('ObjectType')

      if (type !== 'Note') {
        continue
      }

      const vClientDataRowEl = vClientDataEl.getElementsByTagName('x:Row')[0]
      const vClientDataColumnEl = vClientDataEl.getElementsByTagName('x:Column')[0]

      if (vClientDataRowEl == null || vClientDataColumnEl == null) {
        continue
      }

      const rowIdx = parseInt(vClientDataRowEl.textContent, 10)
      const columnIdx = parseInt(vClientDataColumnEl.textContent, 10)

      if (rowIdx !== 0) {
        continue
      }

      const expectedRef = `${num2col(columnIdx)}${rowIdx + 1}`

      const commentEl = commentEls.find((el) => {
        return el.getAttribute('ref') === expectedRef
      })

      if (commentEl == null) {
        continue
      }

      const textEl = nodeListToArray(commentEl.childNodes).find((el) => el.nodeName === 'text')

      if (textEl == null) {
        continue
      }

      const tEls = nodeListToArray(textEl.getElementsByTagName('t'))

      for (const tEl of tEls) {
        if (tEl.textContent.startsWith('{{xlsxColAutofit')) {
          result.push({
            row: rowIdx,
            column: columnIdx,
            shapeEl: vShapeEl,
            commentEl: commentEl
          })
          break
        }
      }
    }
  }

  return result
}

function processOpeningTag (doc, refElement, helperCall) {
  const fakeElement = doc.createElement('xlsxRemove')
  fakeElement.textContent = helperCall
  refElement.parentNode.insertBefore(fakeElement, refElement)
}

function processClosingTag (doc, refElement, closeCall) {
  const fakeElement = doc.createElement('xlsxRemove')
  fakeElement.textContent = closeCall
  refElement.parentNode.insertBefore(fakeElement, refElement.nextSibling)
}
