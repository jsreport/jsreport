const fileSystemS3 = require('./fileSystemS3')

module.exports = (reporter, definition) => {
  const options = { ...definition.options }
  // avoid exposing connection string through /api/extensions
  definition.options = {}

  if (reporter.fsStore) {
    reporter.fsStore.registerPersistence('aws-s3', () =>
      (fileSystemS3(Object.assign({}, options, { logger: reporter.logger }))))
  }
}
