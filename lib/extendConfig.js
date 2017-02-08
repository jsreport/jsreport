var packagejson = require('../package.json')
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
}

module.exports = function (reporter) {
  reporter.version = packagejson.version
  addFileLogger(reporter)

  reporter.options.blobStorage = reporter.options.blobStorage || 'fileSystem'
}
