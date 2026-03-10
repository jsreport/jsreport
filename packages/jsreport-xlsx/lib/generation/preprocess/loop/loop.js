const path = require('path')
const { nodeListToArray, isWorksheetFile, isWorksheetRelsFile, getSheetInfo, getCellInfo, getDataHelperCall, getStyleFile, getStyleInfo } = require('../../../utils')
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

  const calcChainRefElementIdxMap = new Map()

  if (calcChainDoc != null) {
    sharedData.calcChainFilePath = calcChainFilePath

    const templateItems = createTemplateItems()

    for (const calcChainChildEl of Array.from(calcChainDoc.documentElement.childNodes)) {
      storeElement(
        templateItems.data, calcChainChildEl, {
          defaults: calcChainChildEl.nodeName === 'c' ? null : { type: calcChainChildEl.nodeName },
          idProp: calcChainChildEl.nodeName === 'c' ? 'r' : null,
          // we store the "r" attribute but just as empty, we just care to keep its
          // position in attribute list
          emptyAttrs: calcChainChildEl.nodeName === 'c' ? ['r'] : []
        },
        calcChainChildEl.nodeName, templateItems.elementTypeAttributesMap
      )

      if (calcChainChildEl.nodeName === 'c') {
        calcChainRefElementIdxMap.set(
          `${calcChainChildEl.getAttribute('i')}-${calcChainChildEl.getAttribute('r')}`,
          templateItems.data.length - 1
        )
      }
    }

    // simplify the elements attribute data structure
    for (const [elementType, elementAttributes] of templateItems.elementTypeAttributesMap) {
      templateItems.elementTypeAttributesMap.set(elementType, elementAttributes.data)
    }

    sharedData.fileDataMap.set(calcChainFilePath, {
      templateItems,
      dataItems: []
    })
  }

  const openTagRegexp = /{/g
  const closeTagRegexp = /}/g

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
    const sheetDataChildEls = Array.from(sheetDataEl.childNodes)
    const lastRowIdx = sheetDataChildEls.filter((n) => n.nodeName === 'row').length - 1

    // looking for autofit comments in the sheet
    const autoFitConfigured = findAutoFitConfigured(sheetFilepath, sheetDoc, sheetRelsDoc, files)
    const isAutofitConfigured = autoFitConfigured.length > 0

    const autoFitData = {
      enabledFor: [],
      cols: new Map()
    }

    // we expect the column to be 1 based
    autoFitData.enabledFor = autoFitConfigured.map((r) => getColumnFor(r.column + 1)[0])

    const mergeCellsEl = sheetDoc.getElementsByTagName('mergeCells')[0]
    // stores the merge cell ranges by the row number
    const mergeCellRangesByStartRowNumberMap = new Map()

    for (const [mergeCellIdx, mergeCellEl] of Array.from(mergeCellsEl?.getElementsByTagName('mergeCell') ?? []).entries()) {
      const ref = mergeCellEl.getAttribute('ref')
      const startCellRef = ref.split(':')[0]
      const parsedStartCellRef = parseCellRef(startCellRef)

      let refsByStartLetterMap = mergeCellRangesByStartRowNumberMap.get(parsedStartCellRef.rowNumber)

      if (refsByStartLetterMap == null) {
        refsByStartLetterMap = new Map()
        mergeCellRangesByStartRowNumberMap.set(parsedStartCellRef.rowNumber, refsByStartLetterMap)
      }

      refsByStartLetterMap.set(parsedStartCellRef.letter, { idx: mergeCellIdx, ref })
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

    const tableParts = {
      filePaths: [],
      refsMeta: new Map(),
      refByCellRefs: new Map(),
      refSourceEls: []
    }

    // check if there are tables, if there are we need to update its refs at runtime
    const tablePartsEl = sheetDoc.getElementsByTagName('tableParts')[0]

    if (tablePartsEl != null) {
      const tablePartEls = Array.from(tablePartsEl.childNodes).filter((n) => n.nodeName === 'tablePart')
      const relationshipEls = Array.from(sheetRelsDoc.getElementsByTagName('Relationship'))

      for (const tablePartEl of tablePartEls) {
        const tableRelId = tablePartEl.getAttribute('r:id')

        const tableRelEl = relationshipEls.find((rel) => (
          rel.getAttribute('Id') === tableRelId &&
          rel.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/table'
        ))

        if (tableRelEl == null) {
          throw new Error(`Could not find relationship element for table reference in sheet at ${sheetFilepath}`)
        }

        const tableFilePath = path.posix.join(path.posix.dirname(sheetFilepath), tableRelEl.getAttribute('Target'))
        const tableDoc = files.find((file) => file.path === tableFilePath).doc

        if (tableDoc == null) {
          throw new Error(`Could not find table document referenced in sheet at ${sheetFilepath}`)
        }

        const targetRefSourceEls = [tableDoc.documentElement]
        const autoFilterEl = Array.from(tableDoc.documentElement.childNodes).find((n) => n.nodeName === 'autoFilter')

        if (autoFilterEl != null) {
          targetRefSourceEls.push(autoFilterEl)
        }

        tableParts.filePaths.push(tableFilePath)

        for (const targetRefSourceEl of targetRefSourceEls) {
          const rangeRef = targetRefSourceEl.getAttribute('ref')
          const rangeParts = rangeRef.split(':')

          if (rangeParts.length !== 2) {
            throw new Error(`Unexpected range ref format "${rangeRef}" in table reference in sheet at ${sheetFilepath}`)
          }

          let refMeta = tableParts.refsMeta.get(rangeRef)

          if (refMeta == null) {
            refMeta = {}

            tableParts.refsMeta.set(rangeRef, refMeta)

            refMeta.tableFilePathIdx = tableParts.filePaths.length - 1
            refMeta.dataVariableName = `newTableRef${tableParts.refsMeta.size - 1}`

            tableParts.refByCellRefs.set(rangeParts[0], rangeRef)
            tableParts.refByCellRefs.set(rangeParts[1], rangeRef)
          }

          tableParts.refSourceEls.push(targetRefSourceEl)
        }

        sharedData.fileDataMap.set(tableFilePath, {
          // initialize container, it is going to be fill at handlebars runtime
          dataVariables: {}
        })
      }
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

    // stores information about the row elements of the template sheet (xml nodes),
    // it saves attributes (with optimization for duplicated values), children
    // nodes (just cells), and extra metadata that is going to be needed to recreate the nodes
    // during xml template generation. these elements are the base data that is going to
    // be used for elements that are generated dynamically as result of handlebars evaluation
    const templateItems = createTemplateItems()

    // a map to easily get the index of row elements in the templateItems elements
    // by its row number
    templateItems.rowNumberElementIdxMap = new Map()

    const formulasToValidate = []
    let rowIdx = -1

    for (const sheetDataChildEl of sheetDataChildEls) {
      if (sheetDataChildEl.nodeName !== 'row') {
        // NOTE: for now we ignore non row elements inside sheetData
        // (according to spec there is not more elements supported on sheetData other than row),
        // if needed we can add code to replicate those elements
        // storeElement(templateItems.data, sheetDataChildEl, {
        //   defaults: { type: sheetDataChildEl.nodeName }
        // }, sheetDataChildEl.nodeName, templateItems.elementTypeAttributesMap)

        // storeDataRange(dataRanges, dynamicParts.openBlocks.length > 0 ? 'dynamic' : 'static', templateItems.data.length - 1)
        continue
      }

      const rowEl = sheetDataChildEl
      rowIdx++
      const isLastRow = rowIdx === lastRowIdx
      let rowNumber = rowEl.getAttribute('r')

      if (rowNumber == null || rowNumber === '') {
        throw new Error('Expected row to contain r attribute defined')
      }

      rowNumber = parseInt(rowNumber, 10)

      const rowElementItem = storeElement(templateItems.data, rowEl, {
        idProp: {
          name: 'r',
          value: () => rowNumber
        },
        // we store the "r" attribute but just as empty, we just care to keep its
        // position in attribute list
        emptyAttrs: ['r'],
        excludeChildren: true
      }, 'row', templateItems.elementTypeAttributesMap)

      const rowElementIdx = templateItems.data.length - 1

      templateItems.elementMetaMap.set(rowElementItem, {
        columnLetterChildrenMap: new Map()
      })

      if (mergeCellRangesByStartRowNumberMap.has(rowNumber)) {
        const mergeStartLetterMap = mergeCellRangesByStartRowNumberMap.get(rowNumber)
        templateItems.elementMetaMap.get(rowElementItem).mergeStartLetterMap = mergeStartLetterMap
      }

      templateItems.rowNumberElementIdxMap.set(rowNumber, rowElementIdx)

      let rowHasDynamicContent = false
      let rowIsPartOfLoopDefinition = dynamicParts.openLoops.length > 0
      const rowChildEls = nodeListToArray(rowEl.childNodes)

      if (!cellRefsByRowMap.has(rowNumber)) {
        cellRefsByRowMap.set(rowNumber, [])
      }

      for (const openLoop of dynamicParts.openLoops) {
        openLoop.rows.add(rowNumber)
      }

      for (const rowChildEl of rowChildEls) {
        if (rowElementItem.children == null) {
          rowElementItem.children = []
        }

        if (rowChildEl.nodeName !== 'c') {
          // NOTE: for now we ignore non c elements inside row
          // (according to spec the allowed children of a row are: c, extLst),
          // if needed we can add code to replicate those elements
          // storeElement(rowElementItem.children, rowChildEl, {
          //   defaults: { type: rowChildEl.nodeName }
          // }, rowChildEl.nodeName, templateItems.elementTypeAttributesMap)
          continue
        }

        const cellEl = rowChildEl
        const cellRef = cellEl.getAttribute('r')
        const parsedCellRef = parseCellRef(cellRef)
        const cellMetadata = {}

        cellRefsByRowMap.get(rowNumber).push(cellRef)

        // search if we need to update some calc cell
        const calcChainElementIdx = calcChainRefElementIdxMap.get(`${sheetInfo.id}-${cellRef}`)

        if (calcChainElementIdx != null) {
          cellMetadata.calcChainElementIdx = calcChainElementIdx
        }

        // search if we need to update table ref
        const tableRef = tableParts.refByCellRefs.get(cellRef)

        if (tableRef != null) {
          cellMetadata.tableRef = tableRef
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
        let excludeCellItemChildren = false
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

            rowHasDynamicContent = true

            // for these cells we dont store the children as static
            // because we will do content detection at runtime and determine
            // the cell content there
            excludeCellItemChildren = true

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

                    rowIsPartOfLoopDefinition = true

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

        const cellElementItem = storeElement(rowElementItem.children, cellEl, {
          // we store the "r" attribute but just as empty, we just care to keep its
          // position in attribute list
          emptyAttrs: ['r'],
          excludeChildren: excludeCellItemChildren
        }, 'c', templateItems.elementTypeAttributesMap)

        if (Object.keys(cellMetadata).length > 0) {
          templateItems.elementMetaMap.set(cellElementItem, cellMetadata)
        }

        templateItems.elementMetaMap.get(rowElementItem).columnLetterChildrenMap.set(
          parsedCellRef.letter,
          rowElementItem.children.length - 1
        )
      }

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

      const addToDynamicRange = rowHasDynamicContent || rowIsPartOfLoopDefinition

      if (addToDynamicRange) {
        const dynamicRowEntry = { cellRefs: [...cellRefsByRowMap.get(rowNumber)] }
        dynamicParts.rows.set(rowNumber, dynamicRowEntry)
      }

      storeDataRange(dataRanges, addToDynamicRange ? 'dynamic' : 'static', templateItems.data.length - 1)
    }

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

    // simplify the elements attribute data structure
    for (const [elementType, elementAttributes] of templateItems.elementTypeAttributesMap) {
      templateItems.elementTypeAttributesMap.set(elementType, elementAttributes.data)
    }

    const dataTemplate = generateDataTemplate(
      dataRanges,
      templateItems,
      dynamicParts,
      parsedCells,
      autoFitConfigured
    )

    sharedData.fileDataMap.set(f.path, {
      sheet: {
        id: sheetInfo.id,
        name: sheetInfo.name
      },
      dataTemplate,
      templateItems,
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
        tables: tableParts
      },
      mergeCellItems: [],
      dataItems: []
    })

    // if (f.path === 'xl/worksheets/sheet1.xml') {
    //   debugger
    // }

    addEndCallback(() => {
      // set that this workbook should perform a full
      // recalculation when the workbook is opened
      if (workbookCalcPrEl) {
        workbookCalcPrEl.setAttribute('fullCalcOnLoad', '1')
      }

      // update dimension if needed
      if (dimensionEl) {
        dimensionEl.setAttribute('ref', getDataHelperCall('dimension', null, { isBlock: false }))
      }

      // replacing <mergeCells> with a helper call that will generate the final merge cells definitions
      if (mergeCellsEl) {
        mergeCellsEl.parentNode.replaceChild(
          processOpeningTag(
            sheetDoc,
            false,
            getDataHelperCall('mergeCells', null, { isBlock: false })
          ),
          mergeCellsEl
        )
      }

      // update calcChainDoc if needed
      if (calcChainDoc) {
        const cloneWithoutChildren = calcChainDoc.documentElement.cloneNode()

        // fast way to remove children, iterating all children and using .removeChild is
        // very slow in big documents
        calcChainDoc.replaceChild(cloneWithoutChildren, calcChainDoc.documentElement)

        calcChainDoc.documentElement.appendChild(
          processOpeningTag(
            calcChainDoc,
            false,
            getDataHelperCall('calcChain', null, { isBlock: false })
          )
        )
      }

      // update table refs if needed
      if (tableParts.refSourceEls.length > 0) {
        for (const refSourceEl of tableParts.refSourceEls) {
          const rangeRef = refSourceEl.getAttribute('ref')
          const refMeta = tableParts.refsMeta.get(rangeRef)
          refSourceEl.setAttribute('ref', `{{@${refMeta.dataVariableName}}}`)
        }

        delete tableParts.refByCellRefs

        // remove dom references
        delete tableParts.refSourceEls
      }

      // if autofit is configured, we are going to customize the cols so
      // we need to wrap it in helper
      if (isAutofitConfigured) {
        // if there is no <cols> we initialize it
        if (colsEl == null) {
          colsEl = sheetDoc.createElement('cols')
          sheetDataEl.parentNode.insertBefore(colsEl, sheetDataEl)
        }

        processOpeningTag(sheetDoc, colsEl, getDataHelperCall('cols'))
        processClosingTag(sheetDoc, colsEl, '{{/_D}}')

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

      // replacing sheetData with a helper call that will re-create the final row and cell tags
      sheetDataEl.parentNode.replaceChild(
        processOpeningTag(
          sheetDoc,
          false,
          getDataHelperCall('sd', null, { isBlock: false })
        ),
        sheetDataEl
      )
    })
  }
}

function createTemplateItems () {
  const templateItems = {
    data: [],
    // the idea is that on this map we can store metadata for any element on the template
    // (even children elements)
    elementMetaMap: new WeakMap(),
    elementTypeAttributesMap: new Map()
  }

  return templateItems
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

function processOpeningTag (doc, refElement, helperCall) {
  const fakeElement = doc.createElement('xlsxRemove')
  fakeElement.textContent = helperCall

  if (refElement !== false) {
    refElement.parentNode.insertBefore(fakeElement, refElement)
  }

  return fakeElement
}

function processClosingTag (doc, refElement, closeCall) {
  const fakeElement = doc.createElement('xlsxRemove')
  fakeElement.textContent = closeCall

  if (refElement !== false) {
    refElement.parentNode.insertBefore(fakeElement, refElement.nextSibling)
  }

  return fakeElement
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

function storeDataRange (dataRanges, type, idx) {
  let lastRange = dataRanges[dataRanges.length - 1]

  if (lastRange == null || lastRange.type !== type) {
    lastRange = {
      type,
      start: idx
    }

    dataRanges.push(lastRange)
  }

  lastRange.end = idx
}

function storeElement (elements, baseElement, baseMeta, baseElementType, elementTypeAttributes) {
  const pending = [{ container: elements, type: baseElementType, meta: baseMeta, element: baseElement }]
  let baseNewElement

  while (pending.length > 0) {
    const { container, type, meta, element } = pending.shift()

    const newElement = processElement(container, element, meta, type, elementTypeAttributes)

    if (baseNewElement == null) {
      baseNewElement = newElement
    }

    const excludeChildren = meta?.excludeChildren ?? false

    if (excludeChildren) {
      continue
    }

    const childEls = nodeListToArray(element.childNodes ?? []).filter((node) => {
      // we only care about element, text and comment nodes
      return node.nodeType === 1 || node.nodeType === 3 || node.nodeType === 8
    })

    if (childEls.length > 0) {
      newElement.children = []

      pending.unshift(...childEls.map((childEl) => ({
        container: newElement.children,
        type: childEl.nodeName,
        meta: {
          defaults: { type: childEl.nodeName }
        },
        element: childEl
      })))
    }
  }

  return baseNewElement
}

function processElement (elements, element, meta, elementType, elementTypeAttributes) {
  const newElementDefaults = meta?.defaults || {}
  const excludeAttrs = meta?.excludeAttrs || []
  const emptyAttrs = meta?.emptyAttrs || []

  const elementMetadata = {
    ...newElementDefaults
  }

  elements.push(elementMetadata)

  if (elementType === '#text' || elementType === '#comment') {
    elementMetadata.value = element.nodeValue
  }

  let idPropName
  let getIdPropValue

  if (meta.idProp) {
    if (typeof meta.idProp === 'string') {
      idPropName = meta.idProp
      getIdPropValue = (_value) => _value
    } else {
      idPropName = meta.idProp.name
      getIdPropValue = meta.idProp.value
    }
  }

  const attributesList = nodeListToArray(element.attributes ?? [])

  for (const attr of attributesList) {
    if (idPropName === attr.name) {
      elementMetadata.id = getIdPropValue(attr.value)
    }

    if (excludeAttrs.includes(attr.name)) {
      continue
    }

    if (elementMetadata.attributes == null) {
      elementMetadata.attributes = new Map()
    }

    let elementAttributes = elementTypeAttributes.get(elementType)

    if (elementAttributes == null) {
      elementAttributes = {
        nameIndexMap: new Map(),
        data: []
      }

      elementTypeAttributes.set(elementType, elementAttributes)
    }

    const attributeIndexes = []
    let [attributeNameIdx, valueIndexMap] = elementAttributes.nameIndexMap.get(attr.name) ?? []
    let attributeValues

    if (attributeNameIdx == null) {
      attributeNameIdx = elementAttributes.data.length
      attributeValues = []
      valueIndexMap = new Map()
      elementAttributes.nameIndexMap.set(attr.name, [attributeNameIdx, valueIndexMap])
      elementAttributes.data.push([attr.name, attributeValues])
    } else {
      attributeValues = elementAttributes.data[attributeNameIdx][1]
    }

    attributeIndexes.push(attributeNameIdx)

    let valueIdx = valueIndexMap.get(emptyAttrs.includes(attr.name) ? '' : attr.value)

    if (valueIdx == null) {
      valueIdx = attributeValues.length
      valueIndexMap.set(attr.value, valueIdx)
      attributeValues.push(attr.value)
    }

    attributeIndexes.push(valueIdx)

    elementMetadata.attributes.set(attributeIndexes[0], attributeIndexes[1])
  }

  return elementMetadata
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
