const path = require('path')
const { num2col } = require('xlsx-coordinates')
const { nodeListToArray, isWorksheetFile, isWorksheetRelsFile, getSheetInfo, getStyleFile, getStyleInfo } = require('../../utils')
const { parseCellRef, getPixelWidthOfValue, getFontSizeFromStyle, evaluateCellRefsFromExpression } = require('../../cellUtils')
const startLoopRegexp = /{{#each\s+([^{|}]{0,500})(?:\s*(as\s+\|\w+\|))?\s*}}/

module.exports = (files, ctx) => {
  const workbookDoc = files.find((file) => file.path === 'xl/workbook.xml')?.doc
  const workbookRelsDoc = files.find((file) => file.path === 'xl/_rels/workbook.xml.rels')?.doc
  const sharedStringsDoc = files.find((f) => f.path === 'xl/sharedStrings.xml')?.doc
  const calcChainDoc = files.find((f) => f.path === 'xl/calcChain.xml')?.doc
  const styleInfo = getStyleInfo(getStyleFile(files)?.doc)

  const workbookCalcPrEl = workbookDoc.getElementsByTagName('calcPr')[0]

  let workbookSheetsEls = []
  let workbookRelsEls = []
  let sharedStringsEls = []
  const calcChainMap = new Map()

  if (workbookDoc) {
    workbookSheetsEls = nodeListToArray(workbookDoc.getElementsByTagName('sheet'))
  }

  if (workbookRelsDoc != null) {
    workbookRelsEls = nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship'))
  }

  if (sharedStringsDoc != null) {
    sharedStringsEls = nodeListToArray(sharedStringsDoc.getElementsByTagName('si'))
  }

  if (calcChainDoc != null) {
    const calcChainCellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    // we store the existing cell ref into other attribute
    // because later the attribute that contains the cell ref
    // is going to be updated
    for (const calcChainEl of calcChainCellEls) {
      calcChainMap.set(`${calcChainEl.getAttribute('i')}-${calcChainEl.getAttribute('r')}`, calcChainEl)
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
    let colsEl = sheetDoc.getElementsByTagName('cols')[0]

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
    const sheetDataCallProps = {}

    if (isAutofitConfigured) {
      sheetDataCallProps.autofit = autoFitColLettersStr

      if (colsEl == null) {
        colsEl = sheetDoc.createElement('cols')
        sheetDataEl.parentNode.insertBefore(colsEl, sheetDataEl)
      }

      if (ctx.autofitConfigured !== true) {
        ctx.autofitConfigured = true
      }
    }

    const sheetDataBlockStartEl = processOpeningTag(sheetDoc, sheetDataEl, getDataHelperCall('sd', sheetDataCallProps))

    let sheetDataEdgeEl = sheetDataEl

    while (sheetDataEdgeEl.nextSibling != null) {
      const nextSibling = sheetDataEdgeEl.nextSibling

      if (nextSibling.nodeName === 'mergeCells') {
        sheetDataEdgeEl = nextSibling
        break
      } else {
        sheetDataEdgeEl = nextSibling
      }
    }

    sheetDataEdgeEl = sheetDataEdgeEl.nodeName === 'mergeCells' ? sheetDataEdgeEl : sheetDataEl

    processClosingTag(sheetDoc, sheetDataEdgeEl, '{{/_D}}')

    const mergeCellsEl = sheetDoc.getElementsByTagName('mergeCells')[0]
    const mergeCellEls = mergeCellsEl == null ? [] : nodeListToArray(mergeCellsEl.getElementsByTagName('mergeCell'))

    const dimensionEl = sheetDoc.getElementsByTagName('dimension')[0]

    if (dimensionEl != null && rowsEls.length > 0) {
      // if sheetData has rows we add the dimension tag into the sheetData to be able to update
      // the ref by the handlebars
      dimensionEl.setAttribute('ref', `{{_D t='dimension' o='${dimensionEl.getAttribute('ref')}'}}`)
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

          newTableUpdatedEl.setAttribute('ref', `{{_D t='newCellRef' originalCellRefRange='${tableDoc.documentElement.getAttribute('ref')}'}}`)

          const autoFilterEl = tableDoc.getElementsByTagName('autoFilter')[0]

          if (autoFilterEl != null) {
            const newAutoFilterRef = sheetDoc.createElement('autoFilterRef')
            newAutoFilterRef.setAttribute('ref', `{{_D t='newCellRef' originalCellRefRange='${autoFilterEl.getAttribute('ref')}'}}`)
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

        if (tEls.length === 1) {
          const expectedRegexp = /^{{xlsxColAutofit( [^}]*)?}}$/
          shouldRemoveComment = expectedRegexp.test(tEls[0].textContent)
        } else if (tEls[0].textContent.endsWith(':')) {
          const remainingText = tEls.slice(1).map((el) => el.textContent).join('')
          const expectedRegexp = /^\r?\n?{{xlsxColAutofit( [^}]*)?}}$/
          shouldRemoveComment = expectedRegexp.test(remainingText)
        }

        if (shouldRemoveComment) {
          conf.commentEl.parentNode.removeChild(conf.commentEl)
          conf.shapeEl.parentNode.removeChild(conf.shapeEl)
        }
      }
    }

    const previousRows = []
    const loopsDetected = []
    const outOfLoopElsToHandle = []
    const mergeCellElsToHandle = []
    const formulaCellElsToHandle = []
    const cellsByRowMap = new Map()
    const cellsElsByRefMap = new Map()
    const colMaxSizeMap = new Map()
    const staticCellElsToHandle = []
    const contentDetectCellElsToHandle = []

    const lastRowIdx = rowsEls.length - 1

    for (const [rowIdx, rowEl] of rowsEls.entries()) {
      let originalRowNumber = rowEl.getAttribute('r')
      const isLastRow = rowIdx === lastRowIdx

      if (originalRowNumber == null || originalRowNumber === '') {
        throw new Error('Expected row to contain r attribute defined')
      }

      originalRowNumber = parseInt(originalRowNumber, 10)

      // wrap the <row> into wrapper so we can store data during helper calls
      processOpeningTag(sheetDoc, rowEl, `{{#_R ${originalRowNumber}}}`)
      processClosingTag(sheetDoc, rowEl, '{{/_R}}')

      // update the row number to be based on helper call
      rowEl.setAttribute('r', '{{@r}}')

      const cellsEls = nodeListToArray(rowEl.getElementsByTagName('c'))

      if (cellsEls.length === 0) {
        // there can be cases when the row has no cells but it has merge cell defined, if yes
        // then queue it to process it later
        const foundMergeCellEls = mergeCellEls.filter((mergeCellEl) => {
          const ref = mergeCellEl.getAttribute('ref')
          const mergeStartCellRef = ref.split(':')[0]
          return parseCellRef(mergeStartCellRef).rowNumber === originalRowNumber
        })

        for (const mergeCellEl of foundMergeCellEls) {
          mergeCellElsToHandle.push({ ref: mergeCellEl.getAttribute('ref'), rowEl })
        }
      }

      for (const cellEl of cellsEls) {
        const cellRef = cellEl.getAttribute('r')
        const parsedCellRef = parseCellRef(cellRef)

        const cellMeta = {
          letter: parsedCellRef.letter,
          columnNumber: parsedCellRef.columnNumber
        }

        cellsElsByRefMap.set(cellRef, [cellEl, cellMeta])

        if (!cellsByRowMap.has(originalRowNumber)) {
          cellsByRowMap.set(originalRowNumber, [])
        }

        cellsByRowMap.get(originalRowNumber).push(cellRef)

        let cellCallType = '_C'

        // search if we need to update some calc cell
        const calcCellEl = calcChainMap.get(`${sheetInfo.id}-${cellRef}`)

        if (calcCellEl != null) {
          cellCallType = '_c'
          cellMeta.calcChainUpdate = true
        }

        // using alias for helper to optimize the size of generated xml
        cellEl.setAttribute('r', `{{${cellCallType} '${cellMeta.letter}'}}`)

        // check if the cell starts a merge cell, if yes
        // then queue it to process it later
        const mergeCellEl = mergeCellEls.find((mergeCellEl) => {
          const ref = mergeCellEl.getAttribute('ref')
          return ref.startsWith(`${cellRef}:`)
        })

        if (mergeCellEl != null) {
          mergeCellElsToHandle.push({ ref: mergeCellEl.getAttribute('ref'), rowEl })
        }

        const info = getCellInfo(cellEl, sharedStringsEls, sheetFilepath)

        if (
          info != null &&
          (info.type === 'inlineStr' ||
          info.type === 's')
        ) {
          const loopStartOrEndRegExp = /{{[#/]each/
          const textWithoutLoopParts = []
          let remainingToCheck = info.value
          let lastStartCall = ''

          const normalizeIfVerticalLoop = (cLoop, callStr) => {
            if (cLoop?.end == null && callStr !== '') {
              const loopHelperCall = callStr.match(startLoopRegexp)[0]
              const isVertical = cLoop.type === 'block' && loopHelperCall != null && loopHelperCall.includes('vertical=')

              if (isVertical) {
                cLoop.type = 'vertical'
              }
            }
          }

          do {
            const match = remainingToCheck.match(loopStartOrEndRegExp)
            let currentLoopDetected = getLatestNotClosedLoop(loopsDetected)

            if (match != null) {
              const partType = match[0] === '{{#each' ? 'start' : 'end'
              let inlineLoop = false
              let newLoopItem

              if (currentLoopDetected != null && partType === 'end') {
                // if loop starts and end in same cell then
                // we don't consider it a loop for our purposes
                // (it is just a normal loop that creates strings not rows/cells)
                if (currentLoopDetected.start.el === cellEl) {
                  inlineLoop = true
                  loopsDetected.pop()
                } else {
                  if (currentLoopDetected.type === 'vertical') {
                    let foundMatchingVerticalLoop = false
                    const latestNotClosedLoops = getLatestNotClosedLoop(loopsDetected, true)

                    for (const latestLoop of latestNotClosedLoops) {
                      if (latestLoop.type === 'vertical' && parsedCellRef.columnNumber === latestLoop.start.originalColumnNumber) {
                        foundMatchingVerticalLoop = latestLoop
                        break
                      }
                    }

                    if (!foundMatchingVerticalLoop) {
                      throw new Error(`Unable to match start {{#each}} and end {{/each}} of vertical loop for multiple rows in ${f.path}. both start and end of loop must be on same column`)
                    }

                    currentLoopDetected = foundMatchingVerticalLoop
                  }

                  currentLoopDetected.end = {
                    el: cellEl,
                    cellRef,
                    info,
                    originalRowNumber,
                    originalColumnNumber: parsedCellRef.columnNumber
                  }

                  if (currentLoopDetected.end.originalRowNumber === currentLoopDetected.start.originalRowNumber) {
                    currentLoopDetected.type = 'row'
                  }
                }
              } else if (partType === 'start') {
                normalizeIfVerticalLoop(currentLoopDetected, lastStartCall)

                const isNested = currentLoopDetected != null && currentLoopDetected.type !== 'vertical'

                const hierarchyIdPrefix = isNested ? `${currentLoopDetected.hierarchyId}#` : ''
                const hierarchyIdCounter = isNested ? currentLoopDetected.children.length : loopsDetected.length

                const hierarchyId = `${hierarchyIdPrefix}${hierarchyIdCounter}`

                newLoopItem = {
                  type: 'block',
                  hierarchyId,
                  blockStartEl: null,
                  blockEndEl: null,
                  children: [],
                  start: {
                    el: cellEl,
                    cellRef,
                    info,
                    originalRowNumber,
                    originalColumnNumber: parsedCellRef.columnNumber
                  }
                }

                if (isNested) {
                  currentLoopDetected.children.push(newLoopItem)
                }

                loopsDetected.push(newLoopItem)
              }

              const restLeft = remainingToCheck.slice(0, match.index)

              if (restLeft !== '') {
                textWithoutLoopParts.push(inlineLoop ? `${lastStartCall}${restLeft}{{/each}}` : restLeft)
              }

              const endLoopPartIdx = remainingToCheck.indexOf('}}', match.index + match[0].length)
              let lastPartIdx

              if (endLoopPartIdx !== -1) {
                lastPartIdx = endLoopPartIdx + 2
              } else {
                lastPartIdx = match.index + match[0].length
              }

              if (partType === 'start') {
                lastStartCall = remainingToCheck.slice(match.index, lastPartIdx)
                newLoopItem.start.helperCall = lastStartCall
              }

              remainingToCheck = remainingToCheck.slice(lastPartIdx)
            } else {
              textWithoutLoopParts.push(remainingToCheck)
              remainingToCheck = ''
              normalizeIfVerticalLoop(currentLoopDetected, lastStartCall)
            }
          } while (remainingToCheck !== '')

          // only do content detection for the cells with handlebars
          if (info.value.includes('{{') && info.value.includes('}}')) {
            const textWithoutLoop = textWithoutLoopParts.join('')

            contentDetectCellElsToHandle.push({
              cellRef,
              normalizedText: textWithoutLoop
            })
          } else if (isAutofitConfigured) {
            staticCellElsToHandle.push(cellRef)
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
            info.valueEl.getAttribute('si') != null &&
            info.valueEl.getAttribute('si') !== ''
          )

          const formulaInfo = {
            formula: info.value,
            formulaEl: info.valueEl
          }

          if (isSharedFormula) {
            const ref = info.valueEl.getAttribute('ref')

            formulaInfo.sharedFormula = {
              type: ref != null && ref !== '' ? 'source' : 'reference'
            }

            if (formulaInfo.sharedFormula.type === 'source') {
              formulaInfo.sharedFormula.sourceRef = info.valueEl.getAttribute('ref')
            }
          }

          const { cellRefs } = evaluateCellRefsFromExpression(info.value)

          formulaInfo.cellRefsInFormula = cellRefs

          formulaCellElsToHandle.push(formulaInfo)
        }
      }

      const loopsToProcess = checkAndGetLoopsToProcess(f, loopsDetected, originalRowNumber, isLastRow)

      for (const currentLoop of loopsToProcess) {
        // we should remove the handlebars loop call from the start/end cell
        normalizeLoopStartEndCell(currentLoop)

        const startingRowEl = currentLoop.start.el.parentNode
        const endingRowEl = currentLoop.end.el.parentNode
        const loopHelperCall = currentLoop.start.helperCall
        const isVertical = currentLoop.type === 'vertical'

        const outOfLoopTypes = []
        const previousEls = getCellElsAndWrappersFrom(currentLoop.start.el, 'previous')
        const nextEls = getCellElsAndWrappersFrom(currentLoop.end.el, 'next')

        if (!isVertical && previousEls.length > 0) {
          // specify that there are cells to preserve that are before the each
          outOfLoopTypes.push('left')
        }

        if (!isVertical && nextEls.length > 0) {
          // specify that there are cells to preserve that are after the each
          outOfLoopTypes.push('right')
        }

        if (outOfLoopTypes.length > 0) {
          outOfLoopElsToHandle.push({
            loopDetected: currentLoop,
            startingRowEl,
            endingRowEl,
            types: outOfLoopTypes
          })
        }

        const parsedLoopStart = parseCellRef(currentLoop.start.cellRef)
        const parsedLoopEnd = parseCellRef(currentLoop.end.cellRef)

        const replaceLoopMatch = (match, dataExpressionPart, asPart) => {
          const targetDataExpressionPart = dataExpressionPart.trimEnd()
          const targetAsPart = asPart != null && asPart !== '' ? asPart.trim() : ''

          const extraAttrs = [
            `hierarchyId='${currentLoop.hierarchyId}'`,
            `start=${currentLoop.start.originalRowNumber}`
          ]

          if (currentLoop.type === 'block') {
            extraAttrs.push(`end=${currentLoop.end.originalRowNumber}`)
          }

          extraAttrs.push(
            `columnStart=${parsedLoopStart.columnNumber}`,
            `columnEnd=${parsedLoopEnd.columnNumber}`
          )

          if (targetAsPart !== '') {
            extraAttrs.push(targetAsPart)
          }

          return `{{#_D ${targetDataExpressionPart} t='loop' ${extraAttrs.join(' ')}}}`
        }

        if (isVertical) {
          const invalidLoop = loopsDetected.find((loop) => {
            if (loop.hierarchyId === currentLoop.hierarchyId) {
              return false
            }

            if (loop.type === 'vertical') {
              // we are fine detecting just one side
              return (
                loop.start.originalColumnNumber === parsedLoopStart.columnNumber &&
                loop.start.originalRowNumber >= parsedLoopStart.rowNumber &&
                loop.start.originalRowNumber <= parsedLoopEnd.rowNumber
              )
            } else if (loop.type === 'row' || loop.type === 'block') {
              // we are fine detecting just one side in the case of block loops
              return (
                loop.start.originalRowNumber >= parsedLoopStart.rowNumber &&
                loop.start.originalRowNumber <= parsedLoopEnd.rowNumber
              )
            }

            return false
          })

          if (invalidLoop != null) {
            if (invalidLoop.type === 'vertical') {
              throw new Error(`Vertical loops can not have child vertical loops. Check child vertical loop definition in ${f.path}, cell ${invalidLoop.start.cellRef}`)
            } else {
              throw new Error(`Vertical loops can not be defined in rows that contain ${invalidLoop.type} loops. Check vertical loop definition in ${f.path}, cell ${invalidLoop.start.cellRef}`)
            }
          }

          const affectedRowNumbers = previousRows.filter(([pRowNumber]) => {
            return (
              pRowNumber >= parsedLoopStart.rowNumber &&
              pRowNumber <= parsedLoopEnd.rowNumber
            )
          }).map(([pRowNumber]) => pRowNumber)

          affectedRowNumbers.push(parsedLoopEnd.rowNumber)

          for (const currentRowNumber of affectedRowNumbers) {
            const cellElsInRow = cellsByRowMap.get(currentRowNumber).filter((cellRef) => {
              const [, cellMeta] = cellsElsByRefMap.get(cellRef)

              return (
                cellMeta.columnNumber >= parsedLoopStart.columnNumber &&
                cellMeta.columnNumber <= parsedLoopEnd.columnNumber
              )
            }).sort((a, b) => {
              const [, aMeta] = cellsElsByRefMap.get(a)
              const [, bMeta] = cellsElsByRefMap.get(b)
              return aMeta.columnNumber - bMeta.columnNumber
            }).map((cellRef) => cellsElsByRefMap.get(cellRef)[0])

            const startEl = cellElsInRow[0]

            processOpeningTag(sheetDoc, startEl, loopHelperCall.replace(startLoopRegexp, replaceLoopMatch))
            processClosingTag(sheetDoc, startEl, '{{/_D}}')
          }
        } else {
          // we want to put the loop wrapper around the start row wrapper
          currentLoop.blockStartEl = processOpeningTag(sheetDoc, startingRowEl.previousSibling, loopHelperCall.replace(startLoopRegexp, replaceLoopMatch))

          // we want to put the loop wrapper around the end row wrapper
          currentLoop.blockEndEl = processClosingTag(sheetDoc, endingRowEl.nextSibling, '{{/_D}}')
        }
      }

      previousRows.push([originalRowNumber, rowEl])
    }

    for (const cellRef of staticCellElsToHandle) {
      const [cellEl, cellMeta] = cellsElsByRefMap.get(cellRef)
      const cellInfo = getCellInfo(cellEl, sharedStringsEls, sheetFilepath)
      const fontSize = getFontSizeFromStyle(cellEl.getAttribute('s'), styleInfo)

      const currentMaxSize = colMaxSizeMap.get(cellMeta.letter)
      const currentSize = getPixelWidthOfValue(cellInfo.value, fontSize)

      if (currentMaxSize == null || currentSize > currentMaxSize) {
        colMaxSizeMap.set(cellMeta.letter, currentSize)
      }
    }

    for (const { cellRef, normalizedText } of contentDetectCellElsToHandle) {
      const [cellEl, cellMeta] = cellsElsByRefMap.get(cellRef)

      const newTextValue = normalizedText

      const handlebarsRegexp = /{{{?(#[\w-]+\s+)?([\w-]+[^\n\r}]*)}?}}/g
      const matches = Array.from(newTextValue.matchAll(handlebarsRegexp))
      const isSingleMatch = matches.length === 1 && matches[0][0] === newTextValue && matches[0][1] == null

      cellEl.setAttribute('r', cellMeta.letter)
      cellEl.setAttribute('__CT_t__', '_T')
      cellEl.setAttribute('__CT_m__', isSingleMatch ? '0' : '1')
      cellEl.setAttribute('__CT_cCU__', cellMeta.calcChainUpdate ? '1' : '0')

      if (isSingleMatch) {
        const match = matches[0]
        const shouldEscape = !match[0].startsWith('{{{')
        const expressionValue = match[2]
        const value = expressionValue.includes(' ') ? `(${expressionValue})` : expressionValue

        cellEl.setAttribute('__CT_v__', value)
        cellEl.setAttribute('__CT_ve__', shouldEscape ? '1' : '0')
      }

      // when multi-expression put the content with handlebars as the only content of the cell,
      // for the rest of cases put a space to avoid the cell to be serialized as self closing tag
      cellEl.textContent = isSingleMatch ? ' ' : newTextValue
    }

    let outLoopItemIndex = 0

    const sortedOutOfLoopElsToHandle = getOutOfLoopElsSortedByHierarchy(outOfLoopElsToHandle)

    for (const { loopDetected, startingRowEl, endingRowEl, types } of sortedOutOfLoopElsToHandle) {
      const loopLevel = loopDetected.hierarchyId.split('#').length
      const isOuterLevel = loopLevel === 1

      for (const type of types) {
        const outOfLoopEl = sheetDoc.createElement('outOfLoop')

        const rowHandlebarsWrapperText = type === 'left' ? startingRowEl.previousSibling.textContent : endingRowEl.previousSibling.textContent

        const toCloneEls = []
        const currentRowNumber = type === 'left' ? loopDetected.start.originalRowNumber : loopDetected.end.originalRowNumber
        const currentEl = type === 'left' ? loopDetected.start.el : loopDetected.end.el

        const remainingCellRefsInRow = cellsByRowMap.get(currentRowNumber).filter((cellRef) => {
          const parsedCellRef = parseCellRef(cellRef)

          if (type === 'left') {
            return parsedCellRef.columnNumber < loopDetected.start.originalColumnNumber
          }

          return parsedCellRef.columnNumber > loopDetected.end.originalColumnNumber
        })

        const els = getCellElsAndWrappersFrom(currentEl, type === 'left' ? 'previous' : 'next')

        if (type === 'left') {
          els.reverse()
        }

        const items = []
        let idx = 0

        for (const cEl of els) {
          const item = [cEl]

          if (cEl.nodeName === 'c') {
            item.push(remainingCellRefsInRow[idx])
            idx++
          }

          items.push(item)
        }

        toCloneEls.push(...items)

        for (const [toCloneEl, cellRef] of toCloneEls) {
          const newEl = toCloneEl.cloneNode(true)
          outOfLoopEl.appendChild(newEl)

          if (cellRef != null) {
            // updating map of cellEl references
            const stored = cellsElsByRefMap.get(cellRef)
            stored[0] = newEl
          }

          toCloneEl.parentNode.removeChild(toCloneEl)
        }

        processOpeningTag(sheetDoc, outOfLoopEl.firstChild, rowHandlebarsWrapperText)
        processClosingTag(sheetDoc, outOfLoopEl.lastChild, '{{/_R}}')

        processOpeningTag(sheetDoc, outOfLoopEl.firstChild, `{{#_D t='outOfLoop' item='${outLoopItemIndex}' }}`)
        processClosingTag(sheetDoc, outOfLoopEl.lastChild, '{{/_D}}')

        const loopEdgeEl = loopDetected.blockStartEl

        const outOfLoopItemContentEls = nodeListToArray(outOfLoopEl.childNodes)

        for (const contentEl of outOfLoopItemContentEls) {
          loopEdgeEl.parentNode.insertBefore(
            contentEl,
            loopEdgeEl
          )
        }

        const outOfLoopPlaceholderEl = sheetDoc.createElement('outOfLoopPlaceholder')

        const contentEl = sheetDoc.createElement('xlsxRemove')
        contentEl.textContent = `{{_D t='outOfLoopPlaceholder' item='${outLoopItemIndex}' }}`

        outOfLoopPlaceholderEl.appendChild(contentEl)

        // we only want to conditionally render the outOfLoopPlaceholder items if the loop
        // is at the outer level
        if (isOuterLevel) {
          // we include a if condition to preserve the cells that are before/after the each
          processOpeningTag(sheetDoc, outOfLoopPlaceholderEl.firstChild, `{{#if ${loopDetected.type === 'block' && type === 'right' ? '@last' : '@first'}}}`)
          processClosingTag(sheetDoc, outOfLoopPlaceholderEl.lastChild, '{{/if}}')
        }
        const outOfLoopPlaceholderContentEls = nodeListToArray(outOfLoopPlaceholderEl.childNodes)
        const cellAndWrappers = getCellElAndWrappers(type === 'left' ? loopDetected.start.el : loopDetected.end.el)

        if (type === 'right') {
          outOfLoopPlaceholderContentEls.reverse()
        }

        for (const contentEl of outOfLoopPlaceholderContentEls) {
          if (type === 'left') {
            loopDetected.start.el.parentNode.insertBefore(contentEl, cellAndWrappers[0])
          } else {
            loopDetected.end.el.parentNode.insertBefore(contentEl, cellAndWrappers[cellAndWrappers.length - 1].nextSibling)
          }
        }

        outLoopItemIndex++
      }
    }

    const inverseLoopsDetected = [...loopsDetected].reverse()

    for (const [idx, { ref, rowEl }] of mergeCellElsToHandle.entries()) {
      const isLast = idx === mergeCellElsToHandle.length - 1
      const newMergeCellCallEl = sheetDoc.createElement('xlsxRemove')

      const mergeStartCellRef = ref.split(':')[0]
      const parsedMergeStart = parseCellRef(mergeStartCellRef)
      const mergeStartMatch = cellsElsByRefMap.get(mergeStartCellRef)

      if (mergeStartMatch == null) {
        // this happens when there is merge cell that has no definition in row (row with no cells),
        // we put a cell call just to have the correct handlebars data.l updated before the merge helper call happens
        newMergeCellCallEl.textContent = `{{_C '${parsedMergeStart.letter}'}}{{_D t='m' o='${ref}'}}`
        rowEl.appendChild(newMergeCellCallEl)
      } else {
        const [mergeStartCellEl] = mergeStartMatch
        newMergeCellCallEl.textContent = `{{_D t='m' o='${ref}'}}`

        // since the updated cell letter does not have a parent-child relationship like
        // the updated row number has, then we need to insert the merge cell call just next to
        // the merge cell start to ensure that when it tries to read the updated cell letter
        // it is still the right value, specially for when there is vertical loop involved
        // in current cell or past cells
        mergeStartCellEl.parentNode.insertBefore(newMergeCellCallEl, mergeStartCellEl.nextSibling)
      }

      if (!isLast) {
        continue
      }

      mergeCellsEl.setAttribute('count', "{{_D t='mergeCellsCount'}}")

      processOpeningTag(sheetDoc, mergeCellsEl, "{{#_D t='mergeCells'}}")
      processClosingTag(sheetDoc, mergeCellsEl, '{{/_D}}')

      for (const mergeCellEl of mergeCellEls) {
        const originalCellRefRange = mergeCellEl.getAttribute('ref')
        mergeCellEl.setAttribute('ref', '{{newRef}}')

        processOpeningTag(sheetDoc, mergeCellEl, `{{#_D t='mI' o='${originalCellRefRange}'}}`)
        processClosingTag(sheetDoc, mergeCellEl, '{{/_D}}')
      }

      processOpeningTag(sheetDoc, mergeCellsEl.firstChild, "{{#_D t='mergeCellsItems'}}")
      processClosingTag(sheetDoc, mergeCellsEl.lastChild, '{{/_D}}')
    }

    const formulaNotExistingCellRefs = new Set()

    for (const { formula, formulaEl, sharedFormula, cellRefsInFormula } of formulaCellElsToHandle) {
      if (sharedFormula?.type === 'reference') {
        continue
      }

      formulaEl.textContent = `{{_D t='f' o='${jsSingleQuoteEscape(formula)}'`

      if (sharedFormula?.type === 'source') {
        formulaEl.setAttribute('ref', `{{_D t='fs' o='${jsSingleQuoteEscape(sharedFormula.sourceRef)}'}}`)
      }

      formulaEl.textContent += '}}'

      for (const cellRefInfo of cellRefsInFormula) {
        // we don't process formulas with references to other sheets
        if (cellRefInfo.parsed.sheetName != null) {
          continue
        }

        // we need to normalize to ignore the possible locked symbols ($)
        const normalizedCellRef = cellRefInfo.localRef
        const targetCellEl = cellsElsByRefMap.get(normalizedCellRef)?.[0]

        if (targetCellEl != null) {
          continue
        }

        const parsedNormalizedCellRef = parseCellRef(normalizedCellRef)
        // we check here if there is a loop that start/end in the same row of merged cell
        // (this does not necessarily mean that merged cell is part of the loop)
        const loopDetectionResult = getParentLoop(inverseLoopsDetected, parsedNormalizedCellRef)
        let value = normalizedCellRef

        if (loopDetectionResult != null) {
          value += `|${loopDetectionResult.loopDetected.hierarchyId}`
        }

        // we get here when a formula references a cell which
        // does not have any content (so it does not have a corresponding cell element).
        // using a Set also guarantees that we only process the cel ref once,
        // it does not matter that multiple formulas references the same cell
        // we just want one entry for it.
        formulaNotExistingCellRefs.add(value)
      }
    }

    if (formulaNotExistingCellRefs.size > 0) {
      sheetDataCallProps.nonExistingCellRefs = [...formulaNotExistingCellRefs].join(',')
    }

    // handle possible lazy formulas (formulas that reference other cells that are not yet processed)
    // example case:
    // E2 cell = formula (10+E7)
    // there is loop on row 5
    // E7 cell = 30
    // the final output of E2 should be 10+<newCellRefAfterLoop>
    // NOTE: if we find this approach is slow because the regexp requirement we can
    // switch to a different approach based on Defined names, which we can set on different place
    // either Workbook or Sheet level, use dynamic calculated names when processing Sheets, and then
    // on single last step declared the Defined names.
    // with this we can avoid the extra regexp step which
    // is for sure slow if you create many of the formulas that will require the final references
    // to be evaluated at final step
    const newLazyFormulasCallEl = sheetDoc.createElement('xlsxRemove')
    newLazyFormulasCallEl.textContent = "{{_D t='lazyFormulas'}}"
    sheetDataEl.appendChild(newLazyFormulasCallEl)

    if (isAutofitConfigured) {
      const colsProps = {}

      const baseCols = []

      for (const [cellLetter, maxSize] of colMaxSizeMap) {
        baseCols.push(`${cellLetter}:${maxSize}`)
      }

      if (baseCols.length > 0) {
        sheetDataCallProps.autofitBCols = baseCols.join(',')
      }

      processOpeningTag(sheetDoc, colsEl, getDataHelperCall('autofit', colsProps))
      processClosingTag(sheetDoc, colsEl, '{{/_D}}')
    }

    sheetDataBlockStartEl.textContent = getDataHelperCall('sd', sheetDataCallProps)

    processOpeningTag(sheetDoc, sheetDoc.documentElement.firstChild, getDataHelperCall('ws', { sheetId: sheetInfo.id }))
    processClosingTag(sheetDoc, sheetDoc.documentElement.lastChild, '{{/_D}}')
  }

  // normalize the shared string values used across the sheets that can contain handlebars code
  for (const sharedStringEl of sharedStringsEls) {
    const tEl = sharedStringEl.getElementsByTagName('t')[0]

    if (tEl == null) {
      continue
    }

    if (tEl.textContent.includes('{{') && tEl.textContent.includes('}}')) {
      tEl.textContent = `{{{{_D t='raw'}}}}${tEl.textContent}{{{{/_D}}}}`
    }
  }

  // place handlebars call that handle updating the calcChain
  if (calcChainDoc != null) {
    processOpeningTag(calcChainDoc, calcChainDoc.documentElement.firstChild, "{{#_D t='calcChain'}}")
    processClosingTag(calcChainDoc, calcChainDoc.documentElement.lastChild, '{{/_D}}')
  }
}

function getDataHelperCall (type, props, isBlock = true) {
  let callStr = `{{${isBlock ? '#' : ''}_D t='${type}'`
  const targetProps = props || {}
  const keys = Object.keys(targetProps)

  for (const key of keys) {
    const value = targetProps[key]

    if (value == null) {
      continue
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      callStr += ` ${key}=${value}`
    } else {
      callStr += ` ${key}='${value}'`
    }
  }

  callStr += '}}'

  return callStr
}

function getOutOfLoopElsSortedByHierarchy (outOfLoopElsToHandle) {
  const hierarchy = new Map()
  const hierarchyIdElMap = new Map()

  for (let idx = 0; idx < outOfLoopElsToHandle.length; idx++) {
    const outOfLoopElToHandle = outOfLoopElsToHandle[idx]
    const hierarchyId = outOfLoopElToHandle.loopDetected.hierarchyId

    hierarchyIdElMap.set(hierarchyId, outOfLoopElToHandle)

    const parts = hierarchyId.split('#')
    let currentHierarchy = hierarchy

    for (let partIdx = 0; partIdx < parts.length; partIdx++) {
      const occurrenceIdx = parseInt(parts[partIdx], 10)
      const isLast = partIdx === parts.length - 1

      if (!currentHierarchy.has(occurrenceIdx)) {
        currentHierarchy.set(occurrenceIdx, {
          children: new Map()
        })
      }

      const currentItem = currentHierarchy.get(occurrenceIdx)

      if (isLast) {
        currentItem.match = hierarchyId
      }

      currentHierarchy = currentItem.children
    }
  }

  const toArraySortedByOccurrence = (targetMap) => {
    const sortedKeysByOccurrence = [...targetMap.keys()].sort((a, b) => a - b)
    return sortedKeysByOccurrence.map((key) => targetMap.get(key))
  }

  const pending = toArraySortedByOccurrence(hierarchy)
  const sortedHierarchyIds = []

  while (pending.length > 0) {
    const currentPending = pending.shift()

    if (typeof currentPending === 'string') {
      sortedHierarchyIds.push(currentPending)
      continue
    }

    const item = currentPending

    if (item.children.size > 0) {
      pending.unshift(...toArraySortedByOccurrence(item.children))
    }

    if (item.match != null) {
      pending.unshift(item.match)
    }
  }

  const result = sortedHierarchyIds.map((hierarchyId) => hierarchyIdElMap.get(hierarchyId))

  return result
}

function getLatestNotClosedLoop (loopsDetected, all = false) {
  const found = []

  for (let index = loopsDetected.length - 1; index >= 0; index--) {
    const currentLoop = loopsDetected[index]

    if (currentLoop.end != null) {
      continue
    }

    found.push(currentLoop)

    if (!all) {
      break
    }
  }

  return all ? found : found[0]
}

function getParentLoop (inverseLoopsDetected, parsedCellRef) {
  const loopDetected = inverseLoopsDetected.find((l) => {
    switch (l.type) {
      case 'row':
        return l.start.originalRowNumber === parsedCellRef.rowNumber
      case 'block':
        return (
          parsedCellRef.rowNumber >= l.start.originalRowNumber &&
          parsedCellRef.rowNumber <= l.end.originalRowNumber
        )
      case 'vertical':
        return (
          parsedCellRef.rowNumber >= l.start.originalRowNumber &&
          parsedCellRef.rowNumber <= l.end.originalRowNumber &&
          parsedCellRef.columnNumber === l.start.originalColumnNumber
        )
      default:
        throw new Error(`Unknown loop type ${l.type}`)
    }
  })

  if (loopDetected == null) {
    return
  }

  const parsedLoopStart = parseCellRef(loopDetected.start.cellRef)
  const parsedLoopEnd = parseCellRef(loopDetected.end.cellRef)
  let insideLoop = false

  // here we check if the merged cell is really part of the loop or not
  switch (loopDetected.type) {
    case 'row': {
      insideLoop = (
        parsedCellRef.columnNumber >= parsedLoopStart.columnNumber &&
        parsedCellRef.columnNumber <= parsedLoopEnd.columnNumber
      )
      break
    }
    case 'block': {
      if (parsedLoopStart.rowNumber === parsedCellRef.rowNumber) {
        insideLoop = parsedCellRef.columnNumber >= parsedLoopStart.columnNumber
      } else if (parsedLoopEnd.rowNumber === parsedCellRef.rowNumber) {
        insideLoop = parsedCellRef.columnNumber <= parsedLoopEnd.columnNumber
      } else {
        insideLoop = true
      }
      break
    }
    case 'vertical': {
      // if it passed the checks, nothing else to do here
      insideLoop = true
      break
    }
    default:
      throw new Error(`Unknown loop type ${loopDetected.type}`)
  }

  return {
    loopDetected,
    parsedLoopStart,
    parsedLoopEnd,
    isInside: insideLoop
  }
}

function getCellElAndWrappers (referenceCellEl) {
  if (referenceCellEl?.nodeName !== 'c') {
    throw new Error('currentEl parameter must be a cell "c"')
  }

  const els = [referenceCellEl]
  const targets = ['previousSibling', 'nextSibling']
  let currentEl

  for (const target of targets) {
    currentEl = referenceCellEl

    while (currentEl[target] != null) {
      const isWrapper = (
        currentEl[target].nodeName === 'xlsxRemove' &&
        currentEl[target].textContent.startsWith(target === 'previousSibling' ? '{{#_D' : '{{/_D')
      )

      if (!isWrapper) {
        break
      }

      if (target === 'previousSibling') {
        els.unshift(currentEl[target])
      } else {
        els.push(currentEl[target])
      }

      currentEl = currentEl[target]
    }
  }

  return els
}

function getCellElsAndWrappersFrom (referenceCellEl, type = 'previous') {
  if (type !== 'previous' && type !== 'next') {
    throw new Error('type parameter must be previous or next')
  }

  const els = []
  let ready = false

  const target = type === 'previous' ? 'previousSibling' : 'nextSibling'
  let currentEl = referenceCellEl

  while (currentEl[target] != null) {
    if (!ready) {
      ready = (
        // if the node is not xlsxRemove then we are ready
        currentEl[target].nodeName !== 'xlsxRemove' ||
        // if it is xlsxRemove but it is not end point then we are ready
        !currentEl[target].textContent.startsWith(type === 'previous' ? '{{#_D' : '{{/_D')
      )
    }

    if (ready) {
      els.push(currentEl[target])
    }

    currentEl = currentEl[target]
  }

  return els
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

function checkAndGetLoopsToProcess (currentFile, loopsDetected, currentRowNumber, isLastRow) {
  const rowLoops = loopsDetected.filter((l) => l.type === 'row' && l.start.originalRowNumber === currentRowNumber)
  const invalidRowLoop = rowLoops.find((l) => l.end == null)

  if (invalidRowLoop != null) {
    throw new Error(`Unable to find end of loop (#each) in ${currentFile.path}. {{/each}} is missing`)
  }

  let blockLoops = loopsDetected.filter((l) => l.type === 'block')

  if (isLastRow) {
    const invalidBlockLoop = blockLoops.find((l) => l.end == null)

    if (invalidBlockLoop) {
      throw new Error(`Unable to find end of block loop (#each) in ${currentFile.path}. {{/each}} is missing`)
    }
  }

  blockLoops = blockLoops.filter((l) => l.end?.originalRowNumber === currentRowNumber)

  let verticalLoops = loopsDetected.filter((l) => l.type === 'vertical')

  if (isLastRow) {
    const invalidVerticalLoop = verticalLoops.find((l) => l.end == null)

    if (invalidVerticalLoop) {
      throw new Error(`Unable to find end of vertical loop (#each) in ${currentFile.path}. {{/each}} is missing`)
    }
  }

  verticalLoops = verticalLoops.filter((l) => l.end?.originalRowNumber === currentRowNumber)

  return [...rowLoops, ...blockLoops, ...verticalLoops]
}

function processOpeningTag (doc, refElement, helperCall) {
  const fakeElement = doc.createElement('xlsxRemove')
  fakeElement.textContent = helperCall
  refElement.parentNode.insertBefore(fakeElement, refElement)
  return fakeElement
}

function processClosingTag (doc, refElement, closeCall) {
  const fakeElement = doc.createElement('xlsxRemove')
  fakeElement.textContent = closeCall
  refElement.parentNode.insertBefore(fakeElement, refElement.nextSibling)
  return fakeElement
}

function jsSingleQuoteEscape (string) {
  return ('' + string).replace(/[']/g, function (character) {
    // Escape all characters not included in SingleStringCharacters and
    // DoubleStringCharacters on
    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
    switch (character) {
      case "'":
        return '\\' + character
    }
  })
}
