const util = require('util')
const path = require('path')
const azure = require('azure-storage')
const stream = require('stream')

async function retry (fn, maxCount = 10) {
  let error
  for (let i = 0; i < maxCount; i++) {
    try {
      const res = await fn()
      return res
    } catch (e) {
      error = e
      await new Promise((resolve) => setTimeout(resolve, i * 10))
    }
  }

  throw error
}

module.exports = ({ accountName, accountKey, container = 'jsreport', lock = {} }) => {
  if (!accountName) {
    throw new Error('The fs store is configured to use azure storage persistence but the accountName is not set. Use store.persistence.accountName or extensions.fs-store-azure-storage-persistence.accountName to set the proper value.')
  }
  if (!accountKey) {
    throw new Error('The fs store is configured to use azure storage persistence but the accountKey is not set. Use store.persistence.accountKey or extensions.fs-store-azure-storage-persistence.accountKey to set the proper value.')
  }

  if (lock.enabled !== false) {
    lock.leaseDuration = lock.leaseDuration || 60
    lock.retry = 100
  }

  const blobService = azure.createBlobService(accountName, accountKey)

  const blobServiceAsync = {
    createContainerIfNotExists: util.promisify(blobService.createContainerIfNotExists).bind(blobService),
    createBlockBlobFromStream: util.promisify(blobService.createBlockBlobFromStream).bind(blobService),
    listBlobsSegmentedWithPrefix: util.promisify(blobService.listBlobsSegmentedWithPrefix).bind(blobService),
    getBlobToStream: util.promisify(blobService.getBlobToStream).bind(blobService),
    getBlobMetadata: util.promisify(blobService.getBlobMetadata).bind(blobService),
    startCopyBlob: util.promisify(blobService.startCopyBlob).bind(blobService),
    deleteBlob: util.promisify(blobService.deleteBlob).bind(blobService),
    doesBlobExist: util.promisify(blobService.doesBlobExist).bind(blobService),
    acquireLease: util.promisify(blobService.acquireLease).bind(blobService),
    releaseLease: util.promisify(blobService.releaseLease).bind(blobService)
  }

  return {
    init: () => blobServiceAsync.createContainerIfNotExists(container),
    readdir: async (p) => {
      const res = await blobServiceAsync.listBlobsSegmentedWithPrefix(container, p, null)
      const topFilesOrDirectories = res.entries
        .filter(e =>
          e.name === p ||
          e.name.startsWith(p + '/') ||
          p === ''
        )
        .map(e => e.name.replace(p, '').split('/').filter(f => f)[0])
      return [...new Set(topFilesOrDirectories)]
    },
    readFile: async (p) => {
      const data = []
      const writingStream = new stream.Writable({
        write: function (chunk, encoding, next) {
          data.push(chunk)
          next()
        }
      })
      await blobServiceAsync.getBlobToStream(container, p, writingStream)
      return Buffer.concat(data)
    },
    writeFile: (p, c) => {
      const buffer = Buffer.from(c)
      const s = new stream.Readable()
      s._read = () => {}
      s.push(buffer)
      s.push(null)
      return blobServiceAsync.createBlockBlobFromStream(container, p, s, buffer.length, {
        metadata: {
          mtime: new Date().getTime()
        }
      })
    },
    appendFile: async function (p, c) {
      let existingBuffer = Buffer.from([])
      try {
        existingBuffer = await this.readFile(p)
      } catch (e) {
        // doesn't exist yet
      }

      const finalBuffer = Buffer.concat([existingBuffer, Buffer.from(c)])

      const s = new stream.Readable()
      s._read = () => {}
      s.push(finalBuffer)
      s.push(null)
      return blobServiceAsync.createBlockBlobFromStream(container, p, s, finalBuffer.length, {
        metadata: {
          mtime: new Date().getTime()
        }
      })
    },
    rename: async (p, pp) => {
      const blobsToRename = await blobServiceAsync.listBlobsSegmentedWithPrefix(container, p, null)
      const entriesToRename = blobsToRename.entries.filter(e =>
        e.name === p ||
        e.name.startsWith(p + '/') ||
        p === ''
      )
      await Promise.all(entriesToRename.map(async (e) => {
        const newName = e.name.replace(p, pp)
        await blobServiceAsync.startCopyBlob(blobService.getUrl(container, e.name), container, newName)
      }))

      return Promise.all(entriesToRename.map((e) => blobServiceAsync.deleteBlob(container, e.name)))
    },
    exists: async (p) => {
      const res = await blobServiceAsync.doesBlobExist(container, p)
      return res.exists
    },
    stat: async (p) => {
      const res = await blobServiceAsync.doesBlobExist(container, p)
      // otazka je jestli je to vlastne ok, co kdyz nekdo jiny edituje ve stejne ms?
      // problem je azure ma ten modification date bez milisekund
      // mozna by stacilo po locku chvilku pockat
      if (!res.exists) {
        return { isDirectory: () => true }
      }

      const metaRes = await blobServiceAsync.getBlobMetadata(container, p)
      const mtime = metaRes.metadata.mtime ? new Date(parseInt(metaRes.metadata.mtime)) : new Date(metaRes.lastModified)
      return { isDirectory: () => false, mtime }
    },
    mkdir: (p) => Promise.resolve(),
    remove: async (p) => {
      const blobsToRemove = await blobServiceAsync.listBlobsSegmentedWithPrefix(container, p, null)
      return Promise.all(blobsToRemove.entries
        .filter(e =>
          e.name === p ||
          e.name.startsWith(p + '/') ||
          p === ''
        )
        .map(e => blobServiceAsync.deleteBlob(container, e.name)))
    },
    copyFile: (p, pp) => blobServiceAsync.startCopyBlob(blobService.getUrl(container, p), container, pp),
    path: {
      join: (...args) => args.filter(a => a).join('/'),
      sep: '/',
      basename: path.basename
    },
    lock: () => lock.enabled !== false ? retry(() => blobServiceAsync.acquireLease(container, null, lock), lock.retry) : null,
    releaseLock: async (l) => {
      if (lock.enabled !== false) {
        try {
          await blobServiceAsync.releaseLease(container, null, l.id)
        } catch (e) {
          // this throws when the lease was in the meantime acquired by another process because of timeout
        }
      }
    }
  }
}
