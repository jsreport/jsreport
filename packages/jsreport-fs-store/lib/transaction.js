const path = require('path')
const { copy, lock, cloneDocuments, infiniteRetry } = require('./customUtils')

const transactionDirectory = '~.tran'
const transactionConsistencyFile = '.tran'

module.exports = ({ dataDirectory, blobStorageDirectory, queue, persistence, fs, logger }) => {
  let blobStorageDirectoryName

  if (blobStorageDirectory && blobStorageDirectory.startsWith(dataDirectory)) {
    blobStorageDirectoryName = path.basename(blobStorageDirectory, '')
  }

  let commitedDocuments = {}

  const unsafePersistence = {
    insert: (doc, documents, rootDirectory) => persistence.insert(doc, documents, false, rootDirectory),
    update: (doc, originalDoc, documents, rootDirectory) => persistence.update(doc, originalDoc, documents, false, rootDirectory),
    remove: (doc, documents, rootDirectory) => persistence.remove(doc, documents, false, rootDirectory)
  }

  const safePersistence = {
    insert: (doc, documents, rootDirectory) => persistence.insert(doc, documents, true, rootDirectory),
    update: (doc, originalDoc, documents, rootDirectory) => persistence.update(doc, originalDoc, documents, true, rootDirectory),
    remove: (doc, documents, rootDirectory) => persistence.remove(doc, documents, true, rootDirectory)
  }

  const persistenceQueueTimeoutInterval = setInterval(() => {
    queue.rejectItemsWithTimeout()
  }, 2000).unref()

  return {
    getCurrentDocuments (opts = {}) {
      return opts.transaction == null ? commitedDocuments : opts.transaction.documents
    },

    async init () {
      if (await fs.exists(transactionDirectory)) {
        if (await fs.exists(transactionConsistencyFile)) {
          const ignoreDuringCopy = [transactionDirectory]

          if (blobStorageDirectoryName != null) {
            ignoreDuringCopy.push(blobStorageDirectoryName)
          }

          await copy(fs, transactionDirectory, '', ignoreDuringCopy, true)
          await fs.remove(transactionConsistencyFile)
        }

        await fs.remove(transactionDirectory)
      }
    },

    begin () {
      return queue.push(() => lock(fs, async () => {
        return {
          documents: cloneDocuments(commitedDocuments),
          operations: [],
          beginTime: Date.now()
        }
      }))
    },

    async operation (opts, fn) {
      if (fn == null) {
        fn = opts
      }

      if (opts.transaction) {
        return queue.push(() => {
          // the transaction operations shouldn't do real writes to the disk, just memory changes
          // we store the function call so we can replay it during commit to the disk
          const persistenceStub = {
            insert: () => {},
            update: () => {},
            remove: () => {}
          }

          opts.transaction.operations.push(fn)
          return fn(opts.transaction.documents, persistenceStub)
        })
      }

      return queue.push(() => lock(fs, async () => {
        await this.journal.sync()
        return fn(commitedDocuments, safePersistence)
      }))
    },

    async commit (transaction) {
      return queue.push(() => lock(fs, async () => {
        try {
          await fs.remove(transactionDirectory)
          await fs.remove(transactionConsistencyFile)

          const ignoreDuringInitialCopy = []

          if (blobStorageDirectoryName != null) {
            ignoreDuringInitialCopy.push(blobStorageDirectoryName)
          }

          await copy(fs, '', transactionDirectory, ignoreDuringInitialCopy)

          const documentsClone = cloneDocuments(commitedDocuments)

          // eslint-disable-next-line no-unused-vars
          for (const op of transaction.operations) {
            await op(documentsClone, unsafePersistence, transactionDirectory)
          }

          // eslint-disable-next-line no-unused-vars
          for (const entitySet in documentsClone) {
            // eslint-disable-next-line no-unused-vars
            for (const transactionEntity of documentsClone[entitySet]) {
              const commitedEntity = commitedDocuments[entitySet].find(e => e._id)
              if (commitedEntity &&
                transactionEntity.$$etag !== commitedEntity.$$etag &&
                commitedEntity.$$etag > transaction.beginTime
              ) {
                throw new Error(`Entity ${transactionEntity.name} was modified by another transaction`)
              }
            }
          }

          await fs.writeFile(transactionConsistencyFile, '')

          const ignoreDuringFinalCopy = [transactionDirectory]

          if (blobStorageDirectoryName != null) {
            ignoreDuringFinalCopy.push(blobStorageDirectoryName)
          }

          await infiniteRetry(() => copy(fs, transactionDirectory, '', ignoreDuringFinalCopy, true), (e, delay) => {
            logger.error(`copy consistent transaction to the data directory crashed, trying again in ${delay}ms`, e)
          })

          commitedDocuments = documentsClone

          await this.journal.commit()
        } finally {
          await infiniteRetry(async () => {
            await fs.remove(transactionDirectory)
            await fs.remove(transactionConsistencyFile)
          }, (e, delay) => {
            logger.error(`cleanup of transaction files ~tran failed, trying again in ${delay}ms`, e)
          })
        }
      }))
    },

    async rollback (transaction) {
    },

    close () {
      clearInterval(persistenceQueueTimeoutInterval)
    }
  }
}
