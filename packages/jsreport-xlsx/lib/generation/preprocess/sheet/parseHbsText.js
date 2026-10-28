const { getLogicBlockKind, getLogicBlock, getOpenLogicBlocks, getLastOpenLogicBlock } = require('./logicBlocks')

const openTagRegexp = /{/g
const closeTagRegexp = /}/g

module.exports = function parseHbsText (sheetInfo, parsedCells, dynamicParts, parsedCellRef, cellInfo) {
  const cellRef = `${parsedCellRef.letter}${parsedCellRef.rowNumber}`
  const openTags = matchWithGlobalRegExp(cellInfo.value, openTagRegexp)
  const closingTags = matchWithGlobalRegExp(cellInfo.value, closeTagRegexp)

  if ((openTags.length > 0 && openTags.length !== closingTags.length)) {
    // incomplete handlebars tag detected in cell value, throw error
    throw new Error(`Handlebars Parse error in cell "${cellRef}" of sheet "${sheetInfo.name}". Invalid syntax detected for text: ${cellInfo.value}`)
  }

  // all the hbs parts (blocks, expressions, etc) found while parsing the cell
  const output = []

  if (openTags.length === 0) {
    return output
  }

  const handlebarsTag = /{{{{0,2}|}}}{0,2}/
  let remainingToCheck = cellInfo.value
  let lastProcessedIdx
  let lastCallPart

  do {
    const match = remainingToCheck.match(handlebarsTag)
    const currentLoopDetected = getLastOpenLogicBlock(dynamicParts, 'loop')

    if (match == null) {
      remainingToCheck = ''
      continue
    }

    const partType = match[0].startsWith('{{') ? 'start' : 'end'

    if (lastProcessedIdx == null) {
      // initialize variable on first match
      lastProcessedIdx = 0
    }

    const lastPartIdx = match.index + match[0].length
    const restOfStr = remainingToCheck.slice(match.index + match[0].length)
    const nextCharacter = restOfStr[0] ?? ''

    if (partType === 'start' && nextCharacter === '/') {
      lastCallPart = {
        type: 'blockEnd',
        bracketCount: match[0].length,
        value: remainingToCheck.slice(match.index, match.index + match[0].length),
        valueStartIdxInContent: lastProcessedIdx + match.index
      }
    } else if (partType === 'start' && nextCharacter === '#') {
      lastCallPart = {
        type: 'blockStart',
        bracketCount: match[0].length,
        value: remainingToCheck.slice(match.index, match.index + match[0].length),
        valueStartIdxInContent: lastProcessedIdx + match.index
      }
    } else if (partType === 'start') {
      lastCallPart = {
        type: 'expression',
        bracketCount: match[0].length,
        value: remainingToCheck.slice(match.index, match.index + match[0].length),
        valueStartIdxInContent: lastProcessedIdx + match.index
      }
    } else if (partType === 'end' && lastCallPart) {
      if (lastCallPart.bracketCount !== match[0].length) {
        throw new Error(`Handlebars Parse error in cell "${cellRef}" of sheet "${sheetInfo.name}". Mismatched handlebars brackets detected for text: ${cellInfo.value}`)
      }

      lastCallPart.value += remainingToCheck.slice(0, match.index + match[0].length)

      if (lastCallPart.type === 'expression' && /^{{\s*else(\s+[^}]*?)?\s*}}$/.test(lastCallPart.value)) {
        lastCallPart.type = 'else'
      }

      let extractNameEvaluation

      if (lastCallPart.type === 'blockStart') {
        // skip starting handlebars tag and after the "#" character
        extractNameEvaluation = {
          text: lastCallPart.value.slice(lastCallPart.bracketCount + 1),
          regExp: /[ }]/
        }
      } else if (lastCallPart.type === 'blockEnd') {
        // skip starting handlebars tag and and after the "/" character
        extractNameEvaluation = {
          text: lastCallPart.value.slice(lastCallPart.bracketCount + 1),
          regExp: /}/
        }
      }

      if (extractNameEvaluation) {
        const toEvaluate = extractNameEvaluation.text
        const endOfBlockNameMatch = toEvaluate.match(extractNameEvaluation.regExp)

        if (endOfBlockNameMatch == null) {
          throw new Error(`Handlebars Parse error in cell "${cellRef}" of sheet "${sheetInfo.name}". Invalid syntax detected for text: ${cellInfo.value}`)
        }

        lastCallPart.name = toEvaluate.slice(0, endOfBlockNameMatch.index)
      }

      output.push(lastCallPart)

      if (lastCallPart.type === 'blockStart') {
        const parentBlock = dynamicParts.openBlocks.at(-1)

        // additionally to the properties bellow this object is expected to hold a
        // ".logicIdx" which will link the block to the logicBlock if the block is recognized
        // as one
        const newBlock = {
          name: lastCallPart.name,
          // all the rows that are part between the start and end of the block
          rows: new Set([parsedCellRef.rowNumber]),
          start: getBoundary(parsedCellRef, lastCallPart),
          end: null,
          parts: [{ cellRef }],
          children: []
        }

        if (parentBlock) {
          parentBlock.children.push(newBlock)
          parentBlock.parts.push({ childrenIdx: parentBlock.children.length - 1 })
        } else {
          dynamicParts.blocks.push(newBlock)
        }

        dynamicParts.openBlocks.push(newBlock)

        const logicBlockKind = getLogicBlockKind(newBlock.name)

        if (logicBlockKind === 'loop') {
          const isNested = currentLoopDetected != null && currentLoopDetected.type !== 'vertical'

          const hierarchyIdPrefix = isNested ? `${currentLoopDetected.hierarchyId}#` : ''
          const hierarchyIdCounter = isNested ? currentLoopDetected.children.length : dynamicParts.logicBlocks.length

          const hierarchyId = `${hierarchyIdPrefix}${hierarchyIdCounter}`

          const newLogicBlockItem = {
            kind: 'loop',
            type: 'block',
            hierarchyId,
            // it will contain child loops
            children: [],
            // the general information of the loop (rows, start, end) lives in the block
            block: newBlock
          }

          if (isNested) {
            currentLoopDetected.children.push(newLogicBlockItem)
          }

          newBlock.logicIdx = dynamicParts.logicBlocks.length
          dynamicParts.logicBlocks.push(newLogicBlockItem)

          if (lastCallPart.value.includes('cells=')) {
            newLogicBlockItem.type = 'dynamic'
          } else if (lastCallPart.value.includes('vertical=')) {
            newLogicBlockItem.type = 'vertical'
          }
        } else if (logicBlockKind === 'condition') {
          const newLogicBlockItem = {
            kind: 'condition',
            type: lastCallPart.value.includes('vertical=') ? 'vertical' : 'block',
            hierarchyId: `${dynamicParts.logicBlocks.length}`,
            // the general information of the condition (rows, start, end) lives in the block
            block: newBlock,
            // there is content before the start of the condition in the cell (other than starts of blocks)
            hasContentBeforeStart: hasContent(cellInfo.value.slice(0, lastCallPart.valueStartIdxInContent), /{{#[^}]*}}/g)
          }

          newBlock.logicIdx = dynamicParts.logicBlocks.length
          dynamicParts.logicBlocks.push(newLogicBlockItem)
        }
      } else if (lastCallPart.type === 'else') {
        let block = dynamicParts.openBlocks.at(-1)

        if (getLogicBlock(dynamicParts, block)?.type === 'vertical') {
          const verticalBlock = dynamicParts.openBlocks.findLast((openBlock) => (
            getLogicBlock(dynamicParts, openBlock)?.type === 'vertical' &&
            openBlock.start.columnNumber === parsedCellRef.columnNumber
          ))

          if (verticalBlock != null) {
            block = verticalBlock
          }
        }

        // {{else}} outside of a block, the template is invalid, let handlebars report it
        if (block == null) {
          return
        }

        if (block.elses == null) {
          block.elses = []
        }

        block.elses.push(getBoundary(parsedCellRef, lastCallPart))
      } else if (lastCallPart.type === 'blockEnd') {
        let block = dynamicParts.openBlocks.at(-1)

        // vertical logic blocks are not closed in the order they were started, the cells
        // are processed row by row so sibling vertical blocks (in different columns)
        // overlap, for these we match the end with the start by the column
        if (getLogicBlock(dynamicParts, block)?.type === 'vertical') {
          block = dynamicParts.openBlocks.findLast((openBlock) => (
            getLogicBlock(dynamicParts, openBlock)?.type === 'vertical' &&
            openBlock.name === lastCallPart.name &&
            openBlock.start.columnNumber === parsedCellRef.columnNumber
          ))

          if (block == null) {
            throw new Error(`Unable to match start {{#${lastCallPart.name}}} and end {{/${lastCallPart.name}}} of vertical block for multiple rows in ${sheetInfo.path}. both start and end of block must be on same column`)
          }
        }

        if (block == null) {
          throw new Error(`Handlebars Parse error in cell "${cellRef}" of sheet "${sheetInfo.name}". Found {{/${lastCallPart.name}}} without a matching {{#${lastCallPart.name}}}`)
        }

        if (block.name !== lastCallPart.name) {
          throw new Error(`Found {{/${lastCallPart.name}}} in cell "${cellRef}" of sheet "${sheetInfo.name}", but {{#${block.name}}} starting at cell ${block.start.cellRef} is not closed`)
        }

        block.end = getBoundary(parsedCellRef, lastCallPart)
        block.parts.push({ cellRef })
        dynamicParts.openBlocks.splice(dynamicParts.openBlocks.indexOf(block), 1)

        const logicBlock = getLogicBlock(dynamicParts, block)

        if (logicBlock != null) {
          // if the logic block starts and end in same cell and it is not dynamic then
          // we don't consider it a logic block for our purposes
          // (it is just a normal loop/condition that creates strings not rows/cells)
          if (
            logicBlock.type !== 'dynamic' &&
            block.start.cellRef === cellRef
          ) {
            // inline logic block here, we just remove it and clean the link from the block.
            // it is always the last logic block
            dynamicParts.logicBlocks.pop()
            delete block.logicIdx
          } else {
            assertLogicBlockHasNoElse(block, sheetInfo)

            if (logicBlock.kind === 'condition') {
              assertValidConditionAcrossCells(logicBlock, dynamicParts, sheetInfo, {
                cellRef,
                contentAfterEnd: cellInfo.value.slice(lastCallPart.valueStartIdxInContent + lastCallPart.value.length)
              })
            }

            // add logic block reference to start and end cells, we insert the ref
            // on logic block end to avoid adding inner logic blocks
            for (const currentCellEntry of [
              parsedCells.get(block.start.cellRef),
              parsedCells.get(cellRef)
            ]) {
              if (currentCellEntry.logicBlocks == null) {
                currentCellEntry.logicBlocks = new Set()
              }

              // this stores references to logic blocks that one of its parts
              // are in the cell (either the call for the start or end of logic block)
              currentCellEntry.logicBlocks.add(logicBlock)
            }

            if (
              logicBlock.type === 'block' &&
              block.end.rowNumber === block.start.rowNumber
            ) {
              logicBlock.type = 'row'
            }
          }
        }
      }

      lastCallPart = null
    }

    lastProcessedIdx += lastPartIdx
    remainingToCheck = restOfStr
  } while (remainingToCheck !== '')

  return output
}

