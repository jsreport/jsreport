const path = require('path')
const { DOMParser } = require('@xmldom/xmldom')
const chart = require('./chart')
const stringReplaceAsync = require('../../../stringReplaceAsync')
const { isWorksheetFile, isWorksheetRelsFile } = require('../../../utils')

module.exports = async (files, sharedData) => {
  for (const sheetFile of files.filter((f) => isWorksheetFile(f.path))) {
    const sheetFilepath = sheetFile.path
    const sheetFilename = path.posix.basename(sheetFilepath)
    const sheetDoc = sheetFile.doc

    const sheetRelsDoc = files.find((file) => isWorksheetRelsFile(sheetFilename, file.path))?.doc

    if (sheetRelsDoc == null) {
      continue
    }

    sheetFile.data = await stringReplaceAsync(
      sheetFile.data.toString(),
      /<drawing [^>]*\/>/g,
      async (val) => {
        const drawingEl = new DOMParser().parseFromString(val).documentElement

        await chart(files, sharedData, {
          sheetFilepath,
          sheetFilename,
          sheetDoc,
          sheetRelsDoc
        }, drawingEl)

        return val
      }
    )
  }
}
