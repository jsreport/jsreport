const fs = require('fs')
const archiver = require('archiver')

module.exports = async function saveXmlsToOfficeFile ({ outputPath, files }) {
  await new Promise((resolve, reject) => {
    const archive = archiver('zip')
    const output = fs.createWriteStream(outputPath)

    output.on('close', () => {
      resolve()
    })

    output.on('error', (err) => reject(err))
    archive.on('error', (err) => reject(err))

    archive.pipe(output)

    files.forEach((f) => archive.append(f.data, { name: f.path }))

    archive.finalize()
  })
}
