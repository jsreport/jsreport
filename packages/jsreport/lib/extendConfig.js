const { loggerFormat, createDefaultLoggerFormat } = require('@jsreport/jsreport-core')
const defaultLoggerFormatWithTimestamp = createDefaultLoggerFormat({ timestamp: true })

function addTransports (reporter) {
  reporter.options.logger.console = Object.assign({
    transport: 'console',
    level: 'debug',
    handleExceptions: true,
    format: loggerFormat.combine(
      loggerFormat.colorize(),
      defaultLoggerFormatWithTimestamp()
    )
  }, reporter.options.logger.console)

  reporter.options.logger.file = Object.assign({
    transport: 'file',
    level: 'debug',
    filename: 'logs/reporter.log',
    maxsize: 10485760,
    handleExceptions: true
  }, reporter.options.logger.file)

  reporter.options.logger.error = Object.assign({
    transport: 'file',
    level: 'error',
    filename: 'logs/error.log',
    handleExceptions: true
  }, reporter.options.logger.error)

  // nothing else to do here, winston creates the directory specified in file transport .filename automatically
}

module.exports = (reporter) => {
  addTransports(reporter)
}
