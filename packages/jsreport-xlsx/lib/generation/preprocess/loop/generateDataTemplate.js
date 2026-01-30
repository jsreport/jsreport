/* global structuredClone */
const { DOMParser } = require('@xmldom/xmldom')

const {
  serializeXmlAsHandlebarsSafeOutput, getDataHelperCall, getDataHelperBlockEndCall,
  recreateNodeWithNewDoc
} = require('../../../utils')

const startLoopRegexp = /{{#each\s+([^{|}]{0,500})(?:\s*(as\s+\|\w+\|))?\s*}}/

module.exports = function generateDataTemplate (
  dataRanges,
  templateItems,
  dynamicParts,
  parsedCells,
  autofitConfigured
) {
  const templateManager = getTemplateManager()

  for (const dataRange of dataRanges) {
    if (dataRange.type === 'static') {
      templateManager.addPart(`${getDataHelperCall(
        'staticRange',
        { start: dataRange.start, end: dataRange.end },
        {
          content: '{{> __static_row__ }}'
        }
      )}`)
    } else if (dataRange.type === 'dynamic') {
      for (let elementIdx = dataRange.start; elementIdx <= dataRange.end; elementIdx++) {
        const item = templateItems.data[elementIdx]
        const rowNumber = item.id
        const dynamicRow = dynamicParts.rows.get(rowNumber)

        const loopCallsForRow = { pre: [], post: [] }
        const cellTemplateParts = []

        for (const cellRef of dynamicRow.cellRefs) {
          const parsedCell = parsedCells.get(cellRef)

          if (parsedCell.type === 'static') {
            cellTemplateParts.push({
              letter: parsedCell.letter,
              static: true
            })
          } else if (parsedCell.type === 'dynamic') {
            // check if the cell contain either the start or end of loops
            const loopsInCell = parsedCell.loops?.size > 0 ? Array.from(parsedCell.loops) : []
            let newTextValue = parsedCell.textDetails.getText()
            const textDetailFragments = [...parsedCell.textDetails]

            if (loopsInCell.length > 0) {
              const textMatches = []

              for (const loopInCell of loopsInCell) {
                if (loopInCell.start.cellRef === cellRef) {
                  textMatches.push({
                    startIdx: loopInCell.start.helperCallStartIdx,
                    endIdx: loopInCell.start.helperCallStartIdx + (loopInCell.start.helperCall.length - 1)
                  })

                  if (loopInCell.type === 'block' || loopInCell.type === 'row' || loopInCell.type === 'dynamic') {
                    loopCallsForRow.pre.push(loopInCell.start.helperCall.replace(startLoopRegexp, getLoopCallWithDataHelperReplacer(loopInCell)))
                  }
                }

                if (loopInCell.end.cellRef === cellRef) {
                  textMatches.push({
                    startIdx: loopInCell.end.helperCallStartIdx,
                    endIdx: loopInCell.end.helperCallStartIdx + (loopInCell.end.helperCall.length - 1)
                  })

                  if (loopInCell.type === 'block' || loopInCell.type === 'row' || loopInCell.type === 'dynamic') {
                    loopCallsForRow.post.push(getDataHelperBlockEndCall())
                  }
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

  for (const loopItem of dynamicParts.loops) {
    const startRowPart = templateManager.getRowCellPart(loopItem.start.rowNumber)
    const endRowPart = templateManager.getRowCellPart(loopItem.end.rowNumber)
    const isRowBased = loopItem.type === 'row' || loopItem.type === 'block' || loopItem.type === 'dynamic'
    let outOfLoopPart

    if (isRowBased) {
      const startRowCellRefs = dynamicParts.rows.get(loopItem.start.rowNumber).cellRefs
      const endRowCellRefs = dynamicParts.rows.get(loopItem.end.rowNumber).cellRefs
      const startCellRefIdx = startRowCellRefs.indexOf(loopItem.start.cellRef)
      const endCellRefIdx = endRowCellRefs.indexOf(loopItem.end.cellRef)

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
          rowNumber: type === 'left' ? loopItem.start.rowNumber : loopItem.end.rowNumber,
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

    if (loopItem.type === 'dynamic') {
      startRowPart.pre.push(loopItem.start.helperCall.replace(startLoopRegexp, getLoopCallWithDataHelperReplacer(loopItem)))
      endRowPart.post.unshift(getDataHelperBlockEndCall())

      const startCellPart = templateManager.getRowCellPart(loopItem.start.rowNumber, loopItem.start.letter)

      // we want to put the column loop wrapper around the cell, we also
      // set the hierarchyId of this loop as a child loop
      let loopCallForColumn = loopItem.start.helperCall.replace(startLoopRegexp, getLoopCallWithDataHelperReplacer(loopItem))

      loopCallForColumn = updateHandlebarsParameter(loopCallForColumn, 'cells=', ['cellsT', "'columns'"])
      loopCallForColumn = updateHandlebarsParameter(loopCallForColumn, 'hierarchyId=', ['hierarchyId', `'${loopItem.hierarchyId}#0'`])

      startCellPart.pre.push(loopCallForColumn)
      startCellPart.post.unshift(getDataHelperBlockEndCall())
    } else if (loopItem.type === 'vertical') {
      for (const rowNumber of loopItem.rows) {
        const dynamicRow = dynamicParts.rows.get(rowNumber)

        const cellRefsForLoop = dynamicRow.cellRefs.filter((cellRef) => {
          const parsedCell = parsedCells.get(cellRef)

          return (
            parsedCell.columnNumber >= loopItem.start.columnNumber &&
            parsedCell.columnNumber <= loopItem.end.columnNumber
          )
        })

        const startCellRef = cellRefsForLoop[0]
        const parsedStartCell = parsedCells.get(startCellRef)
        const startCellPart = templateManager.getRowCellPart(rowNumber, parsedStartCell.letter)

        startCellPart.pre.push(loopItem.start.helperCall.replace(startLoopRegexp, getLoopCallWithDataHelperReplacer(loopItem)))
        startCellPart.post.unshift(getDataHelperBlockEndCall())
      }
    } else {
      startRowPart.pre.push(loopItem.start.helperCall.replace(startLoopRegexp, getLoopCallWithDataHelperReplacer(loopItem)))
      endRowPart.post.unshift(getDataHelperBlockEndCall())
    }

    if (outOfLoopPart) {
      // reserve the spot, we are going to fill it bellow
      // when processing out of loop items
      startRowPart.pre.push(outOfLoopPart)
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

        const currentParsedCellRef = parsedCells.get(cellRef)
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

  for (const part of templateManager.getParts()) {
    const pending = [part]

    while (pending.length > 0) {
      const pendingPart = pending.shift()

      if (typeof pendingPart === 'string') {
        dataTemplateParts.push(pendingPart)
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

  // insert a call to resolve any possible last lazy formulas
  dataTemplateParts.push(
    getDataHelperCall('lazyFormulas', null, { isBlock: false })
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
    getParts () {
      return [...parts]
    }
  }
}

function getLoopCallWithDataHelperReplacer (currentLoop) {
  return (match, dataExpressionPart, asPart) => {
    const targetDataExpressionPart = dataExpressionPart.trimEnd()
    const targetAsPart = asPart != null && asPart !== '' ? asPart.trim() : ''

    const props = {
      hierarchyId: currentLoop.hierarchyId,
      start: currentLoop.start.rowNumber
    }

    if (currentLoop.type === 'block') {
      props.end = currentLoop.end.rowNumber
    }

    props.columnStart = currentLoop.start.columnNumber
    props.columnEnd = currentLoop.end.columnNumber

    return getDataHelperCall('loop', props, { valuePart: targetDataExpressionPart, asPart: targetAsPart })
  }
}

function updateHandlebarsParameter (helperCall, parameterStr, keyValue) {
  const startParameterIdx = helperCall.indexOf(parameterStr)

  if (startParameterIdx === -1) {
    return helperCall
  }

  const remainingHelperCall = helperCall.slice(startParameterIdx + parameterStr.length)
  let startValueMatch = remainingHelperCall.match(/["'(@\w]/)

  if (startValueMatch != null) {
    const startIdx = startValueMatch.index
    startValueMatch = startValueMatch[0]
    let endDelimiter

    switch (startValueMatch) {
      case '(':
        endDelimiter = ')'
        break
      case '"':
        endDelimiter = '"'
        break
      case "'":
        endDelimiter = "'"
        break
      default:
        endDelimiter = ' '
        break
    }

    let endIdx = -1

    if (endDelimiter === ' ') {
      // we consider the case where the parameter is the last value of helper call
      const currentRemaining = remainingHelperCall.slice(startIdx)
      const endValueMatch = currentRemaining.match(/[ }]/)

      if (endValueMatch != null) {
        endIdx = startIdx + endValueMatch.index
      }
    } else {
      endIdx = remainingHelperCall.indexOf(endDelimiter, startIdx + 1)

      if (endIdx !== -1) {
        // for the rest of delimiters other than space we want to include the delimiter itself
        endIdx += 1
      }
    }

    if (endIdx !== -1) {
      const [key, value] = keyValue
      return `${helperCall.slice(0, startParameterIdx)}${key}=${value}${helperCall.slice(startParameterIdx + parameterStr.length + endIdx)}`
    }

    return helperCall
  }

  return helperCall
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
