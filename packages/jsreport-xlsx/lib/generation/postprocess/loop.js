const { DOMParser } = require('@xmldom/xmldom')
const { col2num } = require('xlsx-coordinates')
const recursiveStringReplaceAsync = require('../../recursiveStringReplaceAsync')
const stringReplaceAsync = require('../../stringReplaceAsync')
const { nodeListToArray, isWorksheetFile, serializeXml, getSheetInfo } = require('../../utils')

module.exports = async (files) => {
  const workbookPath = 'xl/workbook.xml'
  const workbookDoc = files.find((f) => f.path === workbookPath).doc
  const workbookRelsDoc = files.find((file) => file.path === 'xl/_rels/workbook.xml.rels').doc
  const calcChainDoc = files.find((f) => f.path === 'xl/calcChain.xml')?.doc
  const workbookSheetsEls = nodeListToArray(workbookDoc.getElementsByTagName('sheet'))
  const workbookRelsEls = nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship'))

  for (const sheetFile of files.filter((f) => isWorksheetFile(f.path))) {
    const sheetInfo = getSheetInfo(sheetFile.path, workbookSheetsEls, workbookRelsEls)

    if (sheetInfo == null) {
      throw new Error(`Could not find sheet info for sheet at ${sheetFile.path}`)
    }

    const outOfLoopItems = new Map()

    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<outOfLoop>',
      '</outOfLoop>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const outOfLoopEl = doc.documentElement
        const childNodes = nodeListToArray(outOfLoopEl.childNodes)
        const pendingReplacements = []
        let itemIndex

        for (const childNode of childNodes) {
          if (childNode.nodeName === 'item') {
            itemIndex = parseInt(childNode.textContent, 10)
          } else if (childNode.nodeName === 'data') {
            const dataChildNodes = nodeListToArray(childNode.childNodes)
            const generatedEls = []

            for (const dataChildNode of dataChildNodes) {
              generatedEls.push(dataChildNode.cloneNode(true))
            }

            pendingReplacements.push({
              elements: generatedEls
            })
          }
        }

        if (!outOfLoopItems.has(itemIndex)) {
          outOfLoopItems.set(itemIndex, { pendingReplacements: [] })
        }

        outOfLoopItems.get(itemIndex).pendingReplacements.push(...pendingReplacements)

        return ''
      }
    )

    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<outOfLoopPlaceholder>',
      '</outOfLoopPlaceholder>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const itemEl = doc.documentElement.firstChild
        const itemIndex = parseInt(itemEl.textContent, 10)
        const pendingReplacements = outOfLoopItems.get(itemIndex)?.pendingReplacements

        if (pendingReplacements == null) {
          throw new Error(`outOfLoopPlaceholder can not find metadata with index "${itemIndex}"`)
        }

        const pendingReplacement = pendingReplacements.shift()

        if (pendingReplacement == null) {
          throw new Error('outOfLoopPlaceholder does not match with pending elements to replace')
        }

        const generatedEls = pendingReplacement.elements

        let newContent = ''

        if (generatedEls == null || generatedEls.length === 0) {
          return newContent
        }

        for (const generatedEl of generatedEls) {
          newContent += serializeXml(generatedEl)
        }

        return newContent
      }
    )

    const updatedCalcChainCountMap = new Map()

    // update the calcChain.xml to the new updated cells
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<calcChainCellUpdated>',
      '</calcChainCellUpdated>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const calcChainCellRefUpdatedEl = doc.documentElement.firstChild
        const calcChainEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

        const matches = calcChainEls.filter((c) => (
          c.getAttribute('i') === sheetInfo.id &&
          c.getAttribute('oldR') === calcChainCellRefUpdatedEl.getAttribute('oldR')
        ))

        const calcChainCellRefEl = matches[matches.length - 1]

        if (calcChainCellRefEl != null) {
          const oldRef = calcChainCellRefEl.getAttribute('oldR')
          const newRef = calcChainCellRefUpdatedEl.getAttribute('r')
          const existingCount = updatedCalcChainCountMap.get(oldRef) || 0

          if (oldRef !== newRef) {
            if (existingCount === 0) {
              calcChainCellRefEl.setAttribute('r', newRef)
            } else {
              const newCalcChainCellRefEl = calcChainCellRefEl.cloneNode(true)
              newCalcChainCellRefEl.setAttribute('r', newRef)
              calcChainCellRefEl.parentNode.insertBefore(newCalcChainCellRefEl, calcChainCellRefEl.nextSibling)
            }
          }

          updatedCalcChainCountMap.set(oldRef, existingCount + 1)
        }

        return ''
      }
    )

    if (calcChainDoc != null) {
      const newCalcChainEls = nodeListToArray(calcChainDoc.getElementsByTagName('c')).filter((c) => c.getAttribute('i') === sheetInfo.id)

      // we clean the oldR attribute that we used for the conditions
      for (const calcChainEl of newCalcChainEls) {
        calcChainEl.removeAttribute('oldR')
      }
    }

    let dimensionUpdatedRef

    // search if we should update the dimension
    sheetFile.data = await stringReplaceAsync(
      sheetFile.data.toString(),
      /<dimensionUpdated [^>]*\/>/g,
      async (val) => {
        const dimensionUpdatedEl = new DOMParser().parseFromString(val).documentElement
        dimensionUpdatedRef = dimensionUpdatedEl.getAttribute('ref')

        return ''
      }
    )

    // update the dimension with latest cellRef values
    if (dimensionUpdatedRef != null) {
      sheetFile.data = await stringReplaceAsync(
        sheetFile.data.toString(),
        /<dimension [^>]*\/>/g,
        async (val) => {
          const dimensionEl = new DOMParser().parseFromString(val).documentElement

          dimensionEl.setAttribute('ref', dimensionUpdatedRef)

          return serializeXml(dimensionEl)
        }
      )
    }

    // check if we need to updates tables
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<tablesUpdated>',
      '</tablesUpdated>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const tablesUpdatedEl = doc.documentElement
        const tableUpdatedEls = nodeListToArray(tablesUpdatedEl.getElementsByTagName('tableUpdated'))

        for (const tableUpdatedEl of tableUpdatedEls) {
          const tableDoc = files.find((f) => f.path === tableUpdatedEl.getAttribute('file'))?.doc

          if (tableDoc == null) {
            continue
          }

          tableDoc.documentElement.setAttribute('ref', tableUpdatedEl.getAttribute('ref'))

          const autoFilterEl = tableDoc.getElementsByTagName('autoFilter')[0]
          const autoFilterRefUpdatedEl = nodeListToArray(tableUpdatedEl.childNodes).find((el) => el.nodeName === 'autoFilterRef')

          if (autoFilterEl != null && autoFilterRefUpdatedEl != null) {
            autoFilterEl.setAttribute('ref', autoFilterRefUpdatedEl.getAttribute('ref'))
          }
        }

        return ''
      }
    )

    const autofitCols = {}

    // check if we need to update the cols with autofit information
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<autofitUpdated>',
      '</autofitUpdated>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const autofitUpdatedEl = doc.documentElement
        const colEls = nodeListToArray(autofitUpdatedEl.getElementsByTagName('col'))

        for (const colEl of colEls) {
          const letter = colEl.getAttribute('ref')
          const size = parseFloat(colEl.getAttribute('size'))
          autofitCols[letter] = size
        }

        return ''
      }
    )

    if (Object.keys(autofitCols).length > 0) {
      sheetFile.data = await recursiveStringReplaceAsync(
        sheetFile.data.toString(),
        '<cols>',
        '</cols>',
        'g',
        async (val, content, hasNestedMatch) => {
          if (hasNestedMatch) {
            return val
          }

          const doc = new DOMParser().parseFromString(val)
          const colsEl = doc.documentElement

          const existingColEls = nodeListToArray(colsEl.getElementsByTagName('col'))

          // cleaning
          for (let idx = 0; idx < colsEl.childNodes.length; idx++) {
            const el = colsEl.childNodes[idx]
            colsEl.removeChild(el)
          }

          for (const [colLetter, colPxSize] of Object.entries(autofitCols)) {
            const colSizeInNumberCharactersMDW = (colPxSize / 6.5) + 2 // 2 is for padding
            const colNumber = col2num(colLetter) + 1

            const existingColEl = existingColEls.find((el) => (
              el.getAttribute('min') === colNumber.toString() &&
              el.getAttribute('max') === colNumber.toString()
            ))

            if (existingColEl != null) {
              existingColEl.setAttribute('width', colSizeInNumberCharactersMDW)
              existingColEl.setAttribute('customWidth', '1')
            } else {
              const newCol = doc.createElement('col')
              newCol.setAttribute('min', colNumber.toString())
              newCol.setAttribute('max', colNumber.toString())
              newCol.setAttribute('width', colSizeInNumberCharactersMDW)
              newCol.setAttribute('customWidth', '1')
              colsEl.appendChild(newCol)
            }
          }

          return serializeXml(colsEl)
        }
      )
    }
  }
}
