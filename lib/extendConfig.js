var packagejson = require('../package.json')
var commander = require('./reportingCommander')
var extend = require('node.extend')
var path = require('path')
var extend = require('node.extend')
var winston = require('winston')
var mkdirp = require('mkdirp')
var fs = require('fs')

function addFileLogger (reporter) {
  var defaultOpts = {
    providerName: 'winston',
    silent: false,
    logDirectory: path.join(reporter.options.rootDirectory, 'logs')
  }

  reporter.options.logger = extend({}, defaultOpts, reporter.options.logger)

  if (reporter.options.logger && reporter.options.logger.providerName !== 'winston') {
    return
  }

  if (reporter.logger.transports.console) {
    if (reporter.options.logger.silent) {
      silentLogs(reporter.logger, true)
    }

    return
  }

  var transportSettings = {
    timestamp: true,
    colorize: true,
    level: reporter.options.mode === 'production' ? 'info' : 'debug'
  }

  var logDirectory = reporter.options.logger.logDirectory

  if (!fs.existsSync(logDirectory)) {
    mkdirp.sync(logDirectory)
  }

  reporter.logger.add(winston.transports.Console, transportSettings)
  reporter.logger.add(winston.transports.File, {
    name: 'main',
    filename: path.join(logDirectory, 'reporter.log'),
    maxsize: 10485760,
    json: false,
    level: transportSettings.level
  })
  reporter.logger.add(winston.transports.File, {
    name: 'error',
    level: 'error',
    filename: path.join(logDirectory, 'error.log'),
    handleExceptions: true,
    json: false
  })

  if (reporter.options.logger.silent) {
    silentLogs(reporter.logger, true)
  }
}

function silentLogs (logger, active) {
  if (logger.transports) {
    Object.keys(logger.transports).forEach(function (transportName) {
      // this is the recommended way to modify transports in runtime, as per winston's docs
      logger.transports[transportName].silent = active
    })
  }
}

module.exports = function (reporter) {
  reporter.version = packagejson.version
  addFileLogger(reporter)

  reporter.options.blobStorage = reporter.options.blobStorage || 'fileSystem'

  commander(reporter.options)
}
