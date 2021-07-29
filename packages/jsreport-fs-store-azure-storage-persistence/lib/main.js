const fileSystemAzureStorage = require('./fileSystemAzureStorage')

module.exports = (reporter, definition) => {
  const options = { ...definition.options }
  // avoid exposing connection string through /api/extensions
  definition.options = {}

  if (reporter.fsStore) {
    reporter.fsStore.registerPersistence('azure-storage',
      () => (fileSystemAzureStorage(Object.assign({}, options, { logger: reporter.logger }))))
  }
}
