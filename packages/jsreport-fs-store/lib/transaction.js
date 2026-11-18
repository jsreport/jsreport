const { lock } = require('./customUtils')
const Store = require('./store')
const TransactionJournal = require('./transactionJournal')

module.exports = ({ queue, persistence, fs, logger, documentsModel, onRecovery }) => {
  const commitedStore = Store({}, {
    documentsModel
  })

  const transactionJournal = TransactionJournal({ fs, logger, persistence, commitedStore, onRecovery })

  const createPersistenceWithJournal = (transactional) => ({
    insert: async (doc, documents) => {
      await transactionJournal.insert(doc)

      try {
        await persistence.insert(doc, documents)
      } catch (e) {
        if (e.week !== true && !transactional) {
          await transactionJournal.recover()
        }
        throw e
      }
      if (!transactional) {
        await transactionJournal.clean()
      }
    },
    update: async (doc, originalDoc, documents) => {
      await transactionJournal.update(doc, originalDoc, documents)

      try {
        await persistence.update(doc, originalDoc, documents)
      } catch (e) {
        if (e.week !== true && !transactional) {
          await transactionJournal.recover()
        }
        throw e
      }
      if (!transactional) {
        await transactionJournal.clean()
      }
    },
    remove: async (doc, documents) => {
      await transactionJournal.remove(doc, documents)

      try {
        await persistence.remove(doc, documents)
      } catch (e) {
        if (e.week !== true && !transactional) {
          await transactionJournal.recover()
        }
        throw e
      }
      if (!transactional) {
        await transactionJournal.clean()
      }
    }
  })

  const normalPersistence = createPersistenceWithJournal(false)
  const transactionalPersistence = createPersistenceWithJournal(true)

  const persistenceQueueTimeoutInterval = setInterval(() => {
    queue.rejectItemsWithTimeout()
  }, 2000).unref()

  return {
    getCurrentStore (opts = {}) {
      return opts.transaction == null ? commitedStore : opts.transaction.store
    },

    async init () {
      return transactionJournal.recover()
    },

    begin () {
      return queue.push(() => lock(fs, async () => {
        await this.journal.sync()
        return {
          store: commitedStore.clone(),
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
          return fn(opts.transaction.store, persistenceStub)
        })
      }

      return queue.push(() => lock(fs, async () => {
        await this.journal.sync()
        return fn(commitedStore, normalPersistence)
      }))
    },

    async commit (transaction) {
      return queue.push(() => lock(fs, async () => {
        try {
          await this.journal.sync()
          const storeClone = commitedStore.clone()
          // Retain the partially applied hierarchy for rollback if commit fails.
          transaction.commitStore = storeClone

          // eslint-disable-next-line no-unused-vars
          for (const op of transaction.operations) {
            await op(storeClone, transactionalPersistence)
          }

          // eslint-disable-next-line no-unused-vars
          for (const entitySet in storeClone.documents) {
            // eslint-disable-next-line no-unused-vars
            for (const transactionEntity of storeClone.documents[entitySet]) {
              const commitedEntity = commitedStore.documents[entitySet].find(e => e._id === transactionEntity._id)
              if (commitedEntity &&
                transactionEntity.$$etag !== commitedEntity.$$etag &&
                commitedEntity.$$etag > transaction.beginTime
              ) {
                throw new Error(`Entity ${transactionEntity.name} was modified by another transaction`)
              }
            }
          }

          commitedStore.replace(storeClone.documents)
          await transactionJournal.clean()
          await this.journal.commit()
        } catch (e) {
          logger.error('Transaction commit failed', e)
          throw e
        }
      }))
    },

    async rollback (transaction) {
      return queue.push(() => lock(fs, () => transactionJournal.recover(transaction?.commitStore?.documents)))
    },

    close () {
      clearInterval(persistenceQueueTimeoutInterval)
    }
  }
}
