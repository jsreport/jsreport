var commander = require('./reportingCommander')
var path = require('path')
var _ = require('underscore')
var extend = require('node.extend')
var mkdirp = require('mkdirp')

function addTransports (reporter) {
  var defaultOpts = {
    silent: false
  }

  var defaultLevel
  var consoleTransport
  var fileTransport
  var errorTransport
  var logDirectory
  var containsTransports
  var transportSettings = {}

  if (reporter.options.logger && reporter.options.logger.providerName != null) {
    console.log(
      'Usage of deprecated option `logger.providerName` detected, ' +
      '`logger.providerName` is deprecated and will be removed in future versions, ' +
      'see the new format of "logger" options in https://jsreport.net/learn/configuration'
    )
  }

  if (reporter.options.logger && reporter.options.logger.logDirectory != null) {
    console.log(
      'Usage of deprecated option `logger.logDirectory` detected, ' +
      '`logger.logDirectory` is deprecated and will be removed in future versions, ' +
      'see the new format of "logger" options in https://jsreport.net/learn/configuration'
    )
  }

  reporter.options.logger = extend({}, defaultOpts, reporter.options.logger)

  containsTransports = optionsContainsTransports(_.omit(reporter.options.logger, ['silent', 'logDirectory', 'providerName']))

  // if logDirectory is empty set to path.join(reporter.options.rootDirectory, 'logs') for compatibility with older versions
  if (reporter.options.logger.logDirectory == null) {
    reporter.options.logger.logDirectory = path.join(reporter.options.rootDirectory, 'logs')
  }

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
    filename: containsTransports ? 'logs/reporter.log' : path.join(logDirectory, 'reporter.log'),
    maxsize: 10485760,
    json: false
  }

  errorTransport = {
    transport: 'file',
    level: 'error',
    filename: containsTransports ? 'logs/error.log' : path.join(logDirectory, 'error.log'),
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
  } else {
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
  }

  if (
    reporter.options.logger.error &&
    typeof reporter.options.logger.error === 'object' &&
    !Array.isArray(reporter.options.logger.error)
  ) {
    transportSettings.error = extend({}, errorTransport, reporter.options.logger.error)
  }

  // applying transports
  reporter.options.logger = extend(reporter.options.logger, transportSettings)

  // winston doesn't create the directories for logs automatically
  // we don't want to do it for developers as well, but also we want to make jsreport with default config running
  // without errors, so we break the consistency here and precreate the logs directory if the config equals to default
  if (reporter.options.logger.file &&
      reporter.options.logger.file.filename === fileTransport.filename &&
      !reporter.options.logger.file.dirname &&
      reporter.options.logger.file.enabled !== false) {
    mkdirp.sync(path.dirname(reporter.options.logger.file.filename))
  }
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
