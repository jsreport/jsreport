const EventEmitter = require('events').EventEmitter
const extend = require('node.extend.without.arrays')
const omit = require('lodash.omit')
const { rimraf } = require('rimraf')
const Transaction = require('./transaction')
const Persistence = require('./persistence')
const { uid, lock } = require('./customUtils')
const documentModel = require('./documentModel')
const Queue = require('./queue')
const FileSystemPersistence = require('./fileSystem')
const ExternalModificationsSync = require('./externalModificationsSync')
const Journal = require('./journal')
const getIgnoreDefaults = require('./ignoreDefaults')

const ignoreDefaults = getIgnoreDefaults()

module.exports = ({
  dataDirectory,
  ignore = ignoreDefaults,
  blobStorageDirectory,
  logger,
  externalModificationsSync,
  persistence = {},
  corruptAlertThreshold,
  compactionEnabled,
  compactionInterval,
  persistenceQueueWaitingTimeout,
  resolveFileExtension,
  createError
}) => {
  return {
    name: 'fs',
    persistenceHandlers: {
      fs: FileSystemPersistence
    },
    emitter: new EventEmitter(),
    createError,
    on (...args) {
      this.emitter.on(...args)
    },
    emit (...args) {
      this.emitter.emit(...args)
    },
    get dataDirectory () {
      return dataDirectory
    },
    async load (model) {
      this.documentsModel = documentModel(model)

      const PersistenceProvider = this.persistenceHandlers[persistence.provider]
      if (!PersistenceProvider) {
        throw new Error(`File system store persistence provider ${persistence.provider} was not registered`)
      }
      logger.info(`fs store is persisting using ${persistence.provider} for ${dataDirectory}`)

      this.fs = PersistenceProvider(Object.assign({ dataDirectory: dataDirectory, externalModificationsSync }, persistence))

      const originalFsReaddir = this.fs.readdir.bind(this.fs)

      this.fs.readdir = async (...args) => {
        const result = await originalFsReaddir(...args)

        // the ignore options only filters and ignore for root files/directories
        if (args[0] === '') {
          return result.filter(item => !ignore.includes(item))
        }

        return result
      }

      this.persistence = Persistence({
        documentsModel: this.documentsModel,
        fs: this.fs,
        corruptAlertThreshold,
        resolveFileExtension,
        dataDirectory,
        blobStorageDirectory,
        loadConcurrency: persistence.loadConcurrency
      })

      this.queue = Queue(persistenceQueueWaitingTimeout)
      this.transaction = Transaction({
        dataDirectory,
        blobStorageDirectory,
        queue: this.queue,
        persistence: this.persistence,
        fs: this.fs,
        logger,
        documentsModel: this.documentsModel
      })

      this.journal = Journal({
        fs: this.fs,
        getCurrentStore: this.transaction.getCurrentStore.bind(this.transaction),
        reload: this.reload.bind(this),
        logger,
        queue: this.queue
      })
      this.transaction.journal = this.journal

      if (externalModificationsSync) {
        this.externalModificationsSync = ExternalModificationsSync({
          dataDirectory,
          fs: this.fs,
          blobStorageDirectory,
          transaction: this.transaction,
          logger,
          onModification: async (e) => {
            try {
              await this.queue.push(() => lock(this.fs, () => this.reload()))
              this.emit('external-modification', e)
            } catch (e) {
              logger.warn('Failed to reload fs store after external modification', e)
            }
          }
        })
      }

      await this.fs.init()

      await lock(this.fs, async () => {
        await this.transaction.init()

        await this.reload()

        await this.journal.init()
      })

      if (externalModificationsSync) {
        await this.externalModificationsSync.init()
      }

      if (compactionEnabled) {
        await this._startCompactionInterval()
      }

      logger.info('fs store is initialized successfully')
    },

    async reload () {
      logger.info('fs store is loading data')

      const documents = {}
      const _documents = await this.persistence.load()
      Object.keys(this.documentsModel.entitySets).forEach(e => (documents[e] = []))
      _documents.forEach(d => documents[d.$entitySet].push(d))
      this.transaction.getCurrentStore().replace(documents)
    },

    beginTransaction () {
      return this.transaction.begin()
    },

    async commitTransaction (tran) {
      return this.transaction.commit(tran)
    },

    sync () {
      return this.journal.waitAndSync()
    },

    async rollbackTransaction (tran) {
      return this.transaction.rollback(tran)
    },

    find (entitySet, query, fields, opts = {}) {
      const store = this.transaction.getCurrentStore(opts)
      const cursor = store.find(entitySet, query, fields)
      // the queue is not used here because reads are supposed to not block
      cursor.toArray = () => cursor.all().map((v) => extend(true, {}, omit(v, '$$etag', '$entitySet')))
      return cursor
    },

    insert (entitySet, doc, opts = {}) {
      doc._id = doc._id || uid(16)
      doc.$entitySet = entitySet

      // (comment for transaction)
      // the operation function run twice, at the time called with "dummy" persistence and at the commit
      // we need to clone doc before operation, so we use the same entity in closure and avoid mutating
      // between operation and commit
      const clonnedDoc = extend(true, {}, doc)

      return this.transaction.operation(opts, async (store, persistence, rootDirectory) => {
        await persistence.insert(clonnedDoc, store.documents, rootDirectory)

        store.insert(entitySet, {
          ...clonnedDoc,
          $$etag: Date.now()
        })

        if (!opts.transaction) {
          await this.journal.insert(clonnedDoc, opts)
        }

        return doc
      })
    },

    async update (entitySet, q, u, opts = {}) {
      let count

      const setClone = extend(true, {}, u.$set)
      const qClone = extend(true, {}, q)

      const res = await this.transaction.operation(opts, async (store, persistence, rootDirectory) => {
        const toUpdate = store.find(entitySet, qClone).all()

        count = toUpdate.length

        // need to get of queue first before calling insert, otherwise we get a deadlock
        if (toUpdate.length === 0 && opts.upsert) {
          return 'insert'
        }

        // eslint-disable-next-line no-unused-vars
        for (const doc of toUpdate) {
          await persistence.update(extend(true, {}, omit(doc, '$$etag'), setClone), doc, store.documents, rootDirectory)

          store.update(entitySet, doc, setClone)

          if (!opts.transaction) {
            await this.journal.update(doc, opts)
          }
        }
      })

      if (res === 'insert') {
        await this.insert(entitySet, setClone, opts)
        return 1
      }

      return count
    },

    async remove (entitySet, q, opts = {}) {
      const qClone = extend(true, {}, q)

      return this.transaction.operation(opts, async (store, persistence, rootDirectory) => {
        const toRemove = store.find(entitySet, qClone).all()

        // eslint-disable-next-line no-unused-vars
        for (const doc of toRemove) {
          await persistence.remove(doc, store.documents, rootDirectory)
          store.remove(entitySet, doc)
        }

        if (opts.transaction) {
          return
        }

        // eslint-disable-next-line no-unused-vars
        for (const doc of toRemove) {
          await this.journal.remove(doc, opts)
        }
      })
    },

    registerPersistence (name, persistence) {
      this.persistenceHandlers[name] = persistence
    },

    async close () {
      if (externalModificationsSync) {
        await this.externalModificationsSync.close()
      }

      if (this.autoCompactionInterval) {
        clearInterval(this.autoCompactionInterval)
      }

      this.transaction.close()
      this.journal.close()
    },

    generateId () {
      return uid(16)
    },

    drop () {
      this.close()
      return rimraf(dataDirectory)
    },

    async _startCompactionInterval () {
      let compactIsQueued = false
      const compact = () => {
        if (compactIsQueued) {
          return
        }
        compactIsQueued = true
        return this.queue.push(() => lock(this.fs, async () => {
          const currentStore = this.transaction.getCurrentStore()
          await this.persistence.compact(currentStore.documents)
          currentStore.replace(currentStore.documents)
        }))
          .catch((e) => logger.warn('fs store compaction failed, but no problem, it will retry the next time.' + e.message))
          .finally(() => (compactIsQueued = false))
      }

      this.autoCompactionInterval = setInterval(compact, compactionInterval).unref()
      // make sure we cleanup also when process just renders and exit
      // like when using jsreport.exe render
      await compact()
    }
  }
}
