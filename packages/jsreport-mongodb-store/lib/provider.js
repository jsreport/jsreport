const ObjectId = require('mongodb').ObjectID
const hexTest = /^[0-9A-Fa-f]{24}$/

function _convertStringsToObjectIds (o) {
  for (const i in o) {
    if (i === '_id' && (typeof o[i] === 'string' || o[i] instanceof String) && hexTest.test(o[i])) {
      o[i] = new ObjectId(o[i])
    }

    if (i === '_id' && o[i] != null && o[i].$in != null) {
      for (let j = 0; j < o[i].$in.length; j++) {
        if ((typeof o[i].$in[j] === 'string' || o[i].$in[j] instanceof String) && hexTest.test(o[i].$in[j])) {
          o[i].$in[j] = new ObjectId(o[i].$in[j])
        }
      }
    }

    if (o[i] !== null && typeof (o[i]) === 'object') {
      _convertStringsToObjectIds(o[i])
    }
  }
}

function _convertBufferAndIds (obj) {
  for (const p in obj) {
    if (!obj[p] || !Object.prototype.hasOwnProperty.call(obj, p)) {
      continue
    }

    if (obj[p] instanceof ObjectId) {
      obj[p] = obj[p].toString()
      continue
    }

    if (obj[p]._bsontype === 'Binary') {
      obj[p] = obj[p].buffer
      continue
    }

    if (typeof obj[p] !== 'object' || Array.isArray(obj[p])) {
      continue
    }

    _convertBufferAndIds(obj[p])
  }
}

function getCollectionName (prefix, entitySet) {
  return `${prefix || ''}${entitySet}`
}

module.exports = (client, options, db) => {
  let transactionsSupportErr

  const transactionsSupported = () => {
    return transactionsSupportErr == null
  }

  async function areTransactionsSupported () {
    let session

    try {
      session = client.startSession()

      session.startTransaction()

      await db.collection(getCollectionName(options.prefix, 'templates')).findOne({}, {
        session
      })

      await session.commitTransaction()
    } finally {
      if (session) {
        await session.endSession()
      }
    }
  }

  function addSessionToOpts (opts) {
    const { transaction: session, ...restOpts } = opts
    const newOpts = { ...restOpts }

    if (transactionsSupported() && session) {
      newOpts.session = session
    }

    return newOpts
  }

  return {
    client,
    db,

    get supportsTransactions () {
      return transactionsSupported()
    },

    get transactionSupportInfo () {
      return {
        valid: transactionsSupported(),
        error: transactionsSupportErr
      }
    },

    async load (model) {
      const collections = await db.listCollections().toArray()

      for (const entitySetName of Object.keys(model.entitySets)) {
        const collectionName = getCollectionName(options.prefix, entitySetName)
        if (!collections.find(c => c.name === collectionName)) {
          await db.createCollection(collectionName)
        }
      }

      try {
        await areTransactionsSupported()
        transactionsSupportErr = null
      } catch (e) {
        transactionsSupportErr = e
      }
    },

    async beginTransaction () {
      if (!transactionsSupported()) {
        return {}
      }

      const session = client.startSession()

      try {
        session.startTransaction()
      } catch (err) {
        await session.endSession()

        throw err
      }

      return session
    },

    async commitTransaction (tran) {
      if (!transactionsSupported()) {
        return
      }

      const session = tran

      try {
        await session.commitTransaction()
      } finally {
        await session.endSession()
      }
    },

    async rollbackTransaction (tran) {
      if (!transactionsSupported()) {
        return
      }

      const session = tran

      try {
        await session.abortTransaction()
      } finally {
        await session.endSession()
      }
    },

    find (entitySet, query, fields = {}, opts = {}) {
      _convertStringsToObjectIds(query)

      const queryOpts = addSessionToOpts(opts)

      queryOpts.projection = fields

      const cursor = db.collection(getCollectionName(options.prefix, entitySet)).find(query, queryOpts)

      const originalToArray = cursor.toArray.bind(cursor)
      cursor.toArray = async () => {
        const res = await originalToArray()
        _convertBufferAndIds(query)
        res.forEach(_convertBufferAndIds)
        return res
      }
      return cursor
    },

    async insert (entitySet, doc, opts = {}) {
      _convertStringsToObjectIds(doc)

      const insertOpts = addSessionToOpts(opts)

      await db.collection(getCollectionName(options.prefix, entitySet)).insertOne(doc, insertOpts)
      _convertBufferAndIds(doc)
      return doc
    },

    async update (entitySet, q, u, opts = {}) {
      _convertStringsToObjectIds(q)
      _convertStringsToObjectIds(u)

      const updateOpts = addSessionToOpts(opts)

      const res = await db.collection(getCollectionName(options.prefix, entitySet)).updateMany(q, u, updateOpts)

      _convertBufferAndIds(q)
      _convertBufferAndIds(u)

      return res.upsertedCount || res.matchedCount
    },

    async remove (entitySet, q, opts = {}) {
      _convertStringsToObjectIds(q)

      const removeOpts = addSessionToOpts(opts)

      const result = await db.collection(getCollectionName(options.prefix, entitySet)).deleteMany(q, removeOpts)
      _convertBufferAndIds(q)
      return result
    },

    generateId () {
      return ObjectId().toString()
    },

    drop (opts = {}) {
      const dropOpts = addSessionToOpts(opts)

      return db.dropDatabase(dropOpts)
    },

    close () {
      return client.close()
    }
  }
}
