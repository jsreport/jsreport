var commander = require('./reportingCommander')
var path = require('path')
var _ = require('underscore')
var extend = require('node.extend')
var mkdirp = require('mkdirp')
var fs = require('fs')

function addTransports (reporter) {
  var defaultOpts = {
    silent: false,
    logDirectory: path.join(reporter.options.rootDirectory, 'logs')
  }

  var defaultLevel
  var consoleTransport
  var fileTransport
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
    reporter.options.logger.providerName !== 'console' &&
    reporter.options.logger.providerName != null
  ) {
    return
  }

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

  defaultLevel = reporter.options.mode === 'production' ? 'info' : 'debug'

  consoleTransport = {
    transport: 'console',
    level: defaultLevel,
    timestamp: true,
    colorize: true
  }

  fileTransport = {
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
      file: fileTransport,
      error: errorTransport
    }
  } else if (reporter.options.logger.providerName === 'console') {
    transportSettings = {
      console: consoleTransport
    }
  } else if (
    reporter.options.logger.providerName == null &&
    !optionsContainsTransports(_.omit(reporter.options.logger, ['silent', 'logDirectory', 'providerName']))
  ) {
    transportSettings = {
      console: consoleTransport,
      file: fileTransport,
      error: errorTransport
    }
  }

  // if providerName is empty set to "winston" for compatibility with older versions
  if (reporter.options.logger.providerName == null) {
    reporter.options.logger.providerName = 'winston'
  }

  // applying user customizations to standard transports
  if (
    reporter.options.logger.console &&
    typeof reporter.options.logger.console === 'object' &&
    !Array.isArray(reporter.options.logger.console)
  ) {
    transportSettings.console = extend({}, consoleTransport, reporter.options.logger.console)
  }

  if (
    reporter.options.logger.file &&
    typeof reporter.options.logger.file === 'object' &&
    !Array.isArray(reporter.options.logger.file)
  ) {
    transportSettings.file = extend({}, fileTransport, reporter.options.logger.file)
    transportSettings.file.filename = path.resolve(logDirectory, transportSettings.file.filename)
  }

  if (
    reporter.options.logger.error &&
    typeof reporter.options.logger.error === 'object' &&
    !Array.isArray(reporter.options.logger.error)
  ) {
    transportSettings.error = extend({}, errorTransport, reporter.options.logger.error)
    transportSettings.error.filename = path.resolve(logDirectory, transportSettings.error.filename)
  }

  if (transportSettings.file || transportSettings.error) {
    if (!fs.existsSync(logDirectory)) {
      mkdirp.sync(logDirectory)
    }
  }

  // applying transports
  reporter.options.logger = extend(reporter.options.logger, transportSettings)
}

function optionsContainsTransports (_options) {
  var options = _options || {}

  return Object.keys(options).some(function (optName) {
    var opt = options[optName]

    return (
      opt &&
      typeof opt === 'object' &&
      !Array.isArray(opt)
    )
  })
}

module.exports = function (reporter) {
  addTransports(reporter)

  reporter.options.blobStorage = reporter.options.blobStorage || 'fileSystem'

  commander(reporter.options)
}
