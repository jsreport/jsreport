const path = require('path')
const { createIdCollectionManager } = require('../../idManager')
const { createContentCollectionManager } = require('@jsreport/office')
const {
  nodeListToArray, isWorksheetFile, isWorksheetRelsFile,
  getSheetInfo, getCellInfo, getStyleInfo, getStyleFile,
  processOpeningTag, getDataHelperCall
} = require('../../../utils')
const { parseCellRef, getColumnFor, getPixelWidthOfValue, getFontSizeFromStyle, evaluateCellRefsFromExpression } = require('../../../cellUtils')
const generateDataTemplate = require('./generateDataTemplate')

module.exports = ({ files, sharedData, addEndCallback }) => {
  const workbookDoc = files.find((file) => file.path === 'xl/workbook.xml')?.doc
  const workbookRelsDoc = files.find((file) => file.path === 'xl/_rels/workbook.xml.rels')?.doc
  const sharedStringsDoc = files.find((f) => f.path === 'xl/sharedStrings.xml')?.doc
  const calcChainFilePath = 'xl/calcChain.xml'
  const calcChainDoc = files.find((f) => f.path === calcChainFilePath)?.doc
  const styleInfo = getStyleInfo(getStyleFile(files)?.doc)

  const workbookCalcPrEl = workbookDoc.getElementsByTagName('calcPr')[0]

  let workbookSheetsEls = []
  let workbookRelsEls = []
  let sharedStringsEls = []

  if (workbookDoc) {
    workbookSheetsEls = nodeListToArray(workbookDoc.getElementsByTagName('sheet'))
  }

  if (workbookRelsDoc != null) {
    workbookRelsEls = nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship'))
  }

  if (sharedStringsDoc != null) {
    sharedStringsEls = nodeListToArray(sharedStringsDoc.getElementsByTagName('si'))
  }

  let calcChainContentManagers

  if (calcChainDoc != null) {
    sharedData.calcChainFilePath = calcChainFilePath

    calcChainContentManagers = createContentCollectionManager()

    calcChainContentManagers.set('calcChain', {
      prepare: () => {
        const elements = Array.from(calcChainDoc.documentElement.childNodes)

        return {
          parts: {
            c: {
              type: 'instanceCollection',
              idAttrs: ['r', 'i']
            }
          },
          elements
        }
      }
    })

    sharedData.fileDataMap.set(calcChainFilePath, {
      contentManagers: calcChainContentManagers
    })
  }

  const openTagRegexp = /{/g
  const closeTagRegexp = /}/g

  for (const f of files.filter((f) => isWorksheetFile(f.path))) {
    const sheetContentManagers = createContentCollectionManager()
    const sheetFilepath = f.path
    const sheetFilename = path.posix.basename(sheetFilepath)
    const sheetDoc = f.doc

    const colsEl = sheetDoc.getElementsByTagName('cols')[0]

    const sheetInfo = getSheetInfo(sheetFilepath, workbookSheetsEls, workbookRelsEls)

    if (sheetInfo == null) {
      throw new Error(`Could not find sheet info for sheet at ${sheetFilepath}`)
    }

    const sheetRelsFile = files.find((file) => isWorksheetRelsFile(sheetFilename, file.path))
    const sheetRelsDoc = sheetRelsFile?.doc

    if (sheetRelsDoc) {
      const childrenEls = Array.from(sheetRelsDoc.documentElement.childNodes)

      const localIdManagers = createIdCollectionManager()
      const localContentManagers = createContentCollectionManager()

      localIdManagers.set('relationship', {
        prefix: 'rId',
        fromItems: {
          getIds: () => childrenEls.filter((el) => el.nodeName === 'Relationship').map((el) => el.getAttribute('Id')),
          getNumberId: (id) => {
            const regExp = /^rId(\d+)$/
            const match = regExp.exec(id)

            if (!match || !match[1]) {
              return null
            }

            return parseInt(match[1], 10)
          }
        }
      })

      localContentManagers.set('Relationships', {
        prepare: (ctx) => {
          ctx.data.lastElForPart = new Map()

          return {
            parts: {
              Relationship: {
                type: 'simpleCollection',
                idAttrs: ['Id']
              }
            },
            elements: childrenEls
          }
        },
        onInit: (elements, ctx) => {
          const relationshipEls = elements.filter((el) => el.nodeName === 'Relationship')

          ctx.data.lastElForPart.set('Relationship', relationshipEls.at(-1))

          if (relationshipEls.length === 0) {
            ctx.addSlot('Relationship')
          }
        },
        onElementPart: (el, ctx) => {
          if (ctx.data.lastElForPart.get(el.nodeName) === el) {
            ctx.addSlot(el.nodeName)
          }
        }
      })

      sharedData.fileDataMap.set(sheetRelsFile.path, {
        idManagers: localIdManagers,
        contentManagers: localContentManagers
      })
    }

    // looking for autofit comments in the sheet
    const autoFitConfigured = findAutoFitConfigured(sheetFilepath, sheetDoc, sheetRelsDoc, files)
    const isAutofitConfigured = autoFitConfigured.length > 0

    if (isAutofitConfigured) {
      sheetContentManagers.set('cols', {
        prepare: (ctx) => {
          const elements = Array.from(colsEl?.childNodes ?? [])

          ctx.data.lastElForPart = new Map()

          return {
            parts: {
              col: {
                type: 'simpleCollection',
                idAttrs: ['min', 'max']
              }
            },
            elements
          }
        },
        onInit: (elements, ctx) => {
          const colEls = elements.filter((el) => el.nodeName === 'col')

          ctx.data.lastElForPart.set('col', colEls.at(-1))

          if (colEls.length === 0) {
            ctx.addSlot('col')
          }
        },
        onElementPart: (el, ctx) => {
          if (ctx.data.lastElForPart.get(el.nodeName) === el) {
            ctx.addSlot(el.nodeName)
          }
        }
      })
    }

    const autoFitData = {
      enabledFor: [],
      cols: new Map()
    }

    // we expect the column to be 1 based
    autoFitData.enabledFor = autoFitConfigured.map((r) => getColumnFor(r.column + 1)[0])

    const mergeCellsEl = sheetDoc.getElementsByTagName('mergeCells')[0]
    // stores the merge cell ranges by the row number
    const mergeCellRangesByStartRowNumberMap = new Map()

    if (mergeCellsEl) {
      sheetContentManagers.set('mergeCells', {
        prepare: () => {
          const elements = Array.from(mergeCellsEl.childNodes)

          return {
            parts: {
              mergeCell: {
                type: 'instanceCollection',
                idAttrs: ['ref']
              }
            },
            elements
          }
        },
        onElementPart: (el) => {
          const ref = el.getAttribute('ref')
          const startCellRef = ref.split(':')[0]
          const parsedStartCellRef = parseCellRef(startCellRef)

          let refsByStartLetterMap = mergeCellRangesByStartRowNumberMap.get(parsedStartCellRef.rowNumber)

          if (refsByStartLetterMap == null) {
            refsByStartLetterMap = new Map()
            mergeCellRangesByStartRowNumberMap.set(parsedStartCellRef.rowNumber, refsByStartLetterMap)
          }

          refsByStartLetterMap.set(parsedStartCellRef.letter, ref)
        }
      })
    }

    const dimensionEl = sheetDoc.getElementsByTagName('dimension')[0]
    let parsedDimension

    // parse the initial dimension ref if exists
    if (dimensionEl?.hasAttribute('ref') && dimensionEl.getAttribute('ref') !== '') {
      const dimensionRef = dimensionEl.getAttribute('ref')
      const refsParts = dimensionRef.split(':')

      parsedDimension = { start: null, end: null }

      if (refsParts.length === 1) {
        const parsedPart = parseCellRef(refsParts[0])

        parsedDimension.start = {
          rowNumber: parsedPart.rowNumber,
          columnNumber: parsedPart.columnNumber
        }

        parsedDimension.end = {
          rowNumber: parsedPart.rowNumber,
          columnNumber: parsedPart.columnNumber
        }
      } else {
        const parsedPart = parseCellRef(refsParts[0])
        const parsedPart2 = parseCellRef(refsParts[1])

        parsedDimension.start = {
          rowNumber: parsedPart.rowNumber,
          columnNumber: parsedPart.columnNumber
        }

        parsedDimension.end = {
          rowNumber: parsedPart2.rowNumber,
          columnNumber: parsedPart2.columnNumber
        }
      }
    }

    const tableParts = []

    // check if there are tables, if there are we need to update its refs, and maybe its
    // columns names (if they are dynamic) at runtime
    const tablePartsEl = sheetDoc.getElementsByTagName('tableParts')[0]

    if (tablePartsEl?.childNodes.length > 0) {
      let tablePartEls = []

      sheetContentManagers.set('tableParts', {
        prepare: (ctx) => {
          const elements = Array.from(tablePartsEl.childNodes)

          ctx.data.lastElForPart = new Map()

          return {
            parts: {
              tablePart: {
                type: 'simpleCollection',
                idAttrs: ['r:id']
              }
            },
            elements
          }
        },
        onInit: (elements, ctx) => {
          tablePartEls = elements.filter((el) => el.nodeName === 'tablePart')

          ctx.data.lastElForPart.set('tablePart', tablePartEls.at(-1))

          if (tablePartEls.length === 0) {
            ctx.addSlot('tablePart')
          }
        },
        onElementPart: (el, ctx) => {
          if (ctx.data.lastElForPart.get(el.nodeName) === el) {
            ctx.addSlot(el.nodeName)
          }
        }
      })

      for (const tablePartEl of tablePartEls) {
        const tableRelId = tablePartEl.getAttribute('r:id')

        const tableRelTarget = Array.from(
          sheetRelsDoc.documentElement.childNodes
        ).find((n) => (
          n.nodeName === 'Relationship' && n.getAttribute('Id') === tableRelId
        ))?.getAttribute('Target')

        if (tableRelTarget == null) {
          throw new Error(`Could not find relationship target for table reference in sheet at ${sheetFilepath}`)
        }

        const tableFilePath = path.posix.join(path.posix.dirname(sheetFilepath), tableRelTarget)
        const tableDoc = files.find((file) => file.path === tableFilePath).doc

        if (tableDoc == null) {
          throw new Error(`Could not find table document referenced in sheet at ${sheetFilepath}`)
        }

        const targetRefSourceEls = [{ el: tableDoc.documentElement, origin: 'main' }]
        const autoFilterEl = Array.from(tableDoc.documentElement.childNodes).find((n) => n.nodeName === 'autoFilter')

        if (autoFilterEl != null) {
          targetRefSourceEls.push({ el: autoFilterEl, origin: 'autoFilter' })
        }

        const tablePartItem = {
          path: tableFilePath,
          baseRId: tableRelId,
          baseId: tableDoc.documentElement.getAttribute('id'),
          baseName: tableDoc.documentElement.getAttribute('name'),
          idVariableName: 'newId',
          nameVariableName: 'newName',
          mainRefParts: null,
          refsMeta: new Map(),
          dynamicColumnsMeta: new Map()
        }

        for (const { el: targetRefSourceEl, origin } of targetRefSourceEls) {
          const rangeRef = targetRefSourceEl.getAttribute('ref')
          const rangeParts = rangeRef.split(':')

          if (rangeParts.length !== 2) {
            throw new Error(`Unexpected range ref format "${rangeRef}" in table reference in sheet at ${sheetFilepath}`)
          }

          if (origin === 'main') {
            tablePartItem.mainRefParts = rangeParts
          }

          if (!tablePartItem.refsMeta.has(rangeRef)) {
            tablePartItem.refsMeta.set(rangeRef, {
              dataVariableName: `newTableRef${tablePartItem.refsMeta.size}`,
              targets: []
            })
          }

          const refMeta = tablePartItem.refsMeta.get(rangeRef)

          refMeta.targets.push({ type: origin, sourceEl: targetRefSourceEl })
        }

        const tableColumnsEl = Array.from(tableDoc.documentElement.childNodes).find((n) => n.nodeName === 'tableColumns')

        // check to see if there are column names that are dynamic and that need to be updated
        // later after the runtime evaluation of the handlebars template
        const targetDynamicColumnSourceEls = Array.from(tableColumnsEl.childNodes).reduce((acc, n, idx) => {
          if (n.nodeName === 'tableColumn' && n.getAttribute('name').includes('{{')) {
            acc.push({ columnIdx: idx, sourceEl: n })
          }
          return acc
        }, [])

        if (targetDynamicColumnSourceEls.length > 0) {
          const startRangePart = tablePartItem.mainRefParts[0]
          const parsedStartRangePart = parseCellRef(startRangePart)

          for (const { columnIdx, sourceEl: targetColumnSourceEl } of targetDynamicColumnSourceEls) {
            const [targetColumnLetter] = getColumnFor(
              parsedStartRangePart.columnNumber,
              columnIdx
            )

            const targetCellRef = `${targetColumnLetter}${parsedStartRangePart.rowNumber}`

            tablePartItem.dynamicColumnsMeta.set(targetCellRef, {
              dataVariableName: `newColumnRef${tablePartItem.dynamicColumnsMeta.size}`,
              sourceEl: targetColumnSourceEl
            })
          }
        }

        tableParts.push(tablePartItem)
      }
    }

    const sheetDataEl = sheetDoc.getElementsByTagName('sheetData')[0]

    if (sheetDataEl == null) {
      throw new Error(`Could not find sheet data for sheet at ${sheetFilepath}`)
    }

    // store information about the cells evaluated at runtime in handlebars,
    // in this preprocess part we only care to initialize the cells that are
    // used in formulas but that does not have a definition in xml
    const trackedCells = new Map()

    // stores information about the content of cells
    const parsedCells = new Map()

    const dynamicParts = {
      rows: new Map(),
      // NOTE: we are not using the .blocks for anything yet, BUT we can use it
      // to validate that there are not block calls outside of cells other than loops later
      blocks: [],
      openBlocks: [],
      loops: [],
      openLoops: []
    }

    // stores the cell refs that a row contains
    const cellRefsByRowMap = new Map()

    // store the cell refs that are part of a loop hierarchy but that do not have a
    // definition in the template, we need to track these refs to be able to
    // resolve the formulas correctly
    const nonExistingCellRefsByLoopHierarchy = new Map()

    // stores information about the range of elements that are either static or
    // are dynamic (contain handlebars tags)
    const dataRanges = []

    const formulasToValidate = []

    sheetContentManagers.set('sheetData', {
      prepare: () => {
        const elements = Array.from(sheetDataEl.childNodes ?? [])

        return {
          parts: {
            row: {
              type: 'instanceCollection',
              idAttrs: ['r'],
              parts: {
                c: {
                  type: 'instanceCollection',
                  idAttrs: ['r']
                }
              }
            }
          },
          elements
        }
      },
      onInit: (elements, ctx) => {
        ctx.data.lastRowEl = elements.filter((n) => n.nodeName === 'row').at(-1)
      },
      onElementPart: (el, ctx) => {
        if (el.nodeName === 'row') {
          const rowEl = el
          const isLastRow = ctx.data.lastRowEl === rowEl
          let rowNumber = el.getAttribute('r')

          if (rowNumber == null || rowNumber === '') {
            throw new Error('Expected row to contain r attribute defined')
          }

          rowNumber = parseInt(rowNumber, 10)

          if (mergeCellRangesByStartRowNumberMap.has(rowNumber)) {
            const mergeStartLetterMap = mergeCellRangesByStartRowNumberMap.get(rowNumber)
            ctx.baseItemData.mergeStartLetterMap = mergeStartLetterMap
          }

          ctx.data.row = {
            number: rowNumber,
            hasDynamicContent: false,
            isPartOfLoopDefinition: dynamicParts.openLoops.length > 0
          }

          if (!cellRefsByRowMap.has(rowNumber)) {
            cellRefsByRowMap.set(rowNumber, [])
          }

          for (const openLoop of dynamicParts.openLoops) {
            openLoop.rows.add(rowNumber)
          }

          ctx.addOnFinish(() => {
            const loopsToValidate = checkAndGetLoopsToProcess(f.path, dynamicParts.loops, rowNumber, isLastRow)

            for (const currentLoop of loopsToValidate) {
              if (currentLoop.type === 'dynamic') {
                const invalidLoop = dynamicParts.loops.find((loop) => {
                  // skip if it is the same
                  if (loop.hierarchyId === currentLoop.hierarchyId) {
                    return false
                  }

                  if (loop.type === 'vertical' || loop.type === 'dynamic') {
                    // we are fine detecting just one side
                    return (
                      loop.start.columnNumber === currentLoop.start.columnNumber &&
                      loop.start.rowNumber >= currentLoop.start.rowNumber &&
                      loop.start.rowNumber <= currentLoop.end.rowNumber
                    )
                  } else if (loop.type === 'row' || loop.type === 'block') {
                    // we are fine detecting just one side in the case of block loops
                    return (
                      loop.start.rowNumber >= currentLoop.start.rowNumber &&
                      loop.start.rowNumber <= currentLoop.end.rowNumber
                    )
                  }

                  return false
                })

                if (invalidLoop != null) {
                  if (invalidLoop.type === 'dynamic') {
                    throw new Error(`Dynamic cells can not have other dynamic cells defined in the same cell. Check Dynamic cell definition in ${f.path}, cell ${invalidLoop.start.cellRef}`)
                  } else {
                    throw new Error(`Dynamic cells can not be defined in rows that contain ${invalidLoop.type} loops. Check Dynamic cell definition in ${f.path}, cell ${invalidLoop.start.cellRef}`)
                  }
                }
              } else if (currentLoop.type === 'vertical') {
                if (currentLoop.start.columnNumber !== currentLoop.end.columnNumber) {
                  throw new Error(`Vertical loops must start {{#each}} and end {{/each}} in the same column. Check Vertical loop definition in ${f.path}, cell ${currentLoop.start.cellRef}, ${currentLoop.end.cellRef}`)
                }

                const invalidLoop = dynamicParts.loops.find((loop) => {
                  // skip if it is the same
                  if (loop.hierarchyId === currentLoop.hierarchyId) {
                    return false
                  }

                  if (loop.type === 'vertical' || loop.type === 'dynamic') {
                    // we are fine detecting just one side
                    return (
                      loop.start.columnNumber === currentLoop.start.columnNumber &&
                      loop.start.rowNumber >= currentLoop.start.rowNumber &&
                      loop.start.rowNumber <= currentLoop.end.rowNumber
                    )
                  } else if (loop.type === 'row' || loop.type === 'block') {
                    // we are fine detecting just one side in the case of block loops
                    return (
                      loop.start.rowNumber >= currentLoop.start.rowNumber &&
                      loop.start.rowNumber <= currentLoop.end.rowNumber
                    )
                  }

                  return false
                })

                if (invalidLoop != null) {
                  if (invalidLoop.type === 'vertical') {
                    throw new Error(`Vertical loops can not have child vertical loops. Check child vertical loop definition in ${f.path}, cell ${invalidLoop.start.cellRef}`)
                  } else {
                    throw new Error(`Vertical loops can not be defined in rows that contain ${invalidLoop.type} loops. Check Vertical loop definition in ${f.path}, cell ${invalidLoop.start.cellRef}`)
                  }
                }
              } else {
                if (currentLoop.type === 'row') {
                  const invalidLoop = dynamicParts.loops.find((loop) => {
                    if (loop.hierarchyId === currentLoop.hierarchyId) {
                      return false
                    }

                    if (loop.type === 'dynamic') {
                      // we are fine detecting just one side
                      return (
                        loop.start.columnNumber === currentLoop.start.columnNumber &&
                        loop.start.rowNumber >= currentLoop.start.rowNumber &&
                        loop.start.rowNumber <= currentLoop.end.rowNumber
                      )
                    }

                    return false
                  })

                  if (invalidLoop != null) {
                    if (invalidLoop.type === 'dynamic') {
                      throw new Error(`Row loops can not have child dynamic cells. Check child dynamic cell definition in ${f.path}, cell ${invalidLoop.start.cellRef}`)
                    }
                  }
                }
              }
            }

            const addToDynamicRange = ctx.data.row.hasDynamicContent || ctx.data.row.isPartOfLoopDefinition

            if (addToDynamicRange) {
              const dynamicRowEntry = { cellRefs: [...cellRefsByRowMap.get(rowNumber)] }
              dynamicParts.rows.set(rowNumber, dynamicRowEntry)
            }

            storeDataRange(dataRanges, addToDynamicRange ? 'dynamic' : 'static', rowNumber)
          })
        } else {
          const rowNumber = ctx.data.row.number
          const cellEl = el
          const cellRef = cellEl.getAttribute('r')
          const parsedCellRef = parseCellRef(cellRef)
          const cellMetadata = {}

          cellRefsByRowMap.get(rowNumber).push(cellRef)

          // search if we need to update some calc cell
          if (calcChainContentManagers?.get?.('calcChain')?.parts?.get?.('c')?.hasBase([cellRef, sheetInfo.id])) {
            cellMetadata.calcChainEntry = true
          }

          // check if the table needs some update related to table
          const matchedTablePart = tableParts.reduce((acc, t, tIdx) => {
            const rangeRef = Array.from(t.refsMeta.keys()).find((refRange) => refRange.split(':').some((ref) => ref === cellRef))
            const isPartOfDynamicColumnRef = t.dynamicColumnsMeta.has(cellRef)

            if (rangeRef != null || isPartOfDynamicColumnRef) {
              const result = {
                idx: tIdx
              }

              if (rangeRef != null) {
                result.ref = rangeRef
              }

              if (isPartOfDynamicColumnRef) {
                result.dynamicColumn = true
              }

              return result
            }

            return acc
          }, null)

          if (matchedTablePart) {
            cellMetadata.tablePart = matchedTablePart
          }

          const styleId = cellEl.getAttribute('s')

          if (isAutofitConfigured && styleId != null) {
            cellMetadata.styleId = styleId
          }

          const parsedCellEntry = {
            // start with the cell as static
            type: 'static',
            letter: parsedCellRef.letter,
            columnNumber: parsedCellRef.columnNumber
          }

          const info = getCellInfo(cellEl, sharedStringsEls, sheetFilepath)

          parsedCells.set(cellRef, parsedCellEntry)

          let blockPartFound = false
          let calculateWidthSize = isAutofitConfigured

          if (
            (info?.type === 'inlineStr' ||
            info?.type === 's')
          ) {
            const openTags = matchWithGlobalRegExp(info.value, openTagRegexp)
            const closingTags = matchWithGlobalRegExp(info.value, closeTagRegexp)

            if ((openTags.length > 0 && openTags.length !== closingTags.length)) {
              // incomplete handlebars tag detected in cell value, throw error
              throw new Error(`Handlebars Parse error in cell "${cellRef}" of sheet "${sheetInfo.name}". Invalid syntax detected for text: ${info.value}`)
            }

            if (openTags.length > 0) {
              // we dont calculate the width size for cells with dynamic content
              // we are going to take into account these cells at runtime
              calculateWidthSize = false

              parsedCellEntry.type = 'dynamic'
              parsedCellEntry.textDetails = info.extra.textDetails

              ctx.data.row.hasDynamicContent = true

              const handlebarsTag = /{{{{0,2}|}}}{0,2}/
              let remainingToCheck = info.value
              let lastProcessedIdx
              let lastCallPart

              do {
                const match = remainingToCheck.match(handlebarsTag)
                const currentLoopDetected = dynamicParts.openLoops[dynamicParts.openLoops.length - 1]

                if (match != null) {
                  const partType = match[0].startsWith('{{') ? 'start' : 'end'

                  if (lastProcessedIdx == null) {
                    // initialize variable on first match
                    lastProcessedIdx = 0
                  }

                  const lastPartIdx = match.index + match[0].length
                  const restOfStr = remainingToCheck.slice(match.index + match[0].length)
                  const nextCharacter = restOfStr[0] ?? ''

                  if (partType === 'start' && nextCharacter === '/') {
                    const block = getLastOpenBlock(dynamicParts)
                    dynamicParts.openBlocks.pop()

                    blockPartFound = true

                    lastCallPart = {
                      type: 'blockEnd',
                      bracketCount: match[0].length,
                      value: remainingToCheck.slice(match.index, match.index + match[0].length),
                      valueStartIdxInContent: lastProcessedIdx + match.index
                    }

                    block.parts.push({ cellRef })
                  } else if (partType === 'start' && nextCharacter === '#') {
                    blockPartFound = true

                    lastCallPart = {
                      type: 'blockStart',
                      bracketCount: match[0].length,
                      value: remainingToCheck.slice(match.index, match.index + match[0].length),
                      valueStartIdxInContent: lastProcessedIdx + match.index
                    }

                    const parentBlock = getLastOpenBlock(dynamicParts)

                    const newBlock = {
                      parts: [{ cellRef }],
                      children: []
                    }

                    let newBlockIdx

                    if (parentBlock) {
                      parentBlock.children.push(newBlock)
                      parentBlock.parts.push({ childrenIdx: parentBlock.children.length - 1 })
                      newBlockIdx = parentBlock.children.length - 1
                    } else {
                      dynamicParts.blocks.push(newBlock)
                      newBlockIdx = dynamicParts.blocks.length - 1
                    }

                    dynamicParts.openBlocks.push(newBlockIdx)
                  } else if (partType === 'start') {
                    lastCallPart = null
                  } else if (partType === 'end' && lastCallPart) {
                    if (lastCallPart.bracketCount !== match[0].length) {
                      throw new Error(`Handlebars Parse error in cell "${cellRef}" of sheet "${sheetInfo.name}". Mismatched handlebars brackets detected for text: ${info.value}`)
                    }

                    lastCallPart.value += remainingToCheck.slice(0, match.index + match[0].length)

                    let extractNameEvaluation

                    if (lastCallPart.type === 'blockStart') {
                      // skip handlebars tag and take into account the "#" character
                      extractNameEvaluation = {
                        text: lastCallPart.value.slice(lastCallPart.bracketCount + 1),
                        regExp: /[ }]/
                      }
                    } else if (lastCallPart.type === 'blockEnd') {
                      // skip handlebars tag and take into account the "/" character
                      extractNameEvaluation = {
                        text: lastCallPart.value.slice(lastCallPart.bracketCount + 1),
                        regExp: /}/
                      }
                    }

                    if (extractNameEvaluation) {
                      const toEvaluate = extractNameEvaluation.text
                      const endOfBlockNameMatch = toEvaluate.match(extractNameEvaluation.regExp)

                      if (endOfBlockNameMatch == null) {
                        throw new Error(`Handlebars Parse error in cell "${cellRef}" of sheet "${sheetInfo.name}". Invalid block helper syntax detected for text: ${info.value}`)
                      }

                      lastCallPart.name = toEvaluate.slice(0, endOfBlockNameMatch.index)
                    }

                    if (currentLoopDetected != null && lastCallPart.type === 'blockEnd' && lastCallPart.name === 'each') {
                      // if loop starts and end in same cell and it is not dynamic then
                      // we don't consider it a loop for our purposes
                      // (it is just a normal loop that creates strings not rows/cells)
                      if (
                        currentLoopDetected.type !== 'dynamic' &&
                        currentLoopDetected.start.cellRef === cellRef
                      ) {
                        // inline loop here, we just remove it
                        dynamicParts.loops.pop()
                        dynamicParts.openLoops.pop()
                      } else {
                        let targetLoopDetected = currentLoopDetected

                        if (targetLoopDetected.type === 'vertical') {
                          targetLoopDetected = null

                          for (let openLoopIdx = 0; openLoopIdx < dynamicParts.openLoops.length; openLoopIdx++) {
                            const openLoop = dynamicParts.openLoops[openLoopIdx]

                            if (openLoop.type === 'vertical' && parsedCellRef.columnNumber === openLoop.start.columnNumber) {
                              targetLoopDetected = openLoop
                              dynamicParts.openLoops.splice(openLoopIdx, 1)
                              break
                            }
                          }

                          if (!targetLoopDetected) {
                            throw new Error(`Unable to match start {{#each}} and end {{/each}} of vertical loop for multiple rows in ${f.path}. both start and end of loop must be on same column`)
                          }
                        } else {
                          dynamicParts.openLoops.pop()
                        }

                        targetLoopDetected.end = {
                          cellRef,
                          rowNumber,
                          columnNumber: parsedCellRef.columnNumber,
                          letter: parsedCellRef.letter,
                          helperCall: lastCallPart.value,
                          helperCallStartIdx: lastCallPart.valueStartIdxInContent
                        }

                        // add loop reference to start and end cells, we insert the ref
                        // on loop end to avoid adding inner loops
                        for (const currentCellEntry of [
                          parsedCells.get(targetLoopDetected.start.cellRef),
                          parsedCellEntry
                        ]) {
                          if (currentCellEntry.loops == null) {
                            currentCellEntry.loops = new Set()
                          }

                          // this stores references to loops that one of its parts
                          // are in the cell (either the call for the start or end of loop)
                          currentCellEntry.loops.add(targetLoopDetected)
                        }

                        if (
                          targetLoopDetected.type === 'block' &&
                          targetLoopDetected.end.rowNumber === targetLoopDetected.start.rowNumber
                        ) {
                          targetLoopDetected.type = 'row'
                        }
                      }
                    } else if (lastCallPart.type === 'blockStart' && lastCallPart.name === 'each') {
                      const isNested = currentLoopDetected != null && currentLoopDetected.type !== 'vertical'

                      const hierarchyIdPrefix = isNested ? `${currentLoopDetected.hierarchyId}#` : ''
                      const hierarchyIdCounter = isNested ? currentLoopDetected.children.length : dynamicParts.loops.length

                      const hierarchyId = `${hierarchyIdPrefix}${hierarchyIdCounter}`

                      ctx.data.row.isPartOfLoopDefinition = true

                      const newLoopItem = {
                        type: 'block',
                        hierarchyId,
                        // all the rows that are part between the start and end of the loop
                        rows: new Set([rowNumber]),
                        children: [],
                        start: {
                          cellRef,
                          rowNumber,
                          columnNumber: parsedCellRef.columnNumber,
                          letter: parsedCellRef.letter,
                          helperCall: lastCallPart.value,
                          helperCallStartIdx: lastCallPart.valueStartIdxInContent
                        }
                      }

                      if (isNested) {
                        currentLoopDetected.children.push(newLoopItem)
                      }

                      dynamicParts.loops.push(newLoopItem)
                      dynamicParts.openLoops.push(newLoopItem)

                      if (lastCallPart.value.includes('cells=')) {
                        newLoopItem.type = 'dynamic'
                      } else if (lastCallPart.value.includes('vertical=')) {
                        newLoopItem.type = 'vertical'
                      }
                    }

                    lastCallPart = null
                  }

                  lastProcessedIdx += lastPartIdx
                  remainingToCheck = restOfStr
                } else {
                  remainingToCheck = ''
                }
              } while (remainingToCheck !== '')
            }
          } else if (
            info?.type === 'str'
          ) {
            cellMetadata.formula = {
              value: info.value
            }

            if (info.extra.formulaEl.hasAttributes()) {
              cellMetadata.formula.attributes = new Map()

              const attributeList = Array.from(info.extra.formulaEl.attributes)

              for (const attr of attributeList) {
                cellMetadata.formula.attributes.set(attr.name, attr.value)
              }
            }

            const isSharedFormula = (
              info.extra.formulaEl.getAttribute('t') === 'shared' &&
              info.extra.formulaEl.getAttribute('si') != null &&
              info.extra.formulaEl.getAttribute('si') !== ''
            )

            if (isSharedFormula) {
              const ref = info.extra.formulaEl.getAttribute('ref')

              cellMetadata.formula.shared = {
                type: ref != null && ref !== '' ? 'source' : 'reference'
              }

              if (cellMetadata.formula.shared.type === 'source') {
                cellMetadata.formula.shared.sourceRef = info.extra.formulaEl.getAttribute('ref')
              }
            }

            const { cellRefs } = evaluateCellRefsFromExpression(cellMetadata.formula.value)

            // the cell refs used in formula
            cellMetadata.formula.cellRefs = cellRefs

            formulasToValidate.push(cellMetadata.formula)
          }

          if (calculateWidthSize) {
            const fontSize = getFontSizeFromStyle(styleId, styleInfo)

            const currentMaxSize = autoFitData.cols.get(parsedCellRef.letter)

            // for formulas we use the cached result of formula if exists
            const targetValue = info.type === 'str' ? info.extra.cachedValue : info.value

            if (targetValue != null) {
              const currentSize = getPixelWidthOfValue(targetValue, fontSize)

              if (currentMaxSize == null || currentSize > currentMaxSize) {
                autoFitData.cols.set(parsedCellRef.letter, currentSize)
              }
            }
          }

          if (!blockPartFound && dynamicParts.openBlocks.length > 0) {
            const lastHbOpenBlock = getLastOpenBlock(dynamicParts)
            lastHbOpenBlock.parts.push({ cellRef })
          }

          Object.assign(ctx.baseItemData, cellMetadata)
        }
      }
    })

    for (const formula of formulasToValidate) {
      for (const cellRefInfo of formula.cellRefs) {
        // we don't check formulas with references to other sheets
        if (cellRefInfo.parsed.sheetName != null) {
          continue
        }

        // we need to normalize to ignore the possible locked symbols ($)
        const normalizedCellRef = cellRefInfo.localRef
        const cellExists = parsedCells.has(normalizedCellRef)

        if (cellExists) {
          continue
        }

        const parsedNormalizedCellRef = parseCellRef(normalizedCellRef)

        const loopDetectionResult = getParentLoop(dynamicParts.loops, {
          rowNumber: parsedNormalizedCellRef.rowNumber,
          columnNumber: parsedNormalizedCellRef.columnNumber
        })

        const trackedCell = {
          first: normalizedCellRef,
          last: normalizedCellRef,
          count: 0
        }

        // initialize non existing cell ref used in formula
        trackedCells.set(normalizedCellRef, trackedCell)

        if (loopDetectionResult != null) {
          const loopHierarchyId = loopDetectionResult.loopDetected.hierarchyId
          let collection

          // store the non existing cell refs used in formulas that are
          // part of loops
          if (nonExistingCellRefsByLoopHierarchy.has(loopHierarchyId)) {
            collection = nonExistingCellRefsByLoopHierarchy.get(loopHierarchyId)
          } else {
            collection = []
            nonExistingCellRefsByLoopHierarchy.set(loopHierarchyId, collection)
          }

          collection.push(normalizedCellRef)

          // we set empty string here, just as a signal that this is going to be set
          // at runtime
          trackedCell.currentLoopId = ''
          trackedCell.fromNonExistingLoopHierarchyId = loopHierarchyId
        }
      }
    }

    if (dynamicParts.openLoops.length > 0) {
      const loopInfoCalls = dynamicParts.openLoops.map((l) => `- ${l.type} loop starting at cell ${l.start.cellRef}`)
      throw new Error(`Unable to find end of loop ({{/each}}) for the following loop calls in ${f.path}:\n${loopInfoCalls.join('\n')}`)
    }

    const dataTemplate = generateDataTemplate(
      dataRanges,
      dynamicParts,
      parsedCells,
      autoFitConfigured
    )

    sharedData.fileDataMap.set(f.path, {
      sheet: {
        id: sheetInfo.id,
        name: sheetInfo.name
      },
      relsPath: sheetRelsFile?.path,
      contentManagers: sheetContentManagers,
      dataVariables: {},
      dataRanges,
      tables: tableParts,
      dataTemplate,
      runtime: {
        style: {
          info: styleInfo,
          fontSizeCache: new Map()
        },
        dimension: parsedDimension,
        autoFit: autoFitData,
        loops: {
          data: [],
          evaluated: [],
          nonExistingCellRefsByLoopHierarchy
        },
        trackedCells,
        lazyFormulas: {
          lastSeq: null,
          pending: {
            notCompletedLoops: new Map(),
            cellsToFormulaIds: new Map()
          },
          data: new Map()
        },
        trackedTables: new Map()
      }
    })

    addEndCallback(() => {
      // set that this workbook should perform a full
      // recalculation when the workbook is opened
      if (workbookCalcPrEl) {
        workbookCalcPrEl.setAttribute('fullCalcOnLoad', '1')
      }

      // update dimension if needed
      if (dimensionEl) {
        dimensionEl.setAttribute('ref', '{{@newDimensionRef}}')
      }

      // replacing <mergeCells> with a helper call that will generate the final merge cells definitions
      if (mergeCellsEl) {
        const newMergeCellsEl = mergeCellsEl.cloneNode()
        newMergeCellsEl.setAttribute('count', '{{@newMergeCellsCount}}')

        const parentEl = mergeCellsEl.parentNode

        // fast way to remove children, iterating all children and using .removeChild is
        // very slow in big documents
        parentEl.replaceChild(newMergeCellsEl, mergeCellsEl)

        newMergeCellsEl.appendChild(
          processOpeningTag(sheetDoc, false, getDataHelperCall('renderContent', {
            name: 'mergeCells'
          }, { isBlock: false }))
        )
      }

      // update calcChainDoc if needed
      if (calcChainDoc) {
        // fast way to remove children, iterating all children and using .removeChild is
        // very slow in big documents
        calcChainDoc.replaceChild(
          calcChainDoc.documentElement.cloneNode(),
          calcChainDoc.documentElement
        )

        calcChainDoc.documentElement.appendChild(
          processOpeningTag(calcChainDoc, false, getDataHelperCall('renderContent', {
            name: 'calcChain'
          }, { isBlock: false }))
        )
      }

      // update sheet relationships
      if (sheetRelsFile) {
        // fast way to remove children, iterating all children and using .removeChild is
        // very slow in big documents
        sheetRelsFile.doc.replaceChild(
          sheetRelsFile.doc.documentElement.cloneNode(),
          sheetRelsFile.doc.documentElement
        )

        sheetRelsFile.doc.documentElement.appendChild(
          processOpeningTag(sheetRelsFile.doc, false, getDataHelperCall('renderContent', {
            name: 'Relationships'
          }, { isBlock: false }))
        )
      }

      // update tablePart in sheet
      if (tablePartsEl != null) {
        const newTablePartsEl = tablePartsEl.cloneNode()
        newTablePartsEl.setAttribute('count', '{{@newTablePartsCount}}')

        const parentEl = tablePartsEl.parentNode
        // fast way to remove children, iterating all children and using .removeChild is
        // very slow in big documents
        parentEl.replaceChild(newTablePartsEl, tablePartsEl)

        newTablePartsEl.appendChild(
          processOpeningTag(sheetDoc, false, getDataHelperCall('renderContent', {
            name: 'tableParts'
          }, { isBlock: false }))
        )
      }

      // update table document
      for (const tablePart of tableParts) {
        // make id and name dynamic, they will be based on the results of tables execution
        const tableDoc = files.find((f) => f.path === tablePart.path).doc

        tableDoc.documentElement.setAttribute('id', `{{@${tablePart.idVariableName}}}`)
        tableDoc.documentElement.setAttribute('name', `{{@${tablePart.nameVariableName}}}`)
        // according to spec the name and displayName should be in sync
        tableDoc.documentElement.setAttribute('displayName', `{{@${tablePart.nameVariableName}}}`)

        // update table refs if needed
        for (const tableRefsMeta of tablePart.refsMeta.values()) {
          for (const tableRefMetaTarget of tableRefsMeta.targets) {
            tableRefMetaTarget.sourceEl.setAttribute('ref', `{{@${tableRefsMeta.dataVariableName}}}`)
          }

          delete tableRefsMeta.targets
        }

        // update dynamic columns if needed
        for (const tableDynamicColumnMeta of tablePart.dynamicColumnsMeta.values()) {
          tableDynamicColumnMeta.sourceEl.setAttribute('name', `{{@${tableDynamicColumnMeta.dataVariableName}}}`)
          delete tableDynamicColumnMeta.sourceEl
        }
      }

      // if autofit is configured, we are going to customize the cols so
      // we need to wrap it in helper
      if (isAutofitConfigured) {
        let targetColsEl = colsEl

        // if there is no <cols> we initialize it
        if (targetColsEl == null) {
          targetColsEl = sheetDoc.createElement('cols')
          sheetDataEl.parentNode.insertBefore(targetColsEl, sheetDataEl)
        }

        if (targetColsEl.childNodes.length > 0) {
          const parentOfColsEl = targetColsEl.parentNode
          const newColsEl = targetColsEl.cloneNode()

          // fast way to remove children, iterating all children and using .removeChild is
          // very slow in big documents
          parentOfColsEl.replaceChild(
            newColsEl,
            targetColsEl
          )

          targetColsEl = newColsEl
        }

        targetColsEl.appendChild(
          processOpeningTag(sheetDoc, false, getDataHelperCall('renderContent', {
            name: 'cols'
          }, { isBlock: false }))
        )

        // remove {{xlsxColAutofit}} calls and remove comments and shapes from
        // their respective documents if needed
        for (const conf of autoFitConfigured) {
          const tEls = nodeListToArray(conf.commentEl.getElementsByTagName('t'))
          let shouldRemoveComment = false

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
          } else {
            // when comment is not going to be removed we remove just the helper call text
            // and if there is no more text in the element remove it
            const tCallEl = tEls.find((tEl) => tEl.textContent.startsWith('{{xlsxColAutofit'))
            tCallEl.textContent = tCallEl.textContent.replace(/{{xlsxColAutofit( [^}]*)?}}/, '')

            if (tCallEl.textContent === '') {
              tCallEl.parentNode.removeChild(tCallEl)
            }
          }
        }
      }

      const newSheetDataEl = sheetDataEl.cloneNode()

      // replacing sheetData with a helper call that will re-create the final row and cell tags
      newSheetDataEl.appendChild(
        processOpeningTag(sheetDoc, false, getDataHelperCall('renderContent', {
          name: 'sheetData'
        }, { isBlock: false }))
      )

      // fast way to remove children, iterating all children and using .removeChild is
      // very slow in big documents
      sheetDataEl.parentNode.replaceChild(
        newSheetDataEl,
        sheetDataEl
      )
    })
  }
}

