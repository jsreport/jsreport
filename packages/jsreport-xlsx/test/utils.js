const { DOMParser } = require('@xmldom/xmldom')
const { decompress } = require('@jsreport/office')

module.exports.getDocumentsFromXlsxBuf = async function getDocumentsFromXlsxBuf (xlsxBuf, documentPaths, options = {}) {
  const files = await decompress()(xlsxBuf)
  const targetFiles = []

  for (const documentPath of documentPaths) {
    const fileRef = files.find((f) => f.path === documentPath)
    targetFiles.push(fileRef)
  }

  const result = targetFiles.map((file) => (
    file != null ? new DOMParser().parseFromString(file.data.toString()) : null
  ))

  if (options.returnFiles) {
    return {
      files,
      documents: result
    }
  }

  return result
}
