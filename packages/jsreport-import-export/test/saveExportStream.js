const path = require('path')
const fs = require('fs')

module.exports = function saveExportStream (reporter, stream) {
  return new Promise(function (resolve, reject) {
    const exportPath = path.join(reporter.options.tempDirectory, 'myExport.jsrexport')
    const exportDist = fs.createWriteStream(exportPath)

    stream.on('error', reject)
    exportDist.on('error', reject)

    exportDist.on('finish', function () {
      resolve(exportPath)
    })

    stream.pipe(exportDist)
  })
}
