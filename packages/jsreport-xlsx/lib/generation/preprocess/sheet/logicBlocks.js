const { parseCellRef } = require('../../../cellUtils')

// helpers to read the logic blocks (loops, conditions) stored in dynamicParts.logicBlocks.
// a block links to its logic block by index (block.logicIdx),
// so dynamicParts.logicBlocks must only be appended

const logicBlockKindsByName = new Map([
  ['each', 'loop'],
  ['if', 'condition'],
  ['unless', 'condition']
])

function getLogicBlockKind (blockName) {
  return logicBlockKindsByName.get(blockName)
}

function getLogicBlock (dynamicParts, block) {
  if (block?.logicIdx == null) {
    return
  }

  return dynamicParts.logicBlocks[block.logicIdx]
}

function getOpenLogicBlocks (dynamicParts, kind) {
  const result = []

  for (const openBlock of dynamicParts.openBlocks) {
    const logicBlock = getLogicBlock(dynamicParts, openBlock)

    if (logicBlock != null && (kind == null || logicBlock.kind === kind)) {
      result.push(logicBlock)
    }
  }

  return result
}

function getLastOpenLogicBlock (dynamicParts, kind) {
  for (let idx = dynamicParts.openBlocks.length - 1; idx >= 0; idx--) {
    const logicBlock = getLogicBlock(dynamicParts, dynamicParts.openBlocks[idx])

    if (logicBlock != null && (kind == null || logicBlock.kind === kind)) {
      return logicBlock
    }
  }
}

function getLoops (dynamicParts) {
  return dynamicParts.logicBlocks.filter((logicBlock) => logicBlock.kind === 'loop')
}

function getAndValidateLoopsForRow (currentFilePath, loopsDetected, currentRowNumber, isLastRow) {
  const dynamicLoops = loopsDetected.filter((l) => l.type === 'dynamic' && l.block.start.rowNumber === currentRowNumber)
  const invalidDynamicLoops = dynamicLoops.find((l) => l.block.end == null)

  if (invalidDynamicLoops != null) {
    throw new Error(`Unable to find end of dynamic loop (#each) in ${currentFilePath}. {{/each}} is missing`)
  }

  const rowLoops = loopsDetected.filter((l) => l.type === 'row' && l.block.start.rowNumber === currentRowNumber)
  const invalidRowLoop = rowLoops.find((l) => l.block.end == null)

  if (invalidRowLoop != null) {
    throw new Error(`Unable to find end of loop (#each) in ${currentFilePath}. {{/each}} is missing`)
  }

  let blockLoops = loopsDetected.filter((l) => l.type === 'block')

  if (isLastRow) {
    const invalidBlockLoop = blockLoops.find((l) => l.block.end == null)

    if (invalidBlockLoop) {
      throw new Error(`Unable to find end of block loop (#each) in ${currentFilePath}. {{/each}} is missing`)
    }
  }

  blockLoops = blockLoops.filter((l) => l.block.end?.rowNumber === currentRowNumber)

  let verticalLoops = loopsDetected.filter((l) => l.type === 'vertical')

  if (isLastRow) {
    const invalidVerticalLoop = verticalLoops.find((l) => l.block.end == null)

    if (invalidVerticalLoop) {
      throw new Error(`Unable to find end of vertical loop (#each) in ${currentFilePath}. {{/each}} is missing`)
    }
  }

  verticalLoops = verticalLoops.filter((l) => l.block.end?.rowNumber === currentRowNumber)

  return [...dynamicLoops, ...rowLoops, ...blockLoops, ...verticalLoops]
}

