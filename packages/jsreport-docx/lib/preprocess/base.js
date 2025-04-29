const { nodeListToArray } = require('../utils')

module.exports = (files, sharedData) => {
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

  sharedData.idManagers.set('documentRels', {
    prefix: 'rId',
    fromItems: {
      getIds: () => nodeListToArray(documentRelsDoc.getElementsByTagName('Relationship')).map((el) => el.getAttribute('Id')),
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
}
