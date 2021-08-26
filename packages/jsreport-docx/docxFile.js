// docx file utilities when testing docx internal files
const os = require('os')
const path = require('path')
const fs = require('fs')
const extractZip = require('extract-zip')
const ZFolder = require('zfolder')
const format = require('xml-formatter')

const desktopPath = path.join(os.homedir(), 'Desktop')

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

async function extract (docxPathArg) {
  if (!docxPathArg) {
    throw new Error('docxPath can not be empty')
  }

  if (!docxPathArg.endsWith('.docx')) {
    throw new Error('docxPath does not have .docx extension')
  }

  const docxPath = path.resolve(desktopPath, docxPathArg)

  const docxFilename = path.basename(docxPath, '.docx')

  const outputPath = path.join(desktopPath, docxFilename)

  await extractZip(docxPath, { dir: outputPath })

  const xmlFiles = await getXMLFilesContent(outputPath)

  for (const { fullPath, content } of xmlFiles) {
    const xmlFormatted = format(content, {
      indentation: '  ',
      collapseContent: true,
      lineSeparator: '\n'
    })

    await fs.promises.writeFile(fullPath, xmlFormatted)
  }

  console.log(`extracted into ${outputPath}`)
}

async function create (inputFolder) {
  const inputFolderPath = path.resolve(desktopPath, inputFolder)
  const outputPath = path.join(desktopPath, `${path.basename(inputFolderPath)}-new.zip`)
  const finalDocxPath = path.join(desktopPath, `${path.basename(inputFolderPath)}-new.docx`)

  await ZFolder(inputFolderPath, outputPath)

  await fs.promises.rename(outputPath, finalDocxPath)

  console.log(`created into ${finalDocxPath}`)
}

async function getXMLFilesContent (dirPath) {
  const result = []
  const currentFiles = await fs.promises.readdir(dirPath, { withFileTypes: true })

  for (const fileInfo of currentFiles) {
    if (fileInfo.isFile()) {
      const fullPath = path.join(dirPath, fileInfo.name)
      const content = await fs.promises.readFile(fullPath, { encoding: 'utf8' })

      if (isXML(content)) {
        result.push({
          fullPath,
          content
        })
      }
    } else if (fileInfo.isDirectory()) {
      const xmlFilesInDirectory = await getXMLFilesContent(path.join(dirPath, fileInfo.name))
      result.push(...xmlFilesInDirectory)
    }
  }

  return result
}

function isXML (str) {
  return (/^\s*<[\s\S]*>/).test(str)
}

main()
