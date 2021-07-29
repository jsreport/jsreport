const { nodeListToArray } = require('../utils')
const processImage = require('./processImage')
const processChart = require('./processChart')

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml').doc
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml').doc
  const drawingEls = nodeListToArray(documentFile.getElementsByTagName('w:drawing'))
  let maxDocPrId

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

    processImage(files, drawingEl)
    processChart(files, drawingEl)
  })

  if (maxDocPrId != null) {
    contentTypesFile.documentElement.setAttribute('drawingMaxDocPrId', maxDocPrId)
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
