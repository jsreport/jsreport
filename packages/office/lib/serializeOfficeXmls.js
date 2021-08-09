const fs = require('fs')
const saveXmlsToOfficeFile = require('./saveXmlsToOfficeFile')

module.exports = async ({ reporter, files, officeDocumenType }, req, res) => {
  const {
    pathToFile: officeFileName
  } = await reporter.writeTempFile((uuid) => `${uuid}.${officeDocumenType}`, '')

  await saveXmlsToOfficeFile({
    outputPath: officeFileName,
    files
  })

  reporter.logger.debug('Successfully zipped now.', req)
  res.stream = fs.createReadStream(officeFileName)
}
