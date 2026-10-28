const { parseCellRef } = require('../../../cellUtils')
const { nodeListToArray, processOpeningTag, processClosingTag, getDataHelperCall } = require('../../../utils')

module.exports.prepareMergeCells = prepareMergeCells

// keeps the merged cells of the sheet, it registers the content manager of <mergeCells> (the rows add the
// new merged cells at runtime) and knows the merged cells that start in each row. at the end it replaces
// <mergeCells> with the helper call that renders the final merged cells
function prepareMergeCells (sheet) {
  const mergeCellsEl = sheet.doc.getElementsByTagName('mergeCells')[0]
  // stores the merge cell ranges by the row number
  const mergeCellRangesByStartRowNumberMap = new Map()

  if (mergeCellsEl) {
    sheet.contentManagers.set('mergeCells', {
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

  return {
    // the merged cells that start in the row (start column letter -> range ref)
    getStartedInRow (rowNumber) {
      return mergeCellRangesByStartRowNumberMap.get(rowNumber)
    },
    // the range refs of all the merged cells of the template
    getRefs () {
      if (mergeCellsEl == null) {
        return []
      }

      return nodeListToArray(mergeCellsEl.childNodes).filter((el) => el.nodeName === 'mergeCell').map((el) => el.getAttribute('ref'))
    },
    // replaces <mergeCells> with a helper call that will generate the final merge cells definitions
    finish () {
      if (mergeCellsEl == null) {
        return
      }

      const newMergeCellsEl = mergeCellsEl.cloneNode()
      newMergeCellsEl.setAttribute('count', '{{@newMergeCellsCount}}')

      const parentEl = mergeCellsEl.parentNode

      // fast way to remove children, iterating all children and using .removeChild is
      // very slow in big documents
      parentEl.replaceChild(newMergeCellsEl, mergeCellsEl)

      newMergeCellsEl.appendChild(
        processOpeningTag(sheet.doc, false, getDataHelperCall('renderContent', {
          name: 'mergeCells'
        }, { isBlock: false }))
      )

      processOpeningTag(sheet.doc, newMergeCellsEl, '{{#if @newMergeCellsCount}}')
      processClosingTag(sheet.doc, newMergeCellsEl, '{{/if}}')
    }
  }
}
