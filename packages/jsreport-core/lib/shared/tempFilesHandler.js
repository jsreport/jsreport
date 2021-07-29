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

module.exports.readTempFile = async function readTempFile (tempDirectory, filename, opts = {}) {
  const pathToFile = path.join(tempDirectory, filename)

  const content = await fsAsync.readFile(pathToFile, opts)

  return {
    pathToFile,
    filename,
    content
  }
}

module.exports.readTempFileStream = async function readTempFileStream (tempDirectory, filename, opts = {}) {
  const pathToFile = path.join(tempDirectory, filename)

  return new Promise((resolve) => {
    const stream = fs.createReadStream(pathToFile, opts)

    resolve({
      pathToFile,
      filename,
      stream
    })
  })
}

module.exports.writeTempFile = async function writeTempFile (tempDirectory, filenameFn, content, opts = {}) {
  return writeFile(tempDirectory, filenameFn, content, opts)
}

module.exports.writeTempFileStream = async function writeTempFileStream (tempDirectory, filenameFn, opts = {}) {
  return writeFile(tempDirectory, filenameFn, undefined, opts, true)
}

async function writeFile (tempDirectory, filenameFn, content, opts, asStream = false) {
  const filename = filenameFn(uuidv4())

  if (filename == null || filename === '') {
    throw new Error('No valid filename was returned from filenameFn')
  }

  const pathToFile = path.join(tempDirectory, filename)

  await fsAsync.mkdir(tempDirectory, {
    recursive: true
  })

  if (asStream === true) {
    return new Promise((resolve) => {
      const stream = fs.createWriteStream(pathToFile, opts)

      resolve({
        pathToFile,
        filename,
        stream
      })
    })
  } else {
    await fsAsync.writeFile(pathToFile, content, opts)

    return {
      pathToFile,
      filename
    }
  }
}
