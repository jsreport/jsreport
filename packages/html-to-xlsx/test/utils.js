const { DOMParser } = require('@xmldom/xmldom')
const sax = require('sax')
const { decompress } = require('@jsreport/office')

module.exports.getDocumentsFromXlsxBuf = async function getDocumentsFromXlsxBuf (xlsxBuf, documentPaths, options = {}) {
  const files = await decompress()(xlsxBuf)
  const targetFiles = []

  for (const documentPath of documentPaths) {
    const fileRef = files.find((f) => f.path === documentPath)
    targetFiles.push(fileRef)
  }

  const result = targetFiles.map((file) => {
    if (file == null) {
      return null
    }

    const fileContent = file.data.toString()

    if (options.strict) {
      // strict parser will fail on invalid entities found in xml
      const parser = sax.parser(true)

      try {
        parser.write(fileContent).close()
      } catch (stringParsingError) {
        stringParsingError.message = `Error parsing xml file at ${file.path}: ${stringParsingError.message}`
        throw stringParsingError
      }
    }

    return new DOMParser().parseFromString(fileContent)
  })

  if (options.returnFiles) {
    return {
      files,
      documents: result
    }
  }

  return result
}
