const { createParseCell, getCellInfo } = require('./parseCell')
const { getLogicBlockKind, getLastOpenLogicBlock, assertLoopsInRow } = require('./logicBlocks')
const { addFormula } = require('./formulas')
const { parseCellRef } = require('../../../cellUtils')
const { processOpeningTag, getDataHelperCall } = require('../../../utils')

module.exports.prepareSheetData = prepareSheetData

// parses the rows and cells of the sheet, it registers the content manager of <sheetData> (the rows and
// cells are generated at runtime) and keeps the information of the template that the data template needs:
// the parsed rows and cells, the handlebars blocks (loops, conditions) and the formulas. the metadata of each
// row and cell (used by the helpers at runtime) is stored in the base items of the content manager.
// at the end it replaces <sheetData> with the helper call that renders the final rows and cells
function prepareSheetData (sheet, sheetDataEl, { styleInfo, sharedStringsEls, mergeCells, virtualDefinitions, calcChain, tables, autoFit }) {
  const parsedSheet = {
    // stores information about the rows (in the order of the sheet), the cell refs they contain and
    // what is needed to know if the row is dynamic
    rows: new Map(),
    // stores information about the content of cells
    cells: new Map()
  }

  const dynamicParts = {
    // blocks is a tree of handlebars blocks in the order they appear in the sheet
    // (nested blocks are put as children of a parent block), it stores the information
    // that is general to any block (name, rows, start, end), specific features
    // (like loops) live in logicBlocks and reference the block item
    blocks: [],
    // the stack of blocks that are still open while it is processing
    openBlocks: [],
    // logicBlocks are the blocks that change the layout of rows/cells (loops, conditions) in the order
    // they were started, they are the blocks that are going to be processed in the data template
    logicBlocks: []
  }

  const parseCell = createParseCell(sheet.info, styleInfo, parsedSheet.cells, dynamicParts)

  const formulas = new Map()

  sheet.contentManagers.set('sheetData', {
    prepare: () => {
      const elements = Array.from(sheetDataEl.childNodes ?? [])

      return {
        parts: {
          row: {
            type: 'instanceCollection',
            idAttrs: ['r'],
            // we render rows and cells in the order they were generated,
            // which is the order expected in sheetData
            placement: 'sequence',
            parts: {
              c: {
                type: 'instanceCollection',
                idAttrs: ['r'],
                placement: 'sequence'
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

        const mergeStartLetterMap = mergeCells.getStartedInRow(rowNumber)

        if (mergeStartLetterMap != null) {
          ctx.baseItemData.mergeStartLetterMap = mergeStartLetterMap
        }

        if (virtualDefinitions.rows.has(rowNumber)) {
          ctx.baseItemData.virtual = true
        }

        const parsedRow = {
          number: rowNumber,
          cellRefs: [],
          hasDynamicContent: false,
          isPartOfLogicBlock: getLastOpenLogicBlock(dynamicParts) != null
        }

        parsedSheet.rows.set(rowNumber, parsedRow)
        ctx.data.row = parsedRow

        for (const openBlock of dynamicParts.openBlocks) {
          openBlock.rows.add(rowNumber)
        }

        ctx.addOnFinish(() => {
          assertLoopsInRow(sheet.path, dynamicParts, rowNumber, isLastRow)
        })
      } else {
        const cellEl = el
        const cellRef = cellEl.getAttribute('r')
        const parsedCellRef = parseCellRef(cellRef)
        const cellMetadata = {}

        ctx.data.row.cellRefs.push(cellRef)

        if (virtualDefinitions.cells.has(cellRef)) {
          cellMetadata.virtual = true
        }

        // search if we need to update some calc cell
        if (calcChain.hasEntry(cellRef, sheet.info.id)) {
          cellMetadata.calcChainEntry = true
        }

        // check if the table needs some update related to table
        const matchedTablePart = tables.matchCell(cellRef)

        if (matchedTablePart) {
          cellMetadata.tablePart = matchedTablePart
        }

        const styleId = cellEl.getAttribute('s')

        if (autoFit.isConfigured() && styleId != null) {
          cellMetadata.styleId = styleId
        }

        const cellInfo = getCellInfo(cellEl, sharedStringsEls, sheet.path)

        const parsedCell = parseCell(parsedCellRef, cellInfo, styleId, {
          calculateWidthSize: autoFit.isConfigured(),
          onHbsParts: (part) => {
            if (part.type === 'blockStart' && getLogicBlockKind(part.name) != null) {
              ctx.data.row.isPartOfLogicBlock = true
            }
          },
          onWidthSize: (widthSize) => {
            cellMetadata.autoFitWidth = widthSize
          }
        })

        if (parsedCell.type === 'dynamic') {
          ctx.data.row.hasDynamicContent = true
        } else if (parsedCell.type === 'static' && parsedCell.formula) {
          cellMetadata.formulaId = addFormula(formulas, cellRef, parsedCellRef, parsedCell.formula)
        }

        Object.assign(ctx.baseItemData, cellMetadata)
      }
    }
  })

  return {
    parsedSheet,
    dynamicParts,
    formulas,
    finish () {
      const newSheetDataEl = sheetDataEl.cloneNode()

      // replacing sheetData with a helper call that will re-create the final row and cell tags
      newSheetDataEl.appendChild(
        processOpeningTag(sheet.doc, false, getDataHelperCall('renderContent', {
          name: 'sheetData'
        }, { isBlock: false }))
      )

      // fast way to remove children, iterating all children and using .removeChild is
      // very slow in big documents
      sheetDataEl.parentNode.replaceChild(
        newSheetDataEl,
        sheetDataEl
      )
    }
  }
}
