/* global structuredClone */
const { DOMParser } = require('@xmldom/xmldom')

const {
  serializeXmlAsHandlebarsSafeOutput, getDataHelperCall, getDataHelperBlockEndCall,
  recreateNodeWithNewDoc
} = require('../../../utils')

const { getConditionCellsOutside } = require('./logicBlocks')

module.exports = function generateDataTemplate (
  dataRanges,
  dynamicParts,
  parsedSheet,
  autofitConfigured
) {
  const templateManager = getTemplateManager()

  for (const [dataRangeIdx, dataRange] of dataRanges.entries()) {
    if (dataRange.type === 'static') {
      templateManager.addPart(`${getDataHelperCall(
        'staticRange',
        { idx: dataRangeIdx },
        {
          content: '{{> __static_row__ }}'
        }
      )}`)
    } else if (dataRange.type === 'dynamic') {
      for (const rowNumber of dataRange.items) {
        const parsedRow = parsedSheet.rows.get(rowNumber)

        const cellTemplateParts = []

        for (const cellRef of parsedRow.cellRefs) {
          const parsedCell = parsedSheet.cells.get(cellRef)

          if (parsedCell.type === 'static') {
            cellTemplateParts.push({
              letter: parsedCell.letter,
              static: true
            })
          } else if (parsedCell.type === 'dynamic') {
            // check if the cell contain either the start or end of logic blocks
            const logicBlocksInCell = parsedCell.logicBlocks?.size > 0 ? Array.from(parsedCell.logicBlocks) : []
            let newTextValue = parsedCell.textDetails.getText()
            const textDetailFragments = [...parsedCell.textDetails]

            if (logicBlocksInCell.length > 0) {
              const textMatches = []

              for (const logicBlockInCell of logicBlocksInCell) {
                if (logicBlockInCell.block.start.cellRef === cellRef) {
                  textMatches.push({
                    startIdx: logicBlockInCell.block.start.helperCallStartIdx,
                    endIdx: logicBlockInCell.block.start.helperCallStartIdx + (logicBlockInCell.block.start.helperCall.length - 1)
                  })
                }

                if (logicBlockInCell.block.end.cellRef === cellRef) {
                  textMatches.push({
                    startIdx: logicBlockInCell.block.end.helperCallStartIdx,
                    endIdx: logicBlockInCell.block.end.helperCallStartIdx + (logicBlockInCell.block.end.helperCall.length - 1)
                  })
                }
              }

              // sort the matches by start index ASC
              textMatches.sort((a, b) => a.startIdx - b.startIdx)

              const updatedTextFragments = removeMatchesInTextFragments(textDetailFragments, textMatches)

              newTextValue = ''

              for (const [fragmentIdx, updatedTextFragment] of updatedTextFragments.entries()) {
                textDetailFragments[fragmentIdx].text = updatedTextFragment.newText
                textDetailFragments[fragmentIdx].tEl.textContent = updatedTextFragment.newText
                newTextValue += updatedTextFragment.newText
              }
            }

            // only try to detect content if the content for cell is expressed in single text cell
            if (textDetailFragments.length === 1) {
              const handlebarsRegexp = /{{{?(#[\w-]+\s+)?([\w-]+[^\n\r}]*)}?}}/g
              const matches = Array.from(newTextValue.matchAll(handlebarsRegexp))
              const isSingleMatch = matches.length === 1 && matches[0][0] === newTextValue && matches[0][1] == null
              let newText

              if (isSingleMatch) {
                const match = matches[0]
                const expressionValue = match[2]
                const value = expressionValue.includes(' ') ? `(${expressionValue})` : expressionValue
                const props = {}

                if (!value.startsWith('(')) {
                  // this is used in case we need to resolve from helper name
                  props.n = value
                }

                newText = getDataHelperCall('cValue', props, { isBlock: false, valuePart: value })
              } else {
                newText = getDataHelperCall('cValue', null, { content: newTextValue })
              }

              textDetailFragments[0].text = newText
              textDetailFragments[0].tEl.textContent = newText
            }

            const contentElements = parsedCell.textDetails.getContentElements()

            const tmpDoc = new DOMParser().parseFromString('<is />')

            for (const contentEl of contentElements) {
              // we recreate the node to avoid getting unwanted xmlns attributes
              // when serializing
              tmpDoc.documentElement.appendChild(
                recreateNodeWithNewDoc(contentEl, tmpDoc)
              )
            }

            cellTemplateParts.push({
              letter: parsedCell.letter,
              content: serializeXmlAsHandlebarsSafeOutput(tmpDoc)
            })
          } else {
            throw new Error(`Parsed Cell of type "${parsedCell.type}" is not supported`)
          }
        }

        templateManager.addRowPart(rowNumber, cellTemplateParts)
      }
    } else {
      throw new Error(`Data range of type "${dataRange.type}" is not supported`)
    }
  }

  const outOfLoopData = {
    items: [],
    idx: -1
  }

  // we process the logic blocks in the order they were started, this ensures
  // that the wrapper calls of outer logic blocks are put before the inner ones
  for (const logicBlock of dynamicParts.logicBlocks) {
    if (logicBlock.kind === 'loop') {
      addLoopCalls(templateManager, parsedSheet, outOfLoopData, logicBlock)
    } else if (logicBlock.kind === 'condition') {
      addConditionCalls(templateManager, parsedSheet, logicBlock)
    } else {
      throw new Error(`Logic block "${logicBlock.kind}" is not supported`)
    }
  }

  // we process out of loop items after loops to ensure a proper order
  // of wrapper calls
  for (const outOfLoopItem of outOfLoopData.items) {
    for (const type of ['left', 'right']) {
      if (outOfLoopItem[type] == null) {
        continue
      }

      const outOfLoopSide = outOfLoopItem[type]
      const loopItem = outOfLoopItem.loopItem
      const loopLevel = loopItem.hierarchyId.split('#').length
      const isOuterLevel = loopLevel === 1

      // we need to move the cells that are out of the loop above the loop helper call,
      // this ensures that these cells does not have access to the context in the loop
      outOfLoopItem.part.children.push(`{{#*inline "__outOfLoop${outOfLoopSide.idx}__"}}`)

      for (let idx = 0; idx < outOfLoopSide.cellRefs.length; idx++) {
        const cellRef = outOfLoopSide.cellRefs[idx]
        const isFirst = idx === 0

        const currentParsedCellRef = parsedSheet.cells.get(cellRef)
        const cellPart = templateManager.getRowCellPart(outOfLoopSide.rowNumber, currentParsedCellRef.letter)
        const clonedCellPart = structuredClone(cellPart)

        // clean the cells that are out of the loop and just put the outOfLoopOutput
        // call on the start cell
        cellPart.pre = []
        cellPart.children = []
        cellPart.post = []

        if (isFirst) {
          if (isOuterLevel) {
            // we include an if condition to preserve the cells that are before/after the loop
            // but only do it for the outer loops
            cellPart.pre.push(`{{#if ${loopItem.type === 'block' && type === 'right' ? '@last' : '@first'}}}`)
          }

          cellPart.children.push(`{{> __outOfLoop${outOfLoopSide.idx}__ ../this }}`)

          if (isOuterLevel) {
            cellPart.post.unshift('{{/if}}')
          }
        }

        outOfLoopItem.part.children.push(clonedCellPart)
      }

      outOfLoopItem.part.children.push('{{/inline}}')
    }
  }

  const inlinePartials = [`{{#*inline "__static_row__"}}${
    getDataHelperCall('r', null, {
      valuePart: 'rowNumber',
      content: `{{#each cells}}${getDataHelperCall('c', null, { isBlock: false, valuePart: './this' })}{{/each}}`
    })
  }{{/inline}}`]

  const dataTemplateParts = []

  if (autofitConfigured.length > 0) {
    // we are interested in always move the call of the first cell to the
    // body of the sheet, this is needed in order to correctly detect if all
    // cols should have autofit
    const firstCellConf = autofitConfigured.find((conf) => (
      conf.row === 0 && conf.column === 0
    ))

    const tEls = Array.from(firstCellConf.commentEl.getElementsByTagName('t'))
    const tCallEl = tEls.find((tEl) => tEl.textContent.startsWith('{{xlsxColAutofit'))
    const autoFitCallRegExp = /{{xlsxColAutofit( [^}]*)?}}/

    if (tCallEl != null) {
      const autoFitCallMatch = autoFitCallRegExp.exec(tCallEl.textContent)

      // we are interested in always move the call of the first cell to the
      // body of the sheet, this is needed in order to correctly detect if all
      // cols should have autofit
      dataTemplateParts.push(tCallEl.textContent.slice(
        autoFitCallMatch.index,
        autoFitCallMatch.index + autoFitCallMatch[0].length
      ))
    }
  }

  dataTemplateParts.push(inlinePartials.join('\n'))

  templateManager.processParts((content) => {
    dataTemplateParts.push(content)
  })

  // insert a call to resolve any possible last processing
  dataTemplateParts.push(
    getDataHelperCall('lastProcessing', null, { isBlock: false })
  )

  return dataTemplateParts.join('\n')
}

function getTemplateManager () {
  const parts = []
  const rowToIdxPartMap = new Map()

  return {
    addPart (content) {
      parts.push(content)
    },
    addRowPart (rowNumber, cellParts) {
      const mapEntry = {}

      const contentParts = [
        getDataHelperCall('r', undefined, {
          // we could use the element index as the parameter, however
          // we choose to use the row number to allow easier debugging
          valuePart: rowNumber
        })
      ]

      for (const cellPart of cellParts) {
        if (mapEntry.cells == null) {
          mapEntry.cells = new Map()
        }

        mapEntry.cells.set(cellPart.letter, contentParts.length)

        const cellHelperCall = {
          props: {},
          options: {
            valuePart: `'${cellPart.letter}'`
          }
        }

        if (cellPart.static === true) {
          cellHelperCall.options.isBlock = false
        } else {
          if (cellPart.content == null) {
            throw new Error('Cell part should have a .content property')
          }

          cellHelperCall.options.content = cellPart.content
        }

        const cellContentParts = [
          getDataHelperCall('c', cellHelperCall.props, cellHelperCall.options)
        ]

        contentParts.push({
          pre: [],
          post: [],
          children: cellContentParts
        })
      }

      contentParts.push(getDataHelperBlockEndCall())

      mapEntry.idx = parts.length

      rowToIdxPartMap.set(rowNumber, mapEntry)

      parts.push({
        pre: [],
        post: [],
        children: contentParts
      })
    },
    getRowCellPart (rowNumber, columnLetter) {
      const mapEntry = rowToIdxPartMap.get(rowNumber)
      let targetPart

      if (columnLetter == null) {
        targetPart = parts[mapEntry?.idx]

        if (targetPart == null) {
          throw new Error(`No part found for row number ${rowNumber}`)
        }
      } else {
        const cellPartIdx = mapEntry?.cells?.get(columnLetter)

        targetPart = parts[mapEntry?.idx]?.children?.[cellPartIdx]

        if (targetPart == null) {
          throw new Error(`No part found for row number ${rowNumber} and column letter ${columnLetter}`)
        }
      }

      return targetPart
    },
    // walks the parts in the order of the template (pre, children, post),
    // the callback receives the string content of the parts
    processParts (onContent) {
      for (const part of parts) {
        const pending = [part]

        while (pending.length > 0) {
          const pendingPart = pending.shift()

          if (typeof pendingPart === 'string') {
            onContent(pendingPart)
          } else {
            const preParts = pendingPart.pre ?? []
            const postParts = pendingPart.post ?? []
            const childrenParts = pendingPart.children ?? []

            pending.unshift(...[
              ...preParts,
              ...childrenParts,
              ...postParts
            ])
          }
        }
      }
    }
  }
}

function addLoopCalls (templateManager, parsedSheet, outOfLoopData, loopItem) {
  const startRowPart = templateManager.getRowCellPart(loopItem.block.start.rowNumber)
  const endRowPart = templateManager.getRowCellPart(loopItem.block.end.rowNumber)
  const isRowBased = loopItem.type === 'row' || loopItem.type === 'block' || loopItem.type === 'dynamic'
  let outOfLoopPart

  if (isRowBased) {
    const startRowCellRefs = parsedSheet.rows.get(loopItem.block.start.rowNumber).cellRefs
    const endRowCellRefs = parsedSheet.rows.get(loopItem.block.end.rowNumber).cellRefs
    const startCellRefIdx = startRowCellRefs.indexOf(loopItem.block.start.cellRef)
    const endCellRefIdx = endRowCellRefs.indexOf(loopItem.block.end.cellRef)

    const previousCellRefs = startRowCellRefs.slice(0, startCellRefIdx)
    const nextCellRefs = endRowCellRefs.slice(endCellRefIdx + 1)
    const outOfLoopItem = {}

    for (const type of ['left', 'right']) {
      const cellRefs = type === 'left' ? previousCellRefs : nextCellRefs

      if (cellRefs.length === 0) {
        continue
      }

      outOfLoopData.idx++

      outOfLoopItem[type] = {
        idx: outOfLoopData.idx,
        rowNumber: type === 'left' ? loopItem.block.start.rowNumber : loopItem.block.end.rowNumber,
        cellRefs
      }
    }

    if (Object.keys(outOfLoopItem).length > 0) {
      outOfLoopItem.part = {
        children: []
      }

      outOfLoopPart = outOfLoopItem.part

      outOfLoopItem.loopItem = loopItem
      outOfLoopData.items.push(outOfLoopItem)
    }
  }

  // optimization to evaluate the data expression just once
  const evaluateCall = getEvaluateCall(loopItem)

  if (loopItem.type === 'dynamic') {
    startRowPart.pre.push(evaluateCall)
    startRowPart.pre.push(getLogicBlockCall(loopItem))

    endRowPart.post.unshift(getDataHelperBlockEndCall())

    const startCellPart = templateManager.getRowCellPart(loopItem.block.start.rowNumber, loopItem.block.start.letter)

    // we want to put the column loop wrapper around the cell, we also
    // set the hierarchyId of this loop as a child loop
    const loopCallForColumn = getLogicBlockCall(loopItem, {
      props: {
        hierarchyId: `${loopItem.hierarchyId}#0`,
        cellsT: 'columns'
      }
    })

    startCellPart.pre.push(loopCallForColumn)
    startCellPart.post.unshift(getDataHelperBlockEndCall())
  } else if (loopItem.type === 'vertical') {
    let isFirstRow = true

    for (const rowNumber of loopItem.block.rows) {
      const parsedRow = parsedSheet.rows.get(rowNumber)

      const cellRefsForLoop = parsedRow.cellRefs.filter((cellRef) => {
        const parsedCell = parsedSheet.cells.get(cellRef)

        return (
          parsedCell.columnNumber >= loopItem.block.start.columnNumber &&
          parsedCell.columnNumber <= loopItem.block.end.columnNumber
        )
      })

      const startCellRef = cellRefsForLoop[0]
      const parsedStartCell = parsedSheet.cells.get(startCellRef)
      const startCellPart = templateManager.getRowCellPart(rowNumber, parsedStartCell.letter)

      if (isFirstRow) {
        startCellPart.pre.push(evaluateCall)
        isFirstRow = false
      }

      startCellPart.pre.push(getLogicBlockCall(loopItem))

      // vertical loops are wrapped by row, so the loop has an end for each row
      startCellPart.post.unshift(getDataHelperBlockEndCall())
    }
  } else {
    startRowPart.pre.push(evaluateCall)
    startRowPart.pre.push(getLogicBlockCall(loopItem))
    endRowPart.post.unshift(getDataHelperBlockEndCall())
  }

  if (outOfLoopPart) {
    // reserve the spot, we are going to fill it bellow
    // when processing out of loop items
    startRowPart.pre.push(outOfLoopPart)
  }
}