function assertLogicBlockHasNoElse (block, sheetInfo) {
  const elsePart = block.elses?.[0]

  if (elsePart == null) {
    return
  }

  throw new Error(`Found ${elsePart.helperCall} in cell "${elsePart.cellRef}" of sheet "${sheetInfo.name}", {{else}} is not supported in {{#${block.name}}} across cells`)
}

function assertValidConditionAcrossCells (conditionItem, dynamicParts, sheetInfo, { cellRef, contentAfterEnd }) {
  const { block } = conditionItem

  if (conditionItem.hasContentBeforeStart) {
    throw new Error(`{{#${block.name}}} across cells must be at the start of the cell. Found content before it in cell "${block.start.cellRef}" of sheet "${sheetInfo.name}"`)
  }

  // only ends of blocks are valid after the end of the condition
  if (hasContent(contentAfterEnd, /{{\/[^}]*}}/g)) {
    throw new Error(`{{/${block.name}}} across cells must be at the end of the cell. Found content after it in cell "${cellRef}" of sheet "${sheetInfo.name}"`)
  }

  if (conditionItem.type === 'vertical') {
    return
  }

  // vertical loops have a single column, the condition is inside the loop when it starts in its column
  const parentVerticalLoop = getOpenLogicBlocks(dynamicParts, 'loop').find((loopItem) => (
    loopItem.type === 'vertical' &&
    loopItem.block.start.columnNumber === block.start.columnNumber
  ))

  if (parentVerticalLoop != null) {
    throw new Error(`{{#${block.name}}} across cells can not be defined inside vertical loops, use a vertical condition ({{#${block.name} ... vertical=true}}) instead. Check condition definition in cell "${block.start.cellRef}" of sheet "${sheetInfo.name}"`)
  }
}

// checks if the text has content (other than whitespace) after removing the matches of the regexp
function hasContent (text, ignoreRegexp) {
  return text.replace(ignoreRegexp, '').trim() !== ''
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

function getBoundary (parsedCellRef, callPart) {
  return {
    cellRef: `${parsedCellRef.letter}${parsedCellRef.rowNumber}`,
    rowNumber: parsedCellRef.rowNumber,
    columnNumber: parsedCellRef.columnNumber,
    letter: parsedCellRef.letter,
    helperCall: callPart.value,
    helperCallStartIdx: callPart.valueStartIdxInContent
  }
}
