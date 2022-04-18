const { DOMParser } = require('@xmldom/xmldom')
const { col2num } = require('xlsx-coordinates')
const recursiveStringReplaceAsync = require('../../recursiveStringReplaceAsync')
const stringReplaceAsync = require('../../stringReplaceAsync')
const { nodeListToArray, isWorksheetFile, serializeXml } = require('../../utils')

module.exports = async (files) => {
  const calcChainDoc = files.find((f) => f.path === 'xl/calcChain.xml')?.doc

  for (const sheetFile of files.filter((f) => isWorksheetFile(f.path))) {
    // update the cells in loop that are meant to auto detect the content
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<c( [^>]*__detectCellContent__="true"[^>]*)>',
      '</c>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const cellEl = doc.documentElement

        cellEl.removeAttribute('__detectCellContent__')

        const infoEl = nodeListToArray(cellEl.getElementsByTagName('info'))[0]
        const typeEl = nodeListToArray(infoEl.getElementsByTagName('type'))[0]
        const contentEl = nodeListToArray(infoEl.getElementsByTagName('content'))[0]

        cellEl.setAttribute('t', typeEl.textContent)
        cellEl.removeChild(infoEl)

        for (const childEl of nodeListToArray(contentEl.childNodes)) {
          cellEl.appendChild(childEl)
        }

        return serializeXml(cellEl)
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
        const matches = calcChainEls.filter((c) => c.getAttribute('oldR') === calcChainCellRefUpdatedEl.getAttribute('oldR'))
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
      const newCalcChainEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // we clean the oldR attribute that we used for the conditions
      for (const calcChainEl of newCalcChainEls) {
        calcChainEl.removeAttribute('oldR')
      }
    }

    const formulasUpdated = []

    // collect all the formulas that were updated
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<formulasUpdated>',
      '</formulasUpdated>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const items = nodeListToArray(doc.documentElement.firstChild.childNodes).filter((el) => el.nodeName === 'f')

        formulasUpdated.push(...items.map((item) => item.textContent))

        return ''
      }
    )

    // replace the formulas to its original places
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<formulaUpdated>',
      '</formulaUpdated>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const fEl = doc.documentElement.firstChild
        const formulaIndex = parseInt(fEl.getAttribute('formulaIndex'), 10)
        fEl.removeAttribute('formulaIndex')
        fEl.textContent = formulasUpdated[formulaIndex]

        return serializeXml(fEl)
      }
    )

    // remove the mergeCellUpdated elements
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<mergeCellUpdated>',
      '</mergeCellUpdated>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        return ''
      }
    )

    const newMergeCellEls = []

    // check if we need to update the <mergeCells> element
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<mergeCellsUpdated>',
      '</mergeCellsUpdated>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const mergeCellsItemEl = doc.documentElement.firstChild
        const mergeCellEls = nodeListToArray(mergeCellsItemEl.getElementsByTagName('mergeCell'))

        for (const mergeCellEl of mergeCellEls) {
          newMergeCellEls.push(mergeCellEl)
        }

        return ''
      }
    )

    if (newMergeCellEls.length > 0) {
      sheetFile.data = await recursiveStringReplaceAsync(
        sheetFile.data.toString(),
        '<mergeCells( [^>]*[^>]*)?',
        '</mergeCells>',
        'g',
        async (val, content, hasNestedMatch) => {
          if (hasNestedMatch) {
            return val
          }

          const doc = new DOMParser().parseFromString(val)
          const mergeCellsEl = doc.documentElement

          while (mergeCellsEl.firstChild != null) {
            mergeCellsEl.removeChild(mergeCellsEl.firstChild)
          }

          mergeCellsEl.setAttribute('count', newMergeCellEls.length)

          for (const newMergeCellEl of newMergeCellEls) {
            mergeCellsEl.appendChild(newMergeCellEl)
          }

          return serializeXml(mergeCellsEl)
        }
      )
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
