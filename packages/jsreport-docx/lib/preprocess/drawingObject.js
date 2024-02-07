const processImage = require('./processImage')
const processChart = require('./processChart')
const { nodeListToArray } = require('../utils')

module.exports = (files, headerFooterRefs) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentDoc = documentFile.doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc
  const toProcess = [{ doc: documentDoc, relsDoc: documentRelsDoc }]
  let maxDocPrId

  for (const rResult of headerFooterRefs) {
    if (rResult.relsDoc == null) {
      continue
    }

    toProcess.push({ doc: rResult.doc, relsDoc: rResult.relsDoc })
  }

  for (const { doc: targetDoc, relsDoc: targetRelsDoc } of toProcess) {
    const drawingEls = nodeListToArray(targetDoc.getElementsByTagName('w:drawing'))

    drawingEls.forEach((drawingEl) => {
      const docPrId = getDocPrId(drawingEl)

      if (
        docPrId != null &&
        (
          maxDocPrId == null ||
          (maxDocPrId != null && docPrId > maxDocPrId)
        )
      ) {
        maxDocPrId = docPrId
      }

      processImage(files, targetDoc, drawingEl, targetRelsDoc)
      processChart(files, drawingEl, documentFile, targetRelsDoc)
    })
  }

  if (maxDocPrId != null) {
    contentTypesDoc.documentElement.setAttribute('drawingMaxDocPrId', maxDocPrId)
  }
}

function getDocPrId (drawingEl) {
  const docPrEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:docPr')

  if (!docPrEl) {
    return
  }

  const id = parseInt(docPrEl.getAttribute('id'), 10)

  if (isNaN(id)) {
    return
  }

  return id
}