function addConditionCalls (templateManager, parsedSheet, conditionItem) {
  // optimization to evaluate the condition expression just once
  let evaluateCall = getEvaluateCall(conditionItem)

  const withEvaluateCall = (call) => {
    if (evaluateCall == null) {
      return call
    }

    const result = `${evaluateCall}\n${call}`
    evaluateCall = null
    return result
  }

  if (conditionItem.type === 'vertical') {
    const conditionCall = getLogicBlockCall(conditionItem)

    // the condition is evaluated for each row of the block, wrapping just the cell of the column
    for (const rowNumber of conditionItem.block.rows) {
      const cellRef = parsedSheet.rows.get(rowNumber).cellRefs.find((cellRef) => (
        parsedSheet.cells.get(cellRef).columnNumber === conditionItem.block.start.columnNumber
      ))

      // the row does not have a cell in the column, nothing to remove
      if (cellRef == null) {
        continue
      }

      const cellPart = templateManager.getRowCellPart(rowNumber, parsedSheet.cells.get(cellRef).letter)

      cellPart.pre.push(withEvaluateCall(conditionCall))
      cellPart.post.unshift(getDataHelperBlockEndCall())
    }

    return
  }

  // the cells before the start of the condition (in the start row) and the cells after the end
  // of the condition (in the end row) are not part of it, these cells should not be
  // affected by the condition result, so they should not be wrapped
  const { startRowCellRefs, endRowCellRefs, hasCellsBefore, hasCellsAfter } = getConditionCellsOutside(parsedSheet, conditionItem)

  if (!hasCellsBefore && !hasCellsAfter) {
    const conditionCall = getLogicBlockCall(conditionItem)
    // all the rows of the condition should be wrapped
    const startRowPart = templateManager.getRowCellPart(conditionItem.block.start.rowNumber)
    const endRowPart = templateManager.getRowCellPart(conditionItem.block.end.rowNumber)

    startRowPart.pre.push(withEvaluateCall(conditionCall))
    endRowPart.post.unshift(getDataHelperBlockEndCall())

    return
  }

  if (conditionItem.type === 'row') {
    const conditionCall = getLogicBlockCall(conditionItem)
    const startCellPart = templateManager.getRowCellPart(conditionItem.block.start.rowNumber, parsedSheet.cells.get(conditionItem.block.start.cellRef).letter)
    const endCellPart = templateManager.getRowCellPart(conditionItem.block.end.rowNumber, parsedSheet.cells.get(conditionItem.block.end.cellRef).letter)

    startCellPart.pre.push(withEvaluateCall(conditionCall))
    endCellPart.post.unshift(getDataHelperBlockEndCall())

    return
  }

  if (hasCellsBefore) {
    const conditionCall = getLogicBlockCall(conditionItem, {
      type: 'row',
      start: conditionItem.block.start.rowNumber,
      columnStart: conditionItem.block.start.columnNumber,
      columnEnd: parsedSheet.cells.get(startRowCellRefs.at(-1)).columnNumber
    })

    const firstCellPartInStartRow = templateManager.getRowCellPart(conditionItem.block.start.rowNumber, parsedSheet.cells.get(conditionItem.block.start.cellRef).letter)
    const lastCellPartInStartRow = templateManager.getRowCellPart(conditionItem.block.start.rowNumber, parsedSheet.cells.get(startRowCellRefs.at(-1)).letter)

    firstCellPartInStartRow.pre.push(withEvaluateCall(conditionCall))
    lastCellPartInStartRow.post.unshift(getDataHelperBlockEndCall())
  }

  // the middle rows of the condition (excluding the start and end rows when they are kept),
  // the rows that does not exist in the template (rows with no definition) are also part of it
  const middleStartRow = hasCellsBefore ? conditionItem.block.start.rowNumber + 1 : conditionItem.block.start.rowNumber
  const middleEndRow = hasCellsAfter ? conditionItem.block.end.rowNumber - 1 : conditionItem.block.end.rowNumber

  if (middleStartRow <= middleEndRow) {
    const conditionCall = getLogicBlockCall(conditionItem, {
      type: 'block',
      start: middleStartRow,
      end: middleEndRow
    })

    const startRowPart = templateManager.getRowCellPart(conditionItem.block.start.rowNumber)
    const endRowPart = templateManager.getRowCellPart(conditionItem.block.end.rowNumber)

    // the call is placed relative to the start and end rows, so it is added even when the middle
    // rows does not exist in the template (all of them are rows with no definition), in that case the call
    // does not have content but it is still evaluated to remove the rows with no definition.
    // the call starts after the start row when it is kept, otherwise before it
    if (hasCellsBefore) {
      startRowPart.post.push(withEvaluateCall(conditionCall))
    } else {
      startRowPart.pre.push(withEvaluateCall(conditionCall))
    }

    // the call ends before the end row when it is kept, otherwise after it
    if (hasCellsAfter) {
      endRowPart.pre.unshift(getDataHelperBlockEndCall())
    } else {
      endRowPart.post.unshift(getDataHelperBlockEndCall())
    }
  }

  if (hasCellsAfter) {
    const conditionCall = getLogicBlockCall(conditionItem, {
      type: 'row',
      start: conditionItem.block.end.rowNumber,
      columnStart: parsedSheet.cells.get(endRowCellRefs[0]).columnNumber,
      columnEnd: conditionItem.block.end.columnNumber
    })

    const firstCellPartInEndRow = templateManager.getRowCellPart(conditionItem.block.end.rowNumber, parsedSheet.cells.get(endRowCellRefs[0]).letter)
    const lastCellPartInEndRow = templateManager.getRowCellPart(conditionItem.block.end.rowNumber, parsedSheet.cells.get(conditionItem.block.end.cellRef).letter)

    firstCellPartInEndRow.pre.push(withEvaluateCall(conditionCall))
    lastCellPartInEndRow.post.unshift(getDataHelperBlockEndCall())
  }
}