// the checks of the loops of a row, it runs when the row was parsed (the loops that end in the row are known)
function assertLoopsInRow (sheetPath, dynamicParts, rowNumber, isLastRow) {
  const loops = getLoops(dynamicParts)
  const loopsToValidate = getAndValidateLoopsForRow(sheetPath, loops, rowNumber, isLastRow)

  for (const currentLoop of loopsToValidate) {
    if (currentLoop.type === 'dynamic') {
      const invalidLoop = loops.find((loop) => {
        // skip if it is the same
        if (loop.hierarchyId === currentLoop.hierarchyId) {
          return false
        }

        if (loop.type === 'vertical' || loop.type === 'dynamic') {
          // we are fine detecting just one side
          return (
            loop.block.start.columnNumber === currentLoop.block.start.columnNumber &&
            loop.block.start.rowNumber >= currentLoop.block.start.rowNumber &&
            loop.block.start.rowNumber <= currentLoop.block.end.rowNumber
          )
        } else if (loop.type === 'row' || loop.type === 'block') {
          // we are fine detecting just one side in the case of block loops
          return (
            loop.block.start.rowNumber >= currentLoop.block.start.rowNumber &&
            loop.block.start.rowNumber <= currentLoop.block.end.rowNumber
          )
        }

        return false
      })

      if (invalidLoop != null) {
        if (invalidLoop.type === 'dynamic') {
          throw new Error(`Dynamic cells can not have other dynamic cells defined in the same cell. Check Dynamic cell definition in ${sheetPath}, cell ${invalidLoop.block.start.cellRef}`)
        } else {
          throw new Error(`Dynamic cells can not be defined in rows that contain ${invalidLoop.type} loops. Check Dynamic cell definition in ${sheetPath}, cell ${invalidLoop.block.start.cellRef}`)
        }
      }
    } else if (currentLoop.type === 'vertical') {
      if (currentLoop.block.start.columnNumber !== currentLoop.block.end.columnNumber) {
        throw new Error(`Vertical loops must start {{#each}} and end {{/each}} in the same column. Check Vertical loop definition in ${sheetPath}, cell ${currentLoop.block.start.cellRef}, ${currentLoop.block.end.cellRef}`)
      }

      const invalidLoop = loops.find((loop) => {
        // skip if it is the same
        if (loop.hierarchyId === currentLoop.hierarchyId) {
          return false
        }

        if (loop.type === 'vertical' || loop.type === 'dynamic') {
          // we are fine detecting just one side
          return (
            loop.block.start.columnNumber === currentLoop.block.start.columnNumber &&
            loop.block.start.rowNumber >= currentLoop.block.start.rowNumber &&
            loop.block.start.rowNumber <= currentLoop.block.end.rowNumber
          )
        } else if (loop.type === 'row' || loop.type === 'block') {
          // we are fine detecting just one side in the case of block loops
          return (
            loop.block.start.rowNumber >= currentLoop.block.start.rowNumber &&
            loop.block.start.rowNumber <= currentLoop.block.end.rowNumber
          )
        }

        return false
      })

      if (invalidLoop != null) {
        if (invalidLoop.type === 'vertical') {
          throw new Error(`Vertical loops can not have child vertical loops. Check child vertical loop definition in ${sheetPath}, cell ${invalidLoop.block.start.cellRef}`)
        } else {
          throw new Error(`Vertical loops can not be defined in rows that contain ${invalidLoop.type} loops. Check Vertical loop definition in ${sheetPath}, cell ${invalidLoop.block.start.cellRef}`)
        }
      }
    } else {
      if (currentLoop.type === 'row') {
        const invalidLoop = loops.find((loop) => {
          if (loop.hierarchyId === currentLoop.hierarchyId) {
            return false
          }

          if (loop.type === 'dynamic') {
            // we are fine detecting just one side
            return (
              loop.block.start.columnNumber === currentLoop.block.start.columnNumber &&
              loop.block.start.rowNumber >= currentLoop.block.start.rowNumber &&
              loop.block.start.rowNumber <= currentLoop.block.end.rowNumber
            )
          }

          return false
        })

        if (invalidLoop != null) {
          if (invalidLoop.type === 'dynamic') {
            throw new Error(`Row loops can not have child dynamic cells. Check child dynamic cell definition in ${sheetPath}, cell ${invalidLoop.block.start.cellRef}`)
          }
        }
      }
    }
  }
}

