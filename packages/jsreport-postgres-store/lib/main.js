const pg = require('pg-promise')()

// how to configure type parsing per instance
// https://github.com/brianc/node-postgres/issues/1838
const TypeOverrides = require('pg/lib/type-overrides')
const Store = require('@jsreport/sql-store')

module.exports = function (reporter, definition) {
  if (reporter.options.store.provider !== 'postgres' && reporter.options.blobStorage.provider !== 'postgres') {
    definition.options.enabled = false
    return
  }

  const customTypes = new TypeOverrides()

  // postgres does not parse numeric(d,d) type by default, we
  // need to add the parsing manually, so we register a custom types collection
  // to don't alter the global behaviour of the queries,
  // we just care about our database driver instance and don't want to change the way the
  // driver works by default in all cases/instances.
  //
  // 1700 is the id for numeric type
  // https://github.com/vitaly-t/pg-promise/issues/214
  customTypes.setTypeParser(1700, (value) => {
    return parseFloat(value)
  })

  const db = pg({
    ...definition.options,
    types: customTypes
  })

  if (reporter.options.blobStorage.provider === 'postgres') {
    const blobsTable = definition.options.prefix + 'Blob'
    reporter.blobStorage.registerProvider({
      init: () => {
        return db.query(`CREATE TABLE IF NOT EXISTS  ${blobsTable} (blobName varchar(1024), content bytea);`)
      },
      write: async (blobName, buf) => {
        await db.query(`INSERT INTO ${blobsTable} VALUES($1, $2)`, [blobName, buf])
        return blobName
      },
      read: async (blobName, buf) => {
        const r = await db.query(`SELECT content FROM  ${blobsTable} WHERE blobName = $1`, [blobName])
        if (r.length === 0) {
          return null
        }
        return r[0].content
      },
      remove: async (blobName) => {
        await db.query(`DELETE FROM ${blobsTable} WHERE blobName = $1`, [blobName])
      },
      drop: () => {
        return db.query(`DROP TABLE IF EXISTS ${blobsTable}`)
      }
    })
  }

  function executeQuery (a, opts = {}) {
    const transform = (r) => {
      return {
        records: r.rows,
        rowsAffected: r.rowCount != null ? r.rowCount : 0
      }
    }

    if (opts.transaction) {
      const tran = opts.transaction
      return tran.execute.result(a.text, a.values, transform)
    }

    return db.result(a.text, a.values, transform)
  }

  const transactionManager = {
    async start () {
      // eslint-disable-next-line promise/param-names
      return new Promise((startResolve, startReject) => {
        let initialized = false
        let transactionEnd

        const transactionEndPromise = new Promise((resolve) => {
          transactionEnd = resolve
        })

        db.tx((t) => {
          initialized = true

          // eslint-disable-next-line promise/param-names
          return new Promise((execResolve, execReject) => {
            const transactionExecute = {
              resolve: execResolve,
              reject: execReject
            }

            const tran = {
              execute: t,
              async commit () {
                transactionExecute.resolve()
                await transactionEndPromise
              },
              async rollback () {
                const error = new Error('Transaction ROLLBACK executed')
                transactionExecute.reject(error)
                await transactionEndPromise
              }
            }

            startResolve(tran)
          })
        }).then(() => {
          transactionEnd()
        }).catch((err) => {
          if (!initialized) {
            startReject(err)
          } else {
            transactionEnd()
          }
        })
      })
    },
    async commit (tran) {
      await tran.commit()
    },
    async rollback (tran) {
      await tran.rollback()
    }
  }

  const store = Object.assign(
    Store(definition.options, 'postgres', executeQuery, transactionManager),
    {
      close: () => {
        return db.$pool.end()
      },
      db
    }
  )

  reporter.documentStore.registerProvider(store)
}