function getParentLoop (loopsDetected, cellNumbers) {
  let loopDetected

  // we check here if there is a loop that start/end in the same row of cell
  // (this does not necessarily mean that cell is part of the loop)
  for (let index = loopsDetected.length - 1; index >= 0; index--) {
    const l = loopsDetected[index]
    let match = false

    switch (l.type) {
      case 'row':
      case 'dynamic':
        match = l.start.rowNumber === cellNumbers.rowNumber
        break
      case 'block':
        match = (
          cellNumbers.rowNumber >= l.start.rowNumber &&
          cellNumbers.rowNumber <= l.end.rowNumber
        )
        break
      case 'vertical':
        match = (
          cellNumbers.rowNumber >= l.start.rowNumber &&
          cellNumbers.rowNumber <= l.end.rowNumber &&
          cellNumbers.columnNumber === l.start.columnNumber
        )
        break
      default:
        throw new Error(`Unknown loop type ${l.type}`)
    }

    if (match) {
      loopDetected = l
      break
    }
  }

  if (loopDetected == null) {
    return
  }

  const loopStart = loopDetected.start
  const loopEnd = loopDetected.end
  let insideLoop = false

  // here we check if the cell is really part of the loop or not
  switch (loopDetected.type) {
    case 'row':
    case 'dynamic': {
      insideLoop = (
        cellNumbers.columnNumber >= loopStart.columnNumber &&
        cellNumbers.columnNumber <= loopEnd.columnNumber
      )
      break
    }
    case 'block': {
      if (loopStart.rowNumber === cellNumbers.rowNumber) {
        insideLoop = cellNumbers.columnNumber >= loopStart.columnNumber
      } else if (loopEnd.rowNumber === cellNumbers.rowNumber) {
        insideLoop = cellNumbers.columnNumber <= loopEnd.columnNumber
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
    isInside: insideLoop
  }
}

function checkAndGetLoopsToProcess (currentFilePath, loopsDetected, currentRowNumber, isLastRow) {
  const dynamicLoops = loopsDetected.filter((l) => l.type === 'dynamic' && l.start.rowNumber === currentRowNumber)
  const invalidDynamicLoops = dynamicLoops.find((l) => l.end == null)

  if (invalidDynamicLoops != null) {
    throw new Error(`Unable to find end of dynamic loop (#each) in ${currentFilePath}. {{/each}} is missing`)
  }

  const rowLoops = loopsDetected.filter((l) => l.type === 'row' && l.start.rowNumber === currentRowNumber)
  const invalidRowLoop = rowLoops.find((l) => l.end == null)

  if (invalidRowLoop != null) {
    throw new Error(`Unable to find end of loop (#each) in ${currentFilePath}. {{/each}} is missing`)
  }

  let blockLoops = loopsDetected.filter((l) => l.type === 'block')

  if (isLastRow) {
    const invalidBlockLoop = blockLoops.find((l) => l.end == null)

    if (invalidBlockLoop) {
      throw new Error(`Unable to find end of block loop (#each) in ${currentFilePath}. {{/each}} is missing`)
    }
  }

  blockLoops = blockLoops.filter((l) => l.end?.rowNumber === currentRowNumber)

  let verticalLoops = loopsDetected.filter((l) => l.type === 'vertical')

  if (isLastRow) {
    const invalidVerticalLoop = verticalLoops.find((l) => l.end == null)

    if (invalidVerticalLoop) {
      throw new Error(`Unable to find end of vertical loop (#each) in ${currentFilePath}. {{/each}} is missing`)
    }
  }

  verticalLoops = verticalLoops.filter((l) => l.end?.rowNumber === currentRowNumber)

  return [...dynamicLoops, ...rowLoops, ...blockLoops, ...verticalLoops]
}

function matchWithGlobalRegExp (str, regexp) {
  // reset state of global regexp
  regexp.lastIndex = 0

  const a = []
  let m

  // eslint-disable-next-line no-cond-assign
  while (m = regexp.exec(str)) {
    a.push({
      index: m.index,
      offset: regexp.lastIndex
    })
  }

  // reset state of global regexp
  regexp.lastIndex = 0

  return a
}

function storeDataRange (dataRanges, type, rowNumber) {
  let lastRange = dataRanges[dataRanges.length - 1]

  if (lastRange == null || lastRange.type !== type) {
    lastRange = {
      type,
      items: new Set()
    }

    dataRanges.push(lastRange)
  }

  lastRange.items.add(rowNumber)
}

function getLastOpenBlock (dynamicParts) {
  let container = dynamicParts.blocks
  let lastBlock

  for (const blockIdx of dynamicParts.openBlocks) {
    lastBlock = container[blockIdx]
    container = lastBlock.children
  }

  return lastBlock
}

function findAutoFitConfigured (sheetFilepath, sheetDoc, sheetRelsDoc, files) {
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

      // we expect the column to be 1 based
      const expectedRef = `${getColumnFor(columnIdx + 1)[0]}${rowIdx + 1}`

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
