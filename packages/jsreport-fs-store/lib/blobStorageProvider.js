const path = require('path')
const fs = require('fs')

module.exports = (options) => {
  const storageDirectory = options.blobStorage.dataDirectory

  if (!fs.existsSync(storageDirectory)) {
    fs.mkdirSync(storageDirectory, { recursive: true })
  }

  return {
    async write (blobName, buffer) {
      checkPathIsInsideDirectory(options, storageDirectory, blobName)

      const targetPath = path.join(storageDirectory, blobName)
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true })

      await fs.promises.writeFile(targetPath, buffer)
      return blobName
    },

    read (blobName) {
      checkPathIsInsideDirectory(options, storageDirectory, blobName)
      return fs.promises.readFile(path.join(storageDirectory, blobName))
    },

    async remove (blobName) {
      checkPathIsInsideDirectory(options, storageDirectory, blobName)
      if (fs.existsSync(path.join(storageDirectory, blobName))) {
        return fs.promises.unlink(path.join(storageDirectory, blobName))
      }
    },

    async append (blobName, buffer) {
      checkPathIsInsideDirectory(options, storageDirectory, blobName)

      const targetPath = path.join(storageDirectory, blobName)
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true })

      await fs.promises.appendFile(targetPath, buffer)
      return blobName
    },

    init () {

    }
  }
}

function checkPathIsInsideDirectory (options, directory, blobName) {
  if (options.trustUserCode === true) {
    return
  }

  if (path.posix.isAbsolute(blobName) || path.win32.isAbsolute(blobName)) {
    throw new Error('blobName can not be an absolute path')
  }

  const fullPath = path.resolve(directory, blobName)
  const relativePath = path.relative(directory, fullPath)

  if (relativePath === '' || relativePath.startsWith('..')) {
    throw new Error('blobName must be a relative path inside blobStorage directory')
  }
}
