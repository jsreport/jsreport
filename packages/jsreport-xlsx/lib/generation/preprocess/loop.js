const path = require('path')
const { num2col } = require('xlsx-coordinates')
const { nodeListToArray, isWorksheetFile, isWorksheetRelsFile } = require('../../utils')
const parseCellRef = require('../../../lib/parseCellRef')
const startLoopRegexp = /{{#each ([^{}]{0,500})}}/

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
    const formulasUpdatedSharedItemsEl = sheetDoc.createElement('sharedItems')
    formulasUpdatedSharedItemsEl.textContent = "{{xlsxSData type='sharedFormulas'}}"
    formulasUpdatedEl.appendChild(formulasUpdatedSharedItemsEl)
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
      newDimensionEl.setAttribute('ref', `{{xlsxSData type="dimensionRef" originalCellRefRange="${dimensionEl.getAttribute('ref')}" }}`)
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
    const outOfLoopElsToHandle = []
    const mergeCellElsToHandle = []
    const formulaCellElsToHandle = []

    const lastRowIdx = rowsEls.length - 1

    for (const [rowIdx, rowEl] of rowsEls.entries()) {
      let originalRowNumber = rowEl.getAttribute('r')
      const isLastRow = rowIdx === lastRowIdx
      const standardCellElsToHandle = []
      const contentDetectCellElsToHandle = []
      const calcCellElsToHandle = []

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
          mergeCellElsToHandle.push({ ref: mergeCellEl.getAttribute('ref'), rowEl })
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
            info.value.includes('{{/each}}') &&
            !info.value.includes('{{#each')
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
              type: 'block',
              sourceDataCall: null,
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

          const isSharedFormula = (
            info.valueEl.getAttribute('t') === 'shared' &&
            info.valueEl.getAttribute('ref') != null &&
            info.valueEl.getAttribute('ref') !== '' &&
            info.valueEl.getAttribute('si') != null &&
            info.valueEl.getAttribute('si') !== ''
          )

          const formulaInfo = {
            cellRef,
            formula: info.value,
            formulaEl: info.valueEl
          }

          if (isSharedFormula) {
            formulaInfo.sharedFormula = {
              ref: info.valueEl.getAttribute('ref')
            }
          }

          formulaCellElsToHandle.push(formulaInfo)
        }
      }

      const rowLoops = loopsDetected.filter((l) => l.type === 'row' && l.start.originalRowNumber === originalRowNumber)
      const invalidRowLoop = rowLoops.find((l) => l.end == null)

      if (invalidRowLoop != null) {
        throw new Error(`Unable to find end of loop (#each) in ${f.path}. {{/each}} is missing`)
      }

      for (const currentRowLoopDetected of rowLoops) {
        // we should remove the handlebars loop call from the start/end cell
        normalizeLoopStartEndCell(currentRowLoopDetected)

        const startingRowEl = currentRowLoopDetected.start.el.parentNode
        const loopHelperCall = currentRowLoopDetected.start.info.value.match(startLoopRegexp)[0]

        const outOfLoopTypes = []
        const previousEls = getCellElsAndWrappers(currentRowLoopDetected.start.el, 'previous')
        const nextEls = getCellElsAndWrappers(currentRowLoopDetected.end.el, 'next')

        if (previousEls.length > 0) {
          // specify that there are cells to preserve that are before the each
          outOfLoopTypes.push('left')
        }

        if (nextEls.length > 0) {
          // specify that there are cells to preserve that are after the each
          outOfLoopTypes.push('right')
        }

        if (outOfLoopTypes.length > 0) {
          outOfLoopElsToHandle.push({
            loopDetected: currentRowLoopDetected,
            startingRowEl,
            endingRowEl: startingRowEl,
            types: outOfLoopTypes
          })
        }

        // we want to put the loop wrapper around the row wrapper
        processOpeningTag(sheetDoc, rowEl.previousSibling, loopHelperCall.replace(startLoopRegexp, (match, valueInsideEachCall) => {
          currentRowLoopDetected.sourceDataCall = valueInsideEachCall
          const parsedLoopStart = parseCellRef(currentRowLoopDetected.start.cellRef)
          const parsedLoopEnd = parseCellRef(currentRowLoopDetected.end.cellRef)
          return `{{#xlsxSData ${valueInsideEachCall} type='loop' start=${originalRowNumber} columnStart=${parsedLoopStart.columnNumber} columnEnd=${parsedLoopEnd.columnNumber} }}`
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
        // we should remove the handlebars loop call from the start/end cell
        normalizeLoopStartEndCell(currentBlockLoopDetected)

        const startingRowEl = currentBlockLoopDetected.start.el.parentNode
        const endingRowEl = currentBlockLoopDetected.end.el.parentNode
        const loopHelperCall = currentBlockLoopDetected.start.info.value.match(startLoopRegexp)[0]

        const outOfLoopTypes = []
        const previousEls = getCellElsAndWrappers(currentBlockLoopDetected.start.el, 'previous')
        const nextEls = getCellElsAndWrappers(currentBlockLoopDetected.end.el, 'next')

        if (previousEls.length > 0) {
          // specify that there are cells to preserve that are before the each
          outOfLoopTypes.push('left')
        }

        if (nextEls.length > 0) {
          // specify that there are cells to preserve that are after the each
          outOfLoopTypes.push('right')
        }

        if (outOfLoopTypes.length > 0) {
          outOfLoopElsToHandle.push({
            loopDetected: currentBlockLoopDetected,
            startingRowEl,
            endingRowEl,
            types: outOfLoopTypes
          })
        }

        // we want to put the loop wrapper around the start row wrapper
        processOpeningTag(sheetDoc, startingRowEl.previousSibling, loopHelperCall.replace(startLoopRegexp, (match, valueInsideEachCall) => {
          currentBlockLoopDetected.sourceDataCall = valueInsideEachCall
          const parsedLoopStart = parseCellRef(currentBlockLoopDetected.start.cellRef)
          const parsedLoopEnd = parseCellRef(currentBlockLoopDetected.end.cellRef)
          return `{{#xlsxSData ${valueInsideEachCall} type='loop' start=${currentBlockLoopDetected.start.originalRowNumber} columnStart=${parsedLoopStart.columnNumber} end=${currentBlockLoopDetected.end.originalRowNumber} columnEnd=${parsedLoopEnd.columnNumber} }}`
        }))

        // we want to put the loop wrapper around the end row wrapper
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

        let newTextValue

        const isPartOfLoopStart = loopsDetected.find((l) => l.start.el === cellEl) != null
        const isPartOfLoopEnd = loopsDetected.find((l) => l.end?.el === cellEl) != null

        if (isPartOfLoopStart) {
          newTextValue = cellInfo.value.replace(startLoopRegexp, '')
        } else if (isPartOfLoopEnd) {
          newTextValue = cellInfo.value.replace('{{/each}}', '')
        } else {
          newTextValue = cellInfo.value
        }

        const newContentEl = sheetDoc.createElement('xlsxRemove')
        const cellValueWrapperEl = sheetDoc.createElement('xlsxRemove')
        const cellValueWrapperEndEl = sheetDoc.createElement('xlsxRemove')
        const rawEl = sheetDoc.createElement('xlsxRemove')
        const handlebarsRegexp = /{{{?(#[\w-]+ )?([\w-]+[^\n\r}]*)}?}}/g
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

        cellEl.setAttribute('t', "{{xlsxSData type='cellValueType' }}")
        newContentEl.textContent = "{{xlsxSData type='cellContent' }}"
        cellValueWrapperEndEl.textContent = '{{/xlsxSData}}'

        cellEl.replaceChild(newContentEl, cellInfo.contentEl)
        cellEl.parentNode.insertBefore(cellValueWrapperEl, cellEl)

        if (!isSingleMatch) {
          cellEl.parentNode.insertBefore(rawEl, cellValueWrapperEl.nextSibling)
        }

        cellEl.parentNode.insertBefore(cellValueWrapperEndEl, cellEl.nextSibling)
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
    }

    let outLoopItemIndex = 0

    for (const { loopDetected, startingRowEl, endingRowEl, types } of outOfLoopElsToHandle) {
      for (const type of types) {
        const outOfLoopElement = sheetDoc.createElement('outOfLoop')
        let itemEl = sheetDoc.createElement('item')
        itemEl.textContent = outLoopItemIndex

        let rowHandlebarsWrapperText = type === 'left' ? startingRowEl.previousSibling.textContent : endingRowEl.previousSibling.textContent

        rowHandlebarsWrapperText = rowHandlebarsWrapperText.replace("type='row'", `type='row' loopIndex=${loopDetected.type === 'block' && type === 'right' ? loopDetected.sourceDataCall : '0'}`)

        const toCloneEls = []
        const currentEl = type === 'left' ? loopDetected.start.el : loopDetected.end.el

        if (type === 'left') {
          toCloneEls.push(...getCellElsAndWrappers(currentEl, 'previous'))

          toCloneEls.reverse()
        } else {
          toCloneEls.push(...getCellElsAndWrappers(currentEl, 'next'))
        }

        for (const toCloneEl of toCloneEls) {
          const newEl = toCloneEl.cloneNode(true)
          outOfLoopElement.appendChild(newEl)
          toCloneEl.parentNode.removeChild(toCloneEl)
        }

        // we include a if condition to preserve the cells that are before the each
        processOpeningTag(sheetDoc, outOfLoopElement.firstChild, rowHandlebarsWrapperText)
        processClosingTag(sheetDoc, outOfLoopElement.lastChild, '{{/xlsxSData}}')

        outOfLoopElement.insertBefore(itemEl, outOfLoopElement.firstChild)

        const loopEdgeEl = type === 'left' ? startingRowEl.previousSibling.previousSibling : endingRowEl.nextSibling.nextSibling

        loopEdgeEl.parentNode.insertBefore(outOfLoopElement, type === 'left' ? loopEdgeEl : loopEdgeEl.nextSibling)

        const outOfLoopPlaceholderElement = sheetDoc.createElement('outOfLoopPlaceholder')
        itemEl = sheetDoc.createElement('item')
        itemEl.textContent = outLoopItemIndex

        outOfLoopPlaceholderElement.appendChild(itemEl)

        if (type === 'left') {
          loopDetected.start.el.parentNode.insertBefore(outOfLoopPlaceholderElement, loopDetected.start.el)
        } else {
          loopDetected.end.el.parentNode.insertBefore(outOfLoopPlaceholderElement, loopDetected.end.el.nextSibling)
        }

        outLoopItemIndex++

        processOpeningTag(sheetDoc, outOfLoopPlaceholderElement, `{{#if ${loopDetected.type === 'block' && type === 'right' ? '@last' : '@first'}}}`)
        processClosingTag(sheetDoc, outOfLoopPlaceholderElement, '{{/if}}')
      }
    }

    for (const { ref, rowEl } of mergeCellElsToHandle) {
      // we want to put the all the mergeCell detected
      // as its the last child of row
      const newMergeCellWrapperEl = sheetDoc.createElement('mergeCellUpdated')
      const newMergeCellEl = sheetDoc.createElement('mergeCell')

      let content = `type='mergeCell' originalCellRefRange='${ref}'`
      let fromLoop = false

      const mergeStartCellRef = ref.split(':')[0]
      const parsedMergeStart = parseCellRef(mergeStartCellRef)
      let stayAt = 'first'

      // TODO: check how this work when there is nested loop
      // we check here if there is a loop that start/end in the same row of merged cell
      // (this does not necessarily mean that merged cell is part of the loop)
      const loopDetected = loopsDetected.find((l) => {
        if (l.type === 'block') {
          return (
            parsedMergeStart.rowNumber >= l.start.originalRowNumber &&
            parsedMergeStart.rowNumber <= l.end.originalRowNumber
          )
        }

        return l.start.originalRowNumber === parsedMergeStart.rowNumber
      })

      if (loopDetected != null) {
        const parsedLoopStart = parseCellRef(loopDetected.start.cellRef)
        const parsedLoopEnd = parseCellRef(loopDetected.end.cellRef)

        // here we check if the merged cell is really part of the loop or not
        if (loopDetected.type === 'block') {
          if (parsedLoopStart.rowNumber === parsedMergeStart.rowNumber) {
            fromLoop = parsedMergeStart.columnNumber >= parsedLoopStart.columnNumber
          } else if (parsedLoopEnd.rowNumber === parsedMergeStart.rowNumber) {
            fromLoop = parsedMergeStart.columnNumber <= parsedLoopEnd.columnNumber

            if (!fromLoop) {
              stayAt = 'last'
            }
          } else {
            fromLoop = true
          }
        } else {
          fromLoop = (
            parsedMergeStart.columnNumber >= parsedLoopStart.columnNumber &&
            parsedMergeStart.columnNumber <= parsedLoopEnd.columnNumber
          )
        }
      }

      if (fromLoop) {
        content += ' fromLoop=true'
      }

      newMergeCellEl.setAttribute('ref', `{{xlsxSData ${content}}}`)

      newMergeCellWrapperEl.appendChild(newMergeCellEl)
      rowEl.appendChild(newMergeCellWrapperEl)

      // if there is loop in row but the merge cell is not part
      // of it, we need to include a condition to only render
      // the mergeCellUpdated for the first/last item in the loop,
      // this is needed because we insert mergeCellUpdated nodes
      // inside the row
      if (loopDetected != null && !fromLoop) {
        processOpeningTag(sheetDoc, newMergeCellWrapperEl, `{{#if @${stayAt}}}`)
        processClosingTag(sheetDoc, newMergeCellWrapperEl, '{{/if}}')
      }
    }

    for (const { cellRef, formula, formulaEl, sharedFormula } of formulaCellElsToHandle) {
      const newFormulaWrapperEl = sheetDoc.createElement('formulaUpdated')
      let fromLoop = false

      const parsedCell = parseCellRef(cellRef)
      let formulaContent = `type='formula' originalCellRef='${cellRef}' originalFormula='${formula}'`

      if (sharedFormula != null) {
        formulaContent += ` originalSharedRefRange='${sharedFormula.ref}'`
      }

      // TODO: check how this work when there is nested loop
      // we check here if there is a loop that start/end in the same row of merged cell
      // (this does not necessarily mean that merged cell is part of the loop)
      const loopDetected = loopsDetected.find((l) => {
        if (l.type === 'block') {
          return (
            parsedCell.rowNumber >= l.start.originalRowNumber &&
            parsedCell.rowNumber <= l.end.originalRowNumber
          )
        }

        return l.start.originalRowNumber === parsedCell.rowNumber
      })

      if (loopDetected != null) {
        const parsedLoopStart = parseCellRef(loopDetected.start.cellRef)
        const parsedLoopEnd = parseCellRef(loopDetected.end.cellRef)

        // here we check if the formula cell is really part of the loop or not
        if (loopDetected.type === 'block') {
          if (parsedLoopStart.rowNumber === parsedCell.rowNumber) {
            fromLoop = parsedCell.columnNumber >= parsedLoopStart.columnNumber
          } else if (parsedLoopEnd.rowNumber === parsedCell.rowNumber) {
            fromLoop = parsedCell.columnNumber <= parsedLoopEnd.columnNumber
          } else {
            fromLoop = true
          }
        } else {
          fromLoop = (
            parsedCell.columnNumber >= parsedLoopStart.columnNumber &&
            parsedCell.columnNumber <= parsedLoopEnd.columnNumber
          )
        }
      }

      if (fromLoop) {
        formulaContent += ' fromLoop=true'
      }

      // on the contrary with the merge cells case, the formulaUpdated is inserted
      // in the cell, so there is no need for a wrapper that only renders it
      // for the first item in loop
      formulaEl.setAttribute('formulaIndex', "{{xlsxSData type='formulaIndex'}}")

      if (sharedFormula != null) {
        formulaEl.setAttribute('sharedFormulaIndex', "{{xlsxSData type='sharedFormulaIndex'}}")
      }

      formulaEl.textContent = `{{xlsxSData ${formulaContent}}}`
      formulaEl.parentNode.replaceChild(newFormulaWrapperEl, formulaEl)
      newFormulaWrapperEl.appendChild(formulaEl)
    }
  }

  // normalize the shared string values used across the sheets that can contain handlebars code
  for (const sharedStringEl of sharedStringsEls) {
    const tEl = sharedStringEl.getElementsByTagName('t')[0]

    if (tEl == null) {
      continue
    }

    if (tEl.textContent.includes('{{') && tEl.textContent.includes('}}')) {
      tEl.textContent = `{{{{xlsxSData type='raw'}}}}${tEl.textContent}{{{{/xlsxSData}}}}`
    }
  }
}

function getCellElsAndWrappers (currentEl, type = 'previous') {
  if (type !== 'previous' && type !== 'next') {
    throw new Error('type parameter must be previous or next')
  }

  const els = []
  let ready = false

  const target = type === 'previous' ? 'previousSibling' : 'nextSibling'

  while (currentEl[target] != null) {
    if (!ready) {
      ready = (
        // if the node is not xlsxRemove then we are ready
        currentEl[target].nodeName !== 'xlsxRemove' ||
        // if it is xlsxRemove but it is not end point then we are ready
        !currentEl[target].textContent.startsWith(type === 'previous' ? '{{#xlsxSData' : '{{/xlsxSData')
      )
    }

    if (ready) {
      els.push(currentEl[target])
    }

    currentEl = currentEl[target]
  }

  return els
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
        } else {
          // field is error but no formula definition was found, so we can not
          // parse this
          return
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

function normalizeLoopStartEndCell (loopDetectedInfo) {
  const cells = [{
    cell: loopDetectedInfo.start.el,
    cellInfo: loopDetectedInfo.start.info,
    target: startLoopRegexp
  }, {
    cell: loopDetectedInfo.end.el,
    cellInfo: loopDetectedInfo.end.info,
    target: '{{/each}}'
  }]

  for (const { cellInfo, target } of cells) {
    // when it is not a shared string
    if (cellInfo.type !== 's') {
      cellInfo.valueEl.textContent = cellInfo.valueEl.textContent.replace(target, '')
    }
  }
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
