const { copy, lock, cloneDocuments, infiniteRetry } = require('./customUtils')

const transactionDirectory = '~.tran'
const transactionConsistencyFile = '.tran'

module.exports = ({ queue, persistence, fs, logger }) => {
  let commitedDocuments = {}

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
          await copy(fs, transactionDirectory, '', [transactionDirectory], true)
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

      return queue.push(() => lock(fs, () => {
        this.journal.sync()
        return fn(commitedDocuments, persistence)
      }))
    },

    async commit (transaction) {
      return queue.push(() => lock(fs, async () => {
        try {
          await fs.remove(transactionDirectory)
          await fs.remove(transactionConsistencyFile)

          await copy(fs, '', transactionDirectory)

          const documentsClone = cloneDocuments(commitedDocuments)

          // eslint-disable-next-line no-unused-vars
          for (const op of transaction.operations) {
            await op(documentsClone, persistence, transactionDirectory)
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

          await infiniteRetry(() => copy(fs, transactionDirectory, '', [transactionDirectory], true), (e, delay) => {
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
