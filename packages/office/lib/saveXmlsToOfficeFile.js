const fs = require('fs')
const archiver = require('archiver')

module.exports = async function saveXmlsToOfficeFile ({ outputPath, files }) {
  const pathsInZip = new Set()

  // validates that there are no duplicated paths in the files,
  // otherwise we will end with broken document because of it.
  for (const file of files) {
    if (pathsInZip.has(file.path)) {
      throw new Error(`Could not complete office zip file. Duplicated entry found for: ${file.path}`)
    }

    pathsInZip.add(file.path)
  }

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