// all the logic blocks should be closed when the sheet was parsed
function assertNoOpenLogicBlocks (dynamicParts, sheetPath) {
  const openLogicBlocks = getOpenLogicBlocks(dynamicParts)

  if (openLogicBlocks.length > 0) {
    const { kind, block: { name } } = openLogicBlocks[0]
    const openLogicBlocksOfKind = openLogicBlocks.filter((l) => l.kind === kind)
    const logicBlockCalls = openLogicBlocksOfKind.map((l) => `- ${l.type} ${kind} starting at cell ${l.block.start.cellRef}`)
    throw new Error(`Unable to find end of ${kind} ({{/${name}}}) for the following ${kind} calls in ${sheetPath}:\n${logicBlockCalls.join('\n')}`)
  }
}

function getConditionCellsOutside (parsedSheet, conditionItem) {
  const startRowCellRefs = parsedSheet.rows.get(conditionItem.block.start.rowNumber).cellRefs
  const endRowCellRefs = parsedSheet.rows.get(conditionItem.block.end.rowNumber).cellRefs

  return {
    startRowCellRefs,
    endRowCellRefs,
    hasCellsBefore: startRowCellRefs.indexOf(conditionItem.block.start.cellRef) > 0,
    hasCellsAfter: endRowCellRefs.indexOf(conditionItem.block.end.cellRef) < endRowCellRefs.length - 1
  }
}

function assertConditionsWithLoopsInRows (parsedSheet, dynamicParts, sheetPath) {
  const rowLoops = getLoops(dynamicParts).filter((loopItem) => loopItem.type !== 'vertical')

  if (rowLoops.length === 0) {
    return
  }

  for (const conditionItem of dynamicParts.logicBlocks) {
    if (conditionItem.kind !== 'condition') {
      continue
    }

    const partialRows = []

    if (conditionItem.type === 'vertical') {
      partialRows.push(...conditionItem.block.rows)
    } else {
      const { hasCellsBefore, hasCellsAfter } = getConditionCellsOutside(parsedSheet, conditionItem)

      if (hasCellsBefore || (conditionItem.type === 'row' && hasCellsAfter)) {
        partialRows.push(conditionItem.block.start.rowNumber)
      }

      if (conditionItem.type === 'block' && hasCellsAfter) {
        partialRows.push(conditionItem.block.end.rowNumber)
      }
    }

    for (const loopItem of rowLoops) {
      const sharesRow = partialRows.some((rowNumber) => (
        rowNumber >= loopItem.block.start.rowNumber &&
        rowNumber <= loopItem.block.end.rowNumber
      ))

      if (!sharesRow || isBlockInside(conditionItem.block, loopItem.block)) {
        continue
      }

      const { name } = conditionItem.block

      if (isBlockInside(loopItem.block, conditionItem.block)) {
        throw new Error(`Loops inside {{#${name}}} across cells must be defined in rows that are fully part of the condition. Check loop definition in ${sheetPath}, cell ${loopItem.block.start.cellRef}`)
      }

      throw new Error(`{{#${name}}} across cells can not start or end in the same row of a loop that is not part of it. Check condition definition in ${sheetPath}, cell ${conditionItem.block.start.cellRef}`)
    }
  }
}

