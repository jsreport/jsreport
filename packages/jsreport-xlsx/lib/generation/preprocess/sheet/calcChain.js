const { createContentCollectionManager } = require('@jsreport/office')
const { processOpeningTag, getDataHelperCall } = require('../../../utils')

module.exports.prepareCalcChain = prepareCalcChain

const calcChainFilePath = 'xl/calcChain.xml'

// keeps the calcChain of the workbook (the order in which the formula cells are calculated), it registers
// the content manager of the calcChain (the cells add its entries at runtime) and at the end it replaces
// the content of the calcChain with the helper call that renders the final entries
function prepareCalcChain (files, sharedData, workbookRelsEls) {
  const calcChainDoc = files.find((f) => f.path === calcChainFilePath)?.doc
  let calcChainContentManagers

  if (calcChainDoc != null) {
    sharedData.calcChainFilePath = calcChainFilePath

    calcChainContentManagers = createContentCollectionManager()

    calcChainContentManagers.set('calcChain', {
      prepare: () => {
        const elements = Array.from(calcChainDoc.documentElement.childNodes)

        return {
          parts: {
            c: {
              type: 'instanceCollection',
              idAttrs: ['r', 'i']
            }
          },
          elements
        }
      }
    })

    sharedData.fileDataMap.set(calcChainFilePath, {
      contentManagers: calcChainContentManagers,
      relationshipId: workbookRelsEls.find((el) => (
        el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain'
      ))?.getAttribute('Id')
    })
  }

  return {
    // checks if the cell of the sheet has an entry in the calcChain
    hasEntry (cellRef, sheetId) {
      return Boolean(calcChainContentManagers?.get?.('calcChain')?.parts?.get?.('c')?.hasBase([cellRef, sheetId]))
    },
    // replaces the content of the calcChain with the helper call that renders the final entries
    finish () {
      if (calcChainDoc == null) {
        return
      }

      // fast way to remove children, iterating all children and using .removeChild is
      // very slow in big documents
      calcChainDoc.replaceChild(
        calcChainDoc.documentElement.cloneNode(),
        calcChainDoc.documentElement
      )

      calcChainDoc.documentElement.appendChild(
        processOpeningTag(calcChainDoc, false, getDataHelperCall('renderContent', {
          name: 'calcChain'
        }, { isBlock: false }))
      )
    }
  }
}
