const sql = require('mssql')
const Store = require('@jsreport/sql-store')
const Semaphore = require('semaphore-async-await').default

module.exports = async (reporter, definition) => {
  if (reporter.options.store.provider !== 'mssql' && reporter.options.blobStorage.provider !== 'mssql') {
    definition.options.enabled = false
    return
  }

  const pool = await sql.connect(definition.options.uri || definition.options)

  if (reporter.options.blobStorage.provider === 'mssql') {
    const blobsTable = definition.options.prefix + 'Blob'
    reporter.blobStorage.registerProvider({
      init: () => {
        return pool.request().query(`IF OBJECT_ID('${definition.options.schema}.${blobsTable}', 'U') IS NULL CREATE TABLE ${definition.options.schema}.${blobsTable} (blobName varchar(1024), content varbinary(max))`)
      },
      write: async (blobName, buf) => {
        await pool.request()
          .input('blobName', blobName)
          .input('content', buf)
          .query(`INSERT INTO ${definition.options.schema}.${blobsTable} VALUES(@blobName, @content)`)
        return blobName
      },
      read: async (blobName, buf) => {
        const r = await pool.request()
          .input('blobName', blobName)
          .query(`SELECT content FROM ${definition.options.schema}.${blobsTable} WHERE blobName = @blobName`)

        if (r.recordset.length === 0) {
          return null
        }

        return r.recordset[0].content
      },
      remove: async (blobName) => {
        await pool.request()
          .input('blobName', blobName)
          .query(`DELETE FROM ${definition.options.schema}.${blobsTable} WHERE blobName = @blobName`)
      },
      drop: () => {
        return pool.request().query(`IF OBJECT_ID('${definition.options.schema}.${blobsTable}', 'U') IS NOT NULL DROP TABLE ${definition.options.schema}.${blobsTable}`)
      }
    })
  }

  async function executeQuery (q, opts = {}) {
    const connection = pool

    async function execute (connection) {
      const request = new sql.Request(connection)

      for (let i = 0; i < q.values.length; i++) {
        request.input(i + 1 + '', q.values[i])
      }

      const res = await request.query(q.text)

      return {
        records: res.recordset,
        rowsAffected: res.rowsAffected[0]
      }
    }

    if (!opts.transaction) {
      return execute(connection)
    }

    return opts.transaction.semaphore.execute(() => execute(opts.transaction))
  }

  const transactionManager = {
    async start () {
      const transaction = new sql.Transaction(pool)

      await transaction.begin()

      transaction.__rolledBack = false

      // this is the recommended way to handle transactions rollbacks
      // and prevent errors when the connection was configured to auto-rollback on fail
      transaction.on('rollback', () => {
        transaction.__rolledBack = true
      })

      transaction.semaphore = new Semaphore(1)

      return transaction
    },
    async commit (tran) {
      await tran.commit()
    },
    async rollback (tran) {
      if (tran.__rolledBack) {
        return
      }

      await tran.rollback()
    }
  }

  const store = Object.assign(
    Store(definition.options, 'mssql', executeQuery, transactionManager),
    {
      close: () => {
        if (pool) {
          return pool.close()
        }
      },
      pool
    }
  )

  reporter.documentStore.registerProvider(store)
}
