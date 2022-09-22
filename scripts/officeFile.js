// office file utilities when testing office (docx, pptx, xlsx, etc) internal files
const os = require('os')
const path = require('path')
const fs = require('fs')
const extractZip = require('extract-zip')
const ZFolder = require('zfolder')
const format = require('xml-formatter')

// NOTE: resources to better understand the openxml spec:
// - http://officeopenxml.com/WPstyleParStyles.php
// - https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_shd_topic_ID0E1CNM.html?hl=w%3Ashd
// NOTE: resources to better understand the units:
// - https://startbigthinksmall.wordpress.com/2010/01/04/points-inches-and-emus-measuring-units-in-office-open-xml/ (info about different units in openxml)
// - https://blog.lindexi.com/post/C-dontet-Office-Open-XML-Unit-Converter.html (code about conversion between units)
// NOTE: resources to get inspiration about api, data shape, format
// - https://docx.js.org/

const OFFICE_TYPES = ['docx', 'pptx', 'xlsx']

const desktopPath = path.join(os.homedir(), 'Desktop')

async function main () {
  try {
    const args = process.argv.slice(2)
    const command = args[0]

    if (command === 'extract') {
      await extract(args[1], args[2])
    } else if (command === 'create') {
      await create(args[1], args[2])
    } else {
      throw new Error(`Unknown command "${command}"`)
    }
  } catch (e) {
    console.error('Error while executing')
    console.error(e)
  }
}

async function extract (officePathArg, noFormatArg) {
  if (!officePathArg) {
    throw new Error('officePath can not be empty')
  }

  if (noFormatArg != null && noFormatArg !== 'noformat') {
    throw new Error('noFormatArg when specified it can only be "noformat"')
  }

  const isValidOfficeExtension = OFFICE_TYPES.map((type) => `.${type}`).some((ext) => {
    return officePathArg.endsWith(ext)
  })

  if (!isValidOfficeExtension) {
    throw new Error('officePath does not have valid office extension')
  }

  const officePath = path.resolve(desktopPath, officePathArg)
  const officeFilename = path.basename(officePath, `.${officePath.split('.').pop()}`)

  const outputPath = path.join(desktopPath, officeFilename)

  await extractZip(officePath, { dir: outputPath })

  const xmlFiles = await getXMLFilesContent(outputPath)
  const noFormat = noFormatArg === 'noformat'

  for (const { fullPath, content } of xmlFiles) {
    let contentToWrite = content

    if (!noFormat) {
      contentToWrite = format(content, {
        indentation: '  ',
        collapseContent: true,
        lineSeparator: '\n'
      })
    }

    await fs.promises.writeFile(fullPath, contentToWrite)
  }

  console.log(`extracted into ${outputPath}${noFormat ? ' (not formatted)' : ''}`)
}

async function create (inputFolder, newOfficeFileType) {
  if (!newOfficeFileType) {
    throw new Error('newOfficeFileType can not be empty')
  }

  if (!OFFICE_TYPES.includes(newOfficeFileType)) {
    throw new Error(`newOfficeFileType is not have valid office extension, used: ${newOfficeFileType}`)
  }

  const inputFolderPath = path.resolve(desktopPath, inputFolder)
  const outputPath = path.join(desktopPath, `${path.basename(inputFolderPath)}-new.zip`)
  const finalOutputPath = path.join(desktopPath, `${path.basename(inputFolderPath)}-new.${newOfficeFileType}`)

  await ZFolder(inputFolderPath, outputPath)

  await fs.promises.rename(outputPath, finalOutputPath)

  console.log(`created into ${finalOutputPath}`)
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
