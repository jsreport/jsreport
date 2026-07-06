const { nodeListToArray } = require('../utils')

module.exports = (files, headerFooterRefs, sharedData) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentDoc = documentFile.doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

  sharedData.idManagers.set('documentRels', {
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

  sharedData.idManagers.set('docPr', {
    fromItems: {
      getIds: () => {
        const toProcess = [{ doc: documentDoc }]
        const results = []

        for (const rResult of headerFooterRefs) {
          if (rResult.relsDoc == null) {
            continue
          }

          toProcess.push({ doc: rResult.doc })
        }

        for (const { doc: targetDoc } of toProcess) {
          const drawingEls = nodeListToArray(targetDoc.getElementsByTagName('w:drawing'))

          drawingEls.forEach((drawingEl) => {
            const docPrEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:docPr')

            if (!docPrEl) {
              return
            }

            results.push(docPrEl.getAttribute('id'))
          })
        }

        return results
      },
      getNumberId: (id) => {
        return parseInt(id, 10)
      }
    }
  })
}
