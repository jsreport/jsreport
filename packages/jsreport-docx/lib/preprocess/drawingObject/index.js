const processImage = require('./image')
const processChart = require('./chart')
const { nodeListToArray } = require('../../utils')

module.exports = (files, headerFooterRefs) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentDoc = documentFile.doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const toProcess = [{ doc: documentDoc, relsDoc: documentRelsDoc }]

  for (const rResult of headerFooterRefs) {
    if (rResult.relsDoc == null) {
      continue
    }

    toProcess.push({ doc: rResult.doc, relsDoc: rResult.relsDoc })
  }

  for (const { doc: targetDoc, relsDoc: targetRelsDoc } of toProcess) {
    const drawingEls = nodeListToArray(targetDoc.getElementsByTagName('w:drawing'))

    drawingEls.forEach((drawingEl) => {
      processImage(files, targetDoc, drawingEl, targetRelsDoc)
      processChart(files, drawingEl, documentFile, targetRelsDoc)
    })
  }
}