function assertSiblingLoopsInRows (dynamicParts, sheetPath) {
  const rowLoops = getLoops(dynamicParts).filter((loopItem) => loopItem.type === 'row' || loopItem.type === 'block')

  for (const [idx, loopItem] of rowLoops.entries()) {
    for (const otherLoopItem of rowLoops.slice(idx + 1)) {
      const sharesRow = (
        otherLoopItem.block.start.rowNumber <= loopItem.block.end.rowNumber &&
        otherLoopItem.block.end.rowNumber >= loopItem.block.start.rowNumber
      )

      if (
        !sharesRow ||
        isBlockInside(otherLoopItem.block, loopItem.block) ||
        isBlockInside(loopItem.block, otherLoopItem.block)
      ) {
        continue
      }

      throw new Error(`Loops that are not one inside of the other can not share the same row. Check loop definition in ${sheetPath}, cell ${otherLoopItem.block.start.cellRef}`)
    }
  }
}

function assertConditionsWithMergedCells (parsedSheet, dynamicParts, mergeCellRefs, sheetPath) {
  if (mergeCellRefs.length === 0) {
    return
  }

  const merges = mergeCellRefs.map((ref) => {
    const [start, end] = ref.split(':').map((cellRef) => parseCellRef(cellRef))
    return { ref, start, end: end ?? start }
  })

  for (const conditionItem of dynamicParts.logicBlocks) {
    if (conditionItem.kind !== 'condition') {
      continue
    }

    const columnsByRow = getConditionColumnsByRow(parsedSheet, conditionItem)

    for (const merge of merges) {
      let isInside = false
      let isOutside = false

      for (let rowNumber = merge.start.rowNumber; rowNumber <= merge.end.rowNumber; rowNumber++) {
        const columns = columnsByRow.get(rowNumber)

        for (let columnNumber = merge.start.columnNumber; columnNumber <= merge.end.columnNumber; columnNumber++) {
          if (columns != null && columnNumber >= columns.start && columnNumber <= columns.end) {
            isInside = true
          } else {
            isOutside = true
          }
        }
      }

      if (isInside && isOutside) {
        throw new Error(`Merged cells "${merge.ref}" can not cross the boundary of {{#${conditionItem.block.name}}} across cells, the merged cells should be fully inside or outside of the condition. Check condition definition in ${sheetPath}, cell ${conditionItem.block.start.cellRef}`)
      }
    }
  }
}

function getConditionColumnsByRow (parsedSheet, conditionItem) {
  const { block } = conditionItem
  const columnsByRow = new Map()

  if (conditionItem.type === 'vertical') {
    for (let rowNumber = block.start.rowNumber; rowNumber <= block.end.rowNumber; rowNumber++) {
      columnsByRow.set(rowNumber, { start: block.start.columnNumber, end: block.start.columnNumber })
    }

    return columnsByRow
  }

  const { hasCellsBefore, hasCellsAfter } = getConditionCellsOutside(parsedSheet, conditionItem)

  for (let rowNumber = block.start.rowNumber; rowNumber <= block.end.rowNumber; rowNumber++) {
    columnsByRow.set(rowNumber, { start: 1, end: Infinity })
  }

  if (conditionItem.type === 'row') {
    if (hasCellsBefore || hasCellsAfter) {
      columnsByRow.set(block.start.rowNumber, { start: block.start.columnNumber, end: block.end.columnNumber })
    }

    return columnsByRow
  }

  if (hasCellsBefore) {
    columnsByRow.set(block.start.rowNumber, { start: block.start.columnNumber, end: Infinity })
  }

  if (hasCellsAfter) {
    columnsByRow.set(block.end.rowNumber, { start: 1, end: block.end.columnNumber })
  }

  return columnsByRow
}

// checks if the block is inside (descendant of) the parent block
function isBlockInside (block, parentBlock) {
  return parentBlock.children.some((childBlock) => childBlock === block || isBlockInside(block, childBlock))
}

module.exports = {
  getLogicBlockKind,
  getLogicBlock,
  getOpenLogicBlocks,
  getLastOpenLogicBlock,
  getLoops,
  getConditionCellsOutside,
  assertLoopsInRow,
  assertNoOpenLogicBlocks,
  assertConditionsWithLoopsInRows,
  assertConditionsWithMergedCells,
  assertSiblingLoopsInRows
}
