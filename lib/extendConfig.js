var commander = require('./reportingCommander')
var path = require('path')
var extend = require('node.extend')
var mkdirp = require('mkdirp')
var fs = require('fs')

function addTransports (reporter) {
  var defaultOpts = {
    providerName: 'winston',
    silent: false,
    logDirectory: path.join(reporter.options.rootDirectory, 'logs')
  }

  var defaultLevel
  var consoleTransport
  var mainTransport
  var errorTransport
  var logDirectory
  var transportSettings = {}

  if (reporter.options.logger && reporter.options.logger.providerName != null) {
    console.log(
      'Usage of deprecated option `logger.providerName` detected, ' +
      '`logger.providerName` is deprecated and will be removed in future versions, ' +
      'see the new format of "logger" options in https://jsreport.net/learn/configuration'
    )
  }

  reporter.options.logger = extend({}, defaultOpts, reporter.options.logger)

  logDirectory = reporter.options.logger.logDirectory

  // preserving original behavior, not applying any transport when
  // `reporter.options.logger.providerName` has an unknow value.
  if (
    reporter.options.logger &&
    reporter.options.logger.providerName !== 'winston' &&
    reporter.options.logger.providerName !== 'console'
  ) {
    return
  }

  defaultLevel = reporter.options.mode === 'production' ? 'info' : 'debug'

  consoleTransport = {
    transport: 'console',
    level: defaultLevel,
    timestamp: true,
    colorize: true
  }

  mainTransport = {
    transport: 'file',
    level: defaultLevel,
    filename: path.join(logDirectory, 'reporter.log'),
    maxsize: 10485760,
    json: false
  }

  errorTransport = {
    transport: 'file',
    level: 'error',
    filename: path.join(logDirectory, 'error.log'),
    handleExceptions: true,
    json: false
  }

  if (reporter.options.logger.providerName === 'winston') {
    transportSettings = {
      console: consoleTransport,
      main: mainTransport,
      error: errorTransport
    }
  } else if (reporter.options.logger.providerName === 'console') {
    transportSettings = {
      console: consoleTransport
    }
  }

  // applying user customizations to standard transports
  if (
    reporter.options.logger.console &&
    typeof reporter.options.logger.console === 'object' &&
    !Array.isArray(reporter.options.logger.console)
  ) {
    transportSettings.console = extend({}, transportSettings.console, reporter.options.logger.console)
  }

  if (
    reporter.options.logger.main &&
    typeof reporter.options.logger.main === 'object' &&
    !Array.isArray(reporter.options.logger.main)
  ) {
    transportSettings.main = extend({}, transportSettings.main, reporter.options.logger.main)
  }

  if (
    reporter.options.logger.error &&
    typeof reporter.options.logger.error === 'object' &&
    !Array.isArray(reporter.options.logger.error)
  ) {
    transportSettings.error = extend({}, transportSettings.error, reporter.options.logger.error)
  }

  if (transportSettings.main || transportSettings.error) {
    if (!fs.existsSync(logDirectory)) {
      mkdirp.sync(logDirectory)
    }
  }

  // applying transports
  reporter.options.logger = extend(reporter.options.logger, transportSettings)
}

module.exports = function (reporter) {
  addTransports(reporter)

  reporter.options.blobStorage = reporter.options.blobStorage || 'fileSystem'

  commander(reporter.options)
}