// the call that evaluates the arguments of the logic block (data and hash options written by the user),
// the arguments are evaluated once and stored in the runtime, the calls of the logic block read them
// from there, so the arguments are not evaluated for each call of the logic block (a logic block can have
// multiple calls) and they are not evaluated at all when the content is rendered empty (keepCells)
function getEvaluateCall (logicBlock) {
  const { argsPart } = parseLogicBlockStartCall(logicBlock)
  const props = { hierarchyId: logicBlock.hierarchyId }

  return getDataHelperCall('evaluate', props, {
    content: getDataHelperCall('args', props, { isBlock: false, valuePart: argsPart })
  })
}

function getLogicBlockCall (logicBlock, customPart = {}) {
  const { asPart } = parseLogicBlockStartCall(logicBlock)
  const dataHelperName = logicBlock.kind === 'loop' ? 'loop' : 'condition'

  const props = {
    hierarchyId: logicBlock.hierarchyId,
    start: customPart.start ?? logicBlock.block.start.rowNumber
  }

  const targetType = customPart.type ?? logicBlock.type

  if (targetType === 'block') {
    props.end = customPart.end ?? logicBlock.block.end.rowNumber
  }

  props.columnStart = customPart.columnStart ?? logicBlock.block.start.columnNumber
  props.columnEnd = customPart.columnEnd ?? logicBlock.block.end.columnNumber

  if (logicBlock.type === 'vertical') {
    props.vertical = true
  }

  // the {{#unless}} condition renders its content when the value is falsy
  if (logicBlock.kind === 'condition' && logicBlock.block.name === 'unless') {
    props.unless = true
  }

  Object.assign(props, customPart.props)

  const dataHelperOpts = {}

  if (logicBlock.kind === 'loop') {
    dataHelperOpts.asPart = asPart
  }

  return getDataHelperCall(dataHelperName, props, dataHelperOpts)
}

