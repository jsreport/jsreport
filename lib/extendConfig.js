const path = require('path')
const mkdirp = require('mkdirp')

function addTransports (reporter) {
  // this condition prevents adding the same transports again.
  // usually this only happens when testing where there is a
  // lot of jsreport instances created
  if (
    reporter.logger.transports.console ||
    reporter.logger.transports.file ||
    reporter.logger.transports.error
  ) {
    return
  }

  const defaultLevel = reporter.options.mode === 'production' ? 'info' : 'debug'

  reporter.options.logger.console = Object.assign({
    transport: 'console',
    level: defaultLevel,
    timestamp: true,
    colorize: true
  }, reporter.options.logger.console)

  reporter.options.logger.file = Object.assign({
    transport: 'file',
    level: defaultLevel,
    filename: 'logs/reporter.log',
    maxsize: 10485760,
    json: false
  }, reporter.options.logger.file)

  reporter.options.logger.error = Object.assign({
    transport: 'file',
    level: 'error',
    filename: 'logs/error.log',
    handleExceptions: true,
    json: false
  }, reporter.options.logger.error)

  // winston doesn't create the directories for logs automatically
  // we don't want to do it for developers as well, but also we want to make jsreport with default config running
  // without errors, so we break the consistency here and precreate the logs directory if the config equals to default
  if (reporter.options.logger.file.filename === 'logs/reporter.log' && reporter.options.logger.file.silent !== true) {
    mkdirp.sync(path.dirname(reporter.options.logger.file.filename))
  }
}

module.exports = (reporter) => {
  addTransports(reporter)
}
