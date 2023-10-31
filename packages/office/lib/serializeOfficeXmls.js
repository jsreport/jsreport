const saveXmlsToOfficeFile = require('./saveXmlsToOfficeFile')

module.exports = async ({ reporter, files, officeDocumentType }, req, res) => {
  const {
    pathToFile: officeOutputFilePath
  } = await reporter.writeTempFile((uuid) => `${uuid}.${officeDocumentType}`, '')

  await saveXmlsToOfficeFile({
    outputPath: officeOutputFilePath,
    files
  })

  reporter.logger.debug('Successfully zipped now.', req)

  return officeOutputFilePath
}
