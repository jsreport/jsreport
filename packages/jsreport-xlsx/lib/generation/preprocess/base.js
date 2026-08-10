const path = require('path')
const { createContentCollectionManager } = require('@jsreport/office')
const { getDataHelperCall, processOpeningTag } = require('../../utils')

module.exports = ({ files, sharedData, addEndCallback }) => {
  const tableFiles = files.filter(f => isTableFile(f.path))

  sharedData.idManagers.set('tables', {
    prefix: '',
    fromItems: {
      getIds: () => {
        const ids = []

        for (const tableFile of tableFiles) {
          const tableDoc = tableFile.doc
          const id = tableDoc.documentElement.getAttribute('id')

          if (id == null || id === '') {
            throw new Error(`Table file ${tableFile.path} does not have a valid id attribute`)
          }

          ids.push(id)
        }

        return ids
      },
      getNumberId: (id) => {
        return parseInt(id, 10)
      }
    }
  })

  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml')
  const contentTypesContentManagers = createContentCollectionManager()

  sharedData.fileDataMap.set(contentTypesFile.path, {
    contentManagers: contentTypesContentManagers
  })

  contentTypesContentManagers.set('Types', {
    prepare: (ctx) => {
      const elements = Array.from(contentTypesFile.doc.documentElement.childNodes)

      ctx.data.lastElForPart = new Map()

      return {
        parts: {
          Default: {
            type: 'simpleCollection',
            idAttrs: ['Extension']
          },
          Override: {
            type: 'simpleCollection',
            idAttrs: ['PartName']
          }
        },
        elements
      }
    },
    onInit: (elements, ctx) => {
      const defaultEls = []
      const overrideEls = []

      for (const element of elements) {
        if (element.nodeName === 'Default') {
          defaultEls.push(element)
        } else if (element.nodeName === 'Override') {
          overrideEls.push(element)
        }
      }

      ctx.data.lastElForPart.set('Default', defaultEls.at(-1))
      ctx.data.lastElForPart.set('Override', overrideEls.at(-1))

      if (defaultEls.length > 0 && overrideEls.length > 0) {
        return
      }

      if (defaultEls.length === 0) {
        ctx.addSlot('Default')
      }

      if (overrideEls.length === 0) {
        ctx.addSlot('Override')
      }
    },
    onElementPart: (el, ctx) => {
      if (ctx.data.lastElForPart.get(el.nodeName) === el) {
        ctx.addSlot(el.nodeName)
      }
    }
  })

  addEndCallback(() => {
    const contentCallForTypes = getDataHelperCall('renderContent', { name: 'Types' }, { isBlock: false })

    // fast way to remove children, iterating all children and using .removeChild is
    // very slow in big documents
    contentTypesFile.doc.replaceChild(
      contentTypesFile.doc.documentElement.cloneNode(),
      contentTypesFile.doc.documentElement
    )

    contentTypesFile.doc.documentElement.appendChild(
      processOpeningTag(contentTypesFile.doc, false, contentCallForTypes)
    )
  })
}

function isTableFile (filePath) {
  return path.posix.dirname(filePath) === 'xl/tables' && filePath.endsWith('.xml')
}
