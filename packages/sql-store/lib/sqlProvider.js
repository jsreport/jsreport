const OdataSql = require('@jsreport/odata-to-sql')
const { v4: uuidv4 } = require('uuid')

class Cursor {
  constructor (entitySet, odataSql, executeQuery, query, fields, opts) {
    this.entitySet = entitySet
    this.odataSql = odataSql
    this.executeQuery = executeQuery
    this.options = opts
    this.options.entitySet = entitySet
    this.query = {
      $filter: Object.assign({}, query),
      $select: Object.assign({}, fields)
    }

    if (Object.getOwnPropertyNames(this.query.$select).length > 0) {
      this.query.$select._id = 1
    }
  }

  async toArray () {
    const q = this.odataSql.query(this.entitySet, this.query)
    const res = await this.executeQuery(q, this.options)
    return res.records.map((r) => this.odataSql.parse(this.entitySet, r))
  }

  skip (v) {
    this.query.$skip = v
    return this
  }

  limit (v) {
    this.query.$limit = v
    return this
  }

  async count () {
    const q = this.odataSql.count(this.entitySet, this.query)
    const res = await this.executeQuery(q, this.options)
    return parseInt(res.records[0].undefined_count)
  }

  sort (h) {
    this.query.$sort = Object.assign({}, this.query.$sort, h)
    return this
  }
}

module.exports = (options, dialect, executeQuery, transactionManager = {}) => ({
  load: function (model) {
    this.model = model
    this.odataSql = OdataSql(model, dialect, options.prefix || 'jsreport_', options.schema)

    if (!options.schemaCreation) {
      return
    }

    return Promise.all(this.odataSql.create().map((q) => executeQuery(q, {})))
  },
  async beginTransaction () {
    const tran = await transactionManager.start()
    return tran
  },
  async commitTransaction (tran) {
    await transactionManager.commit(tran)
  },
  async rollbackTransaction (tran) {
    await transactionManager.rollback(tran)
  },
  drop: function (opts = {}) {
    opts.entitySet = opts
    return Promise.all(this.odataSql.drop().map((q) => executeQuery(q, opts)))
  },
  find: function (entitySet, query, fields, opts = {}) {
    // $limit, $skip, $sort
    return new Cursor(entitySet, this.odataSql, executeQuery, query, fields, opts)
  },
  insert: async function (entitySet, doc, opts = {}) {
    opts.entitySet = opts
    doc._id = doc._id || uuidv4()
    const q = this.odataSql.insert(entitySet, doc)
    await executeQuery(q, opts)
    return doc
  },
  update: async function (entitySet, query, update, opts = {}) {
    opts.entitySet = opts
    const q = this.odataSql.update(entitySet, query, update)

    const res = await executeQuery(q, opts)
    if (opts.upsert && res.rowsAffected === 0) {
      const insertQ = Object.assign({}, query, update.$set || {}, update.$inc || {})
      await this.insert(entitySet, insertQ, opts)
      return 1
    }

    return res.rowsAffected
  },
  remove: async function (entitySet, query, opts = {}) {
    opts.entitySet = opts
    const q = this.odataSql.delete(entitySet, query)

    const res = await executeQuery(q, opts)
    return res.rowsAffected
  }
})
