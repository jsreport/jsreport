const path = require('path')
const processChart = require('./chart')
const { nodeListToArray, isWorksheetFile, isWorksheetRelsFile } = require('../../../utils')

module.exports = function drawingObject (parameters) {
  const { files } = parameters

  for (const f of files.filter((f) => isWorksheetFile(f.path))) {
    const sheetFilepath = f.path
    const sheetFilename = path.posix.basename(sheetFilepath)
    const sheetDoc = f.doc

    const sheetRelsDoc = files.find((file) => isWorksheetRelsFile(sheetFilename, file.path))?.doc

    if (sheetRelsDoc == null) {
      continue
    }

    const drawingEls = nodeListToArray(sheetDoc.getElementsByTagName('drawing'))

    for (const drawingEl of drawingEls) {
      processChart(parameters, {
        sheetFilepath,
        sheetFilename,
        sheetDoc,
        sheetRelsDoc
      }, drawingEl)
    }
  }
}
