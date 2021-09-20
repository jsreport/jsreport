const nfs = require('fs/promises')
const chokidar = require('chokidar')
const debounce = require('lodash.debounce')

async function exists (p) {
  try {
    await nfs.stat(p)
    return true
  } catch (e) {
    return false
  }
}

module.exports = ({
  dataDirectory,
  fs,
  blobStorageDirectory,
  transaction,
  onModification,
  logger
}) => ({
  init () {
    logger.info('fs store is monitoring external modifications')

    const reload = debounce(filePath => {
      logger.debug(`fs store sync is triggering reload, because ${filePath} was changed by other process`)
      onModification({
        filePath
      })
    }, 800)

    const ignored = ['**/fs.journal', '**/fs.version', '**/fs.lock', '**/~*', '**/.git/**', '**/.tran', '**/.DS_Store']

    if (blobStorageDirectory && blobStorageDirectory.startsWith(dataDirectory)) {
      ignored.push(blobStorageDirectory.replace(/\\/g, '/'))
    }

    this.watcher = chokidar.watch(dataDirectory, {
      ignorePermissionErrors: true,
      ignoreInitial: true,
      usePolling: true,
      ignored
    })

    return new Promise(resolve => {
      this.watcher.on('ready', function () {
        resolve()
      })

      this.watcher.on('all', (eventName, filePath, stat) => {
        return transaction.operation(async () => {
          try {
            if (eventName === 'addDir') {
              if (fs.memoryState[filePath] && fs.memoryState[filePath].isDirectory) {
                return
              }

              return reload(filePath)
            }

            if (eventName === 'unlinkDir') {
              if (!fs.memoryState[filePath] || !fs.memoryState[filePath].isDirectory) {
                return
              }

              if (await exists(filePath)) {
                return
              }

              return reload(filePath)
            }

            if (eventName === 'unlink') {
              if (!fs.memoryState[filePath] || fs.memoryState[filePath].isDirectory) {
                return
              }

              if (await exists(filePath)) {
                return
              }

              return reload(filePath)
            }

            const content = await nfs.readFile(filePath)

            if (!fs.memoryState[filePath] || !content.equals(Buffer.from(fs.memoryState[filePath].content))) {
              reload(filePath)
            }
          } catch (e) {
          }
        })
      })
    })
  },

  async close () {
    if (this.watcher) {
      await this.watcher.close()

      // in some cases chokidar still tries to emit an event, even after close,
      // so we add an error handler to prevent having an uncaught exception
      this.watcher.once('error', () => {})
    }
  }
})
