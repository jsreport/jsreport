// export file utilities when testing export file
const os = require('os')
const path = require('path')
const extractZip = require('extract-zip')
const ZFolder = require('zfolder')

const desktopPath = path.join(os.homedir(), 'Desktop')

async function extract (zipPathArg) {
  if (!zipPathArg) {
    throw new Error('zipPath can not be empty')
  }

  if (!zipPathArg.endsWith('.zip')) {
    throw new Error('zipPath does not have .zip extension')
  }

  const zipPath = path.resolve(desktopPath, zipPathArg)

  const zipFilename = path.basename(zipPath, '.zip')

  const outputPath = path.join(desktopPath, zipFilename)

  await extractZip(zipPath, { dir: outputPath })
  console.log(`extracted into ${outputPath}`)
}

async function create (inputFolder) {
  const inputFolderPath = path.resolve(desktopPath, inputFolder)
  const outputPath = path.join(desktopPath, `${path.basename(inputFolderPath)}-new.zip`)

  await ZFolder(inputFolderPath, outputPath)
  console.log(`created into ${outputPath}`)
}

async function main () {
  try {
    const args = process.argv.slice(2)
    const command = args[0]

    if (command === 'extract') {
      await extract(args[1])
    } else if (command === 'create') {
      await create(args[1])
    } else {
      throw new Error(`Unknown command "${command}"`)
    }
  } catch (e) {
    console.error('Error while executing')
    console.error(e)
  }
}

main()
