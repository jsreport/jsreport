const path = require('path')
const fs = require('fs')
const fsAsync = require('fs/promises')
const { v4: uuidv4 } = require('uuid')

module.exports.ensureTempDirectoryExists = async function (tempDirectory) {
  await fsAsync.mkdir(tempDirectory, {
    recursive: true
  })

  return {
    directoryPath: tempDirectory
  }
}

module.exports.getTempFilePath = getTempFilePath

module.exports.readTempFileSync = function readTempFileSync (tempDirectory, filename, opts = {}) {
  const { pathToFile } = getTempFilePath(tempDirectory, filename)

  const content = fs.readFileSync(pathToFile, opts)

  return {
    pathToFile,
    filename,
    content
  }
}

module.exports.openTempFile = async function (tempDirectory, filenameFn, flags) {
  const { pathToFile, filename } = getTempFilePath(tempDirectory, filenameFn)

  const fileHandle = await fsAsync.open(pathToFile, flags)

  return {
    pathToFile,
    filename,
    fileHandle
  }
}

module.exports.readTempFile = async function readTempFile (tempDirectory, filename, opts = {}) {
  const { pathToFile } = getTempFilePath(tempDirectory, filename)

  const content = await fsAsync.readFile(pathToFile, opts)

  return {
    pathToFile,
    filename,
    content
  }
}

module.exports.readTempFileStream = function readTempFileStream (tempDirectory, filename, opts = {}) {
  const { pathToFile } = getTempFilePath(tempDirectory, filename)

  const stream = fs.createReadStream(pathToFile, opts)

  return {
    pathToFile,
    filename,
    stream
  }
}

module.exports.writeTempFileSync = function writeTempFileSync (tempDirectory, filenameOrFn, content, opts = {}) {
  return writeFileSync(tempDirectory, filenameOrFn, content, opts)
}

module.exports.writeTempFile = async function writeTempFile (tempDirectory, filenameOrFn, content, opts = {}) {
  return writeFile(tempDirectory, filenameOrFn, content, opts)
}

module.exports.writeTempFileStream = async function writeTempFileStream (tempDirectory, filenameOrFn, opts = {}) {
  return writeFile(tempDirectory, filenameOrFn, undefined, opts, true)
}

module.exports.copyFileToTempFile = async function copyFileToTempFile (tempDirectory, srcFilePath, destFilenameOrFn, mode) {
  const { pathToFile, filename } = getTempFilePath(tempDirectory, destFilenameOrFn)

  await fsAsync.mkdir(tempDirectory, {
    recursive: true
  })

  await fsAsync.copyFile(srcFilePath, pathToFile, mode)

  return {
    pathToFile,
    filename
  }
}

function getTempFilePath (tempDirectory, filenameOrFn) {
  const filenameResult = typeof filenameOrFn === 'function' ? filenameOrFn(uuidv4()) : filenameOrFn

  if (filenameResult == null || filenameResult === '') {
    throw new Error('No valid filename')
  }

  const pathToFile = path.isAbsolute(filenameResult) ? filenameResult : path.join(tempDirectory, filenameResult)
  const filename = path.basename(pathToFile)

  return {
    pathToFile,
    filename
  }
}

function writeFileSync (tempDirectory, filenameOrFn, content, opts) {
  const { pathToFile, filename } = getTempFilePath(tempDirectory, filenameOrFn)

  fs.mkdirSync(tempDirectory, {
    recursive: true
  })

  fs.writeFileSync(pathToFile, content, opts)

  return {
    pathToFile,
    filename
  }
}

async function writeFile (tempDirectory, filenameOrFn, content, opts, asStream = false) {
  const { pathToFile, filename } = getTempFilePath(tempDirectory, filenameOrFn)

  await fsAsync.mkdir(tempDirectory, {
    recursive: true
  })

  if (asStream === true) {
    const stream = fs.createWriteStream(pathToFile, opts)

    return {
      pathToFile,
      filename,
      stream
    }
  } else {
    await fsAsync.writeFile(pathToFile, content, opts)

    return {
      pathToFile,
      filename
    }
  }
}
