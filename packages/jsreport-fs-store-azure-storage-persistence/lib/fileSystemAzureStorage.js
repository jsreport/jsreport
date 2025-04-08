const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')
const { DefaultAzureCredential } = require('@azure/identity')
const path = require('path')

async function retry (fn, maxCount = 10) {
  let error
  for (let i = 0; i < maxCount; i++) {
    try {
      const res = await fn()
      return res
    } catch (e) {
      error = e
      await new Promise((resolve) => setTimeout(resolve, i * 50))
    }
  }

  throw error
}

module.exports = ({ accountName, accountKey, container = 'jsreport', lock = {} }) => {
  if (!accountName) {
    throw new Error('The fs store is configured to use azure storage persistence but the accountName is not set. Use store.persistence.accountName or extensions.fs-store-azure-storage-persistence.accountName to set the proper value.')
  }

  let credentials
  if (accountKey) {
    credentials = new StorageSharedKeyCredential(accountName, accountKey)
  } else {
    credentials = new DefaultAzureCredential()
  }

  if (lock.enabled !== false) {
    lock.leaseDuration = lock.leaseDuration || 60
    lock.retry = 100
  }

  const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credentials
  )

  let containerClient

  return {
    init: async () => {
      containerClient = blobServiceClient.getContainerClient(container)

      const exists = await containerClient.exists()
      if (!exists) {
        return blobServiceClient.createContainer(container)
      }
    },
    readdir: async (p) => {
      const items = await containerClient.listBlobsByHierarchy('/', { prefix: p ? p + '/' : p })

      const names = []
      for await (const item of items) {
        names.push(item.name)
      }
      const topLevel = names.map(n => n.replace(p, '').split('/').filter(f => f)[0])

      return [...new Set(topLevel)]
    },
    readFile: async (p) => {
      return containerClient.getBlobClient(p).downloadToBuffer()
    },
    writeFile: (p, c) => {
      return containerClient.uploadBlockBlob(p, c, Buffer.from(c).length, {
        metadata: {
          mtime: new Date().getTime() + ''
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
      return containerClient.uploadBlockBlob(p, finalBuffer, finalBuffer.length, {
        metadata: {
          mtime: new Date().getTime() + ''
        }
      })
    },
    rename: async (p, pp) => {
      const items = await containerClient.listBlobsFlat({ prefix: p })

      const names = []
      for await (const item of items) {
        names.push(item.name)
      }
      const namesToRename = names.filter(n =>
        n === p ||
        n.startsWith(p + '/') ||
        p === ''
      )

      await Promise.all(namesToRename.map(async (n) => {
        const blobClient = containerClient.getBlobClient(n)
        const newName = n.replace(p, pp)
        const newBlobClient = containerClient.getBlobClient(newName)

        const poller = await newBlobClient.beginCopyFromURL(blobClient.url)
        await poller.pollUntilDone()
      }))

      return Promise.all(namesToRename.map((n) => containerClient.deleteBlob(n)))
    },
    exists: async (p) => {
      if (!p) {
        // the root dir always exists
        return true
      }

      return containerClient.getBlobClient(p).exists()
    },
    stat: async (p) => {
      const exists = await containerClient.getBlobClient(p).exists()
      if (!exists) {
        return { isDirectory: () => true }
      }

      const properties = await containerClient.getBlobClient(p).getProperties()
      const mtime = properties.metadata?.mtime ? new Date(parseInt(properties.metadata.mtime)) : new Date(properties.lastModified)
      return { isDirectory: () => false, mtime }
    },
    mkdir: (p) => Promise.resolve(),
    remove: async (p) => {
      const items = await containerClient.listBlobsFlat({ prefix: p })

      const names = []
      for await (const item of items) {
        names.push(item.name)
      }

      return Promise.all(names
        .filter(n =>
          n === p ||
          n.startsWith(p + '/') ||
          p === ''
        ).map(n => containerClient.deleteBlob(n)))
    },
    copyFile: async (p, pp) => {
      const blobClient = containerClient.getBlobClient(p)
      const newBlobClient = containerClient.getBlobClient(pp)

      const poller = await newBlobClient.beginCopyFromURL(blobClient.url)
      await poller.pollUntilDone()
    },
    path: {
      // removing leading and trailing slashes
      join: (...args) => args.filter(a => a).map(a => a.replace(/\/+$/, '').replace(/^\/+/, '')).join('/'),
      sep: '/',
      basename: path.basename
    },
    lock: () => lock.enabled !== false
      ? retry(async () => {
          const leaseClient = containerClient.getBlobLeaseClient()
          const l = await leaseClient.acquireLease(lock.leaseDuration, lock)
          if (l.leaseId == null) {
            throw new Error(`Failed to acquire lease, error code: ${l.errorCode}.`)
          }
          return l
        }, lock.retry)
      : null,
    releaseLock: async (l) => {
      if (lock.enabled !== false) {
        try {
          const leaseClient = containerClient.getBlobLeaseClient(l.leaseId)
          await leaseClient.releaseLease()
        } catch (e) {
          // this throws when the lease was in the meantime acquired by another process because of timeout
        }
      }
    }
  }
}
