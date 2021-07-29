const extend = require('node.extend.without.arrays')

module.exports = ({ queue }) => {
  let commitedDocuments = {}

  return {
    getCurrentDocuments (opts = {}) {
      return opts.transaction == null ? commitedDocuments : opts.transaction.documents
    },

    begin () {
      return queue.push(async () => {
        return {
          documents: cloneDocuments(commitedDocuments),
          operations: [],
          beginTime: Date.now()
        }
      })
    },

    async operation (opts, fn) {
      if (fn == null) {
        fn = opts
      }

      if (opts.transaction) {
        return queue.push(() => {
          opts.transaction.operations.push(fn)
          return fn(opts.transaction.documents)
        })
      }

      return queue.push(() => fn(commitedDocuments))
    },

    async commit (transaction) {
      return queue.push(async () => {
        const documentsClone = cloneDocuments(commitedDocuments)

        for (const op of transaction.operations) {
          await op(documentsClone)
        }

        for (const entitySet in documentsClone) {
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

        commitedDocuments = documentsClone
      })
    },

    async rollback (transaction) {}
  }
}

function cloneDocuments (obj) {
  return Object.keys(obj).reduce((acu, setName) => {
    acu[setName] = obj[setName].map((doc) => extend(true, {}, doc))
    return acu
  }, {})
}
