const connection = require('./connection')

module.exports = async function (reporter, definition) {
  if (
    reporter.options.store.provider !== 'mongodb' &&
    reporter.options.blobStorage.provider !== 'mongodb'
  ) {
    return
  }

  const client = await connection(definition.options, reporter.logger)
  const exactDb = definition.options.uri ? client.db() : client.db(definition.options.databaseName)

  if (reporter.options.store.provider === 'mongodb') {
    reporter.documentStore.registerProvider(require('./provider')(client, definition.options, exactDb))

    reporter.documentStore.on('after-init', () => {
      if (reporter.documentStore.provider.supportsTransactions === false) {
        reporter.logger.warn(`Transactions are not supported in this mongodb server instance, store is falling back to transactionless support. Transactions are supported on mongodb > 4.x and when the server is part of a replica set or sharded cluster, visit mongodb docs for information about how to enable transactions in your mongodb instance. Reason: ${reporter.documentStore.provider.transactionSupportInfo.error.message}`)
      }
    })
  }

  if (reporter.options.blobStorage.provider === 'mongodb') {
    reporter.blobStorage.registerProvider(require('./gridFSBlobStorage')(client, exactDb))
  }
}
