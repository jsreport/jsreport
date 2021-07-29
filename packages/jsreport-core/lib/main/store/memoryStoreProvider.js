/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * DocumentStore data layer provider using just memory.
 */

const extend = require('node.extend.without.arrays')
const { nanoid } = require('nanoid')
const omit = require('lodash.omit')
const mingo = require('@jsreport/mingo')
const Transaction = require('./transaction')
const Queue = require('./queue')

module.exports = () => {
  return {
    load (model) {
      this.model = model
      this.transaction = Transaction({ queue: Queue() })

      return this.transaction.operation(async (documents) => {
        Object.keys(model.entitySets).forEach((e) => (documents[e] = []))
      })
    },

    beginTransaction () {
      return this.transaction.begin()
    },

    async commitTransaction (tran) {
      await this.transaction.commit(tran)
    },

    async rollbackTransaction (tran) {
      return this.transaction.rollback(tran)
    },

    find (entitySet, query, fields, opts = {}) {
      const documents = this.transaction.getCurrentDocuments(opts)
      const cursor = mingo.find(documents[entitySet], query, fields)

      // the queue is not used here because reads are supposed to not block
      cursor.toArray = () => cursor.all().map((e) => extend(true, {}, omit(e, '$$etag')))

      return cursor
    },

    insert (entitySet, doc, opts = {}) {
      return this.transaction.operation(opts, async (documents) => {
        doc._id = doc._id || nanoid(16)
        const newDoc = extend(true, {}, doc)
        newDoc.$$etag = Date.now()
        documents[entitySet].push(newDoc)
        return doc
      })
    },

    async update (entitySet, q, u, opts = {}) {
      let count

      const res = await this.transaction.operation(opts, async (documents) => {
        const toUpdate = mingo.find(documents[entitySet], q).all()

        count = toUpdate.length

        // need to get of queue first before calling insert, otherwise we get a deathlock
        if (toUpdate.length === 0 && opts.upsert) {
          return 'insert'
        }

        for (const doc of toUpdate) {
          Object.assign(doc, u.$set || {})
          doc.$$etag = Date.now()
        }
      })

      if (res === 'insert') {
        await this.insert(entitySet, u.$set, opts)
        return 1
      }

      return count
    },

    remove (entitySet, q, opts = {}) {
      return this.transaction.operation(opts, async (documents) => {
        const toRemove = mingo.find(documents[entitySet], q).all()
        documents[entitySet] = documents[entitySet].filter(d => !toRemove.includes(d))
      })
    },

    drop (opts = {}) {
      return this.transaction.operation(opts, async (documents) => {
        for (const [entitySetName] of Object.entries(documents)) {
          documents[entitySetName] = []
        }
      })
    }
  }
}
