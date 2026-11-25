const { createContentCollectionManager } = require('@jsreport/office')
const { createIdCollectionManager } = require('../../idManager')
const { processOpeningTag, getDataHelperCall } = require('../../../utils')

module.exports.prepareRelationships = prepareRelationships

// keeps the relationships of the sheet (the files the sheet uses, like tables or drawings), it registers
// the id manager (for new relationship ids) and the content manager of the relationships, at the end it
// replaces the content of the relationships file with the helper call that renders the final relationships
function prepareRelationships (sheet, sharedData) {
  const sheetRelsDoc = sheet.relsFile?.doc

  if (sheetRelsDoc) {
    const childrenEls = Array.from(sheetRelsDoc.documentElement.childNodes)

    const localIdManagers = createIdCollectionManager()
    const localContentManagers = createContentCollectionManager()

    localIdManagers.set('relationship', {
      prefix: 'rId',
      fromItems: {
        getIds: () => childrenEls.filter((el) => el.nodeName === 'Relationship').map((el) => el.getAttribute('Id')),
        getNumberId: (id) => {
          const regExp = /^rId(\d+)$/
          const match = regExp.exec(id)

          if (!match || !match[1]) {
            return null
          }

          return parseInt(match[1], 10)
        }
      }
    })

    localContentManagers.set('Relationships', {
      prepare: () => {
        return {
          parts: {
            Relationship: {
              type: 'simpleCollection',
              idAttrs: ['Id']
            }
          },
          elements: childrenEls
        }
      }
    })

    sharedData.fileDataMap.set(sheet.relsFile.path, {
      idManagers: localIdManagers,
      contentManagers: localContentManagers
    })
  }

  return {
    // replaces the content of the relationships file with the helper call that renders the final relationships
    finish () {
      if (sheet.relsFile == null) {
        return
      }

      // fast way to remove children, iterating all children and using .removeChild is
      // very slow in big documents
      sheet.relsFile.doc.replaceChild(
        sheet.relsFile.doc.documentElement.cloneNode(),
        sheet.relsFile.doc.documentElement
      )

      sheet.relsFile.doc.documentElement.appendChild(
        processOpeningTag(sheet.relsFile.doc, false, getDataHelperCall('renderContent', {
          name: 'Relationships'
        }, { isBlock: false }))
      )
    }
  }
}