function parseLogicBlockStartCall (logicBlock) {
  if (logicBlock.kind !== 'loop' && logicBlock.kind !== 'condition') {
    throw new Error(`Logic block "${logicBlock.kind}" is not supported`)
  }

  const supportsBlockParameters = logicBlock.kind === 'loop'
  const match = logicBlock.block.start.helperCall.match(getBlockStartHelperRegexp(logicBlock.block.name, supportsBlockParameters))

  if (match == null) {
    throw new Error(`Unable to parse the start of the logic block "${logicBlock.block.start.helperCall}"`)
  }

  const asPart = supportsBlockParameters ? match[2] : null

  return {
    argsPart: match[1].trimEnd(),
    asPart: asPart != null && asPart !== '' ? asPart.trim() : ''
  }
}

function getBlockStartHelperRegexp (helperName, blockParameters = false) {
  return new RegExp(`{{#${helperName}\\s+([^{|}]{0,500})${blockParameters ? '(?:\\s*(as\\s+\\|\\w+\\|))?' : ''}\\s*}}`)
}

function removeMatchesInTextFragments (textFragments, targetMatches) {
  const matchedFragments = []
  let fragmentStartIdx = 0

  const targetFragments = textFragments.map((match) => ({ ...match }))

  while (targetFragments.length > 0) {
    const fragment = targetFragments.shift()

    if (fragment.text === '') {
      matchedFragments.push({ ...fragment, newText: '' })
      continue
    }

    const originalText = fragment.text
    let currentStartIdx = fragmentStartIdx
    const currentEndIdx = fragmentStartIdx + originalText.length - 1
    let newText = originalText
    const pendingParts = []

    for (const { startIdx, endIdx } of targetMatches) {
      if (currentStartIdx > endIdx || currentStartIdx > currentEndIdx) {
        continue
      }

      const startHasMatch = startIdx >= currentStartIdx && startIdx <= currentEndIdx
      const middleMatch = endIdx >= currentStartIdx && endIdx > currentEndIdx
      const endHasMatch = endIdx >= currentStartIdx && endIdx <= currentEndIdx

      if (startHasMatch || middleMatch || endHasMatch) {
        const leftPartStart = 0
        let leftPartEnd = startIdx - currentStartIdx

        if (leftPartEnd < 0) {
          leftPartEnd = 0
        }

        let rightPartStart = endIdx - currentStartIdx + 1

        if (rightPartStart < 0) {
          rightPartStart = 0
        }

        let rightPartEnd = rightPartStart + (currentEndIdx - endIdx)

        if (rightPartEnd < 0) {
          rightPartEnd = 0
        }

        const middleRemove = leftPartEnd - leftPartStart !== 0 && rightPartEnd - rightPartStart !== 0

        if (middleRemove) {
          // save the remaining part for later
          pendingParts.push(newText.slice(leftPartStart, leftPartEnd))
          newText = newText.slice(rightPartStart, rightPartEnd)
        } else {
          newText = `${newText.slice(leftPartStart, leftPartEnd)}${newText.slice(rightPartStart, rightPartEnd)}`
        }

        currentStartIdx = currentStartIdx + rightPartStart
      }
    }

    newText = pendingParts.join('') + newText

    matchedFragments.push({ ...fragment, newText })
    fragmentStartIdx = currentEndIdx + 1
  }

  return matchedFragments
}
