// export file utilities when testing export file
const os = require('os')
const path = require('path')
const extractZip = require('extract-zip')
const ZFolder = require('zfolder')

const desktopPath = path.join(os.homedir(), 'Desktop')

async function extract (exportFilePathArg) {
  if (!exportFilePathArg) {
    throw new Error('exportFile can not be empty')
  }

  if (!exportFilePathArg.endsWith('.zip') && !exportFilePathArg.endsWith('.jsrexport')) {
    throw new Error('exportFile does not have .zip or .jsrexport extension')
  }

  const exportFilePath = path.resolve(desktopPath, exportFilePathArg)

  const exportFileExt = path.extname(exportFilePath)
  const exportFileBasename = path.basename(exportFilePath, exportFileExt)

  const outputPath = path.join(desktopPath, exportFileBasename)

  await extractZip(exportFilePath, { dir: outputPath })
  console.log(`extracted into ${outputPath}`)
}

async function create (inputFolder) {
  const inputFolderPath = path.resolve(desktopPath, inputFolder)
  const outputPath = path.join(desktopPath, `${path.basename(inputFolderPath)}-new.jsrexport`)

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
