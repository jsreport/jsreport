'use strict'

const path = require('path')
const mkdirp = require('mkdirp')

module.exports = (options) => {
  const coreOptions = {
    // we load config but don't do extensions discover by default
    loadConfig: true,
    appDirectory: process.cwd(),
    parentModuleDirectory: process.cwd(),
    rootDirectory: process.cwd()
  }

  if (process.env.binary_tempDirectory) {
    coreOptions.tempDirectory = process.env.binary_tempDirectory
  }

  const jsreport = options.getJsreport()

  jsreport.defaults = Object.assign(jsreport.defaults, {
    templatingEngines: {
      strategy: 'in-process'
    },
    // we put it as defaults to be able to override with config later
    discover: false
  })

  jsreport.options = Object.assign(jsreport.options, coreOptions)

  // executable defaults to send logs the same way than jsreport-core
  jsreport.afterConfigLoaded((reporter) => {
    // winston doesn't create the directories for logs automatically
    // we don't want to do it for developers as well, but also we want to make jsreport with default config running
    // without errors, so we break the consistency here and precreate the logs directory if the config equals to default
    if (jsreport.options.logger.file && jsreport.options.logger.file.filename === 'logs/reporter.log') {
      mkdirp.sync(path.dirname(jsreport.options.logger.file.filename))
    }

    jsreport.options.logger.console = Object.assign({
      transport: 'console',
      level: 'debug',
      timestamp: true,
      colorize: true
    }, jsreport.options.logger.console)

    if (jsreport.options.logger.file) {
      jsreport.options.logger.file = Object.assign({
        transport: 'file',
        level: 'debug',
        filename: 'logs/reporter.log',
        maxsize: 10485760,
        json: false
      }, jsreport.options.logger.file)
    }

    if (jsreport.options.logger.error) {
      jsreport.options.logger.error = Object.assign({
        transport: 'file',
        level: 'error',
        filename: 'logs/error.log',
        handleExceptions: true,
        json: false
      }, jsreport.options.logger.error)
    }
  })

  const Execution = require('./execution')

  jsreport.execution = new Execution(
    options.originalProjectDir,
    options.resources,
    options.version,
    options.shortid,
    coreOptions.tempDirectory
  )

  // enhance init function and add resources initialization
  const originalInit = jsreport.init.bind(jsreport)

  jsreport.init = async function exeJsreportInit () {
    await jsreport.execution.ensureTmpResources()

    // now we have resources available, we can use extensions
    options.requireExtensions().forEach((extInit) => {
      const ext = extInit()
      ext.source = extInit.source
      ext.version = extInit.version
      ext.cliModule = extInit.cliModule
      jsreport.use(ext)
    })

    await originalInit()

    return jsreport
  }

  return jsreport
}
