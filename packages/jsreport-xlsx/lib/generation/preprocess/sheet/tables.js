const path = require('path')
const { parseCellRef, getColumnFor } = require('../../../cellUtils')
const { processOpeningTag, getDataHelperCall } = require('../../../utils')

module.exports.prepareTables = prepareTables

// keeps the tables of the sheet, their refs (and the ref of its autoFilter) are updated at runtime and
// maybe its columns names (if they are dynamic). it registers the content manager of <tableParts> (a table
// inside a loop generates new tables at runtime), at the end it replaces <tableParts> with the helper
// call that renders the final tables and puts the variables of the runtime values in the table documents
function prepareTables (sheet, files) {
  const tableParts = []

  // check if there are tables, if there are we need to update its refs, and maybe its
  // columns names (if they are dynamic) at runtime
  const tablePartsEl = sheet.doc.getElementsByTagName('tableParts')[0]

  if (tablePartsEl?.childNodes.length > 0) {
    let tablePartEls = []

    sheet.contentManagers.set('tableParts', {
      prepare: () => {
        const elements = Array.from(tablePartsEl.childNodes)

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
      onInit: (elements) => {
        tablePartEls = elements.filter((el) => el.nodeName === 'tablePart')
      }
    })

    for (const tablePartEl of tablePartEls) {
      const tableRelId = tablePartEl.getAttribute('r:id')

      const tableRelTarget = Array.from(
        sheet.relsFile.doc.documentElement.childNodes
      ).find((n) => (
        n.nodeName === 'Relationship' && n.getAttribute('Id') === tableRelId
      ))?.getAttribute('Target')

      if (tableRelTarget == null) {
        throw new Error(`Could not find relationship target for table reference in sheet at ${sheet.path}`)
      }

      const tableFilePath = path.posix.join(path.posix.dirname(sheet.path), tableRelTarget)
      const tableDoc = files.find((file) => file.path === tableFilePath).doc

      if (tableDoc == null) {
        throw new Error(`Could not find table document referenced in sheet at ${sheet.path}`)
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
          throw new Error(`Unexpected range ref format "${rangeRef}" in table reference in sheet at ${sheet.path}`)
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

  return {
    // the tables of the sheet (with the metadata of their refs and dynamic columns)
    getParts () {
      return tableParts
    },
    // the table that the cell is part of ({ idx, ref, dynamicColumn }), the cell is part of the table when it is
    // the start or end of one of its refs or when it is the cell of a dynamic column name. null when the cell
    // is not part of any table
    matchCell (cellRef) {
      return tableParts.reduce((acc, t, tIdx) => {
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
    },
    // replaces <tableParts> with the helper call that renders the final tables and puts the variables of
    // the runtime values (id, name, refs, dynamic column names) in the table documents
    finish () {
      // update tablePart in sheet
      if (tablePartsEl != null) {
        const newTablePartsEl = tablePartsEl.cloneNode()
        newTablePartsEl.setAttribute('count', '{{@newTablePartsCount}}')

        const parentEl = tablePartsEl.parentNode
        // fast way to remove children, iterating all children and using .removeChild is
        // very slow in big documents
        parentEl.replaceChild(newTablePartsEl, tablePartsEl)

        newTablePartsEl.appendChild(
          processOpeningTag(sheet.doc, false, getDataHelperCall('renderContent', {
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
    }
  }
}
