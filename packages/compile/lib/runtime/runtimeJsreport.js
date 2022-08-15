
const { loggerFormat, createDefaultLoggerFormat } = require('@jsreport/jsreport-core')
const defaultLoggerFormatWithTimestamp = createDefaultLoggerFormat({ timestamp: true })

module.exports = (options) => {
  const coreOptions = {
    // we load config but don't do extensions discover by default
    loadConfig: true,
    // the extensions location cache does not work in exe,
    // so we don't enable it
    useExtensionsLocationCache: false,
    appDirectory: process.cwd(),
    parentModuleDirectory: process.cwd(),
    rootDirectory: process.cwd()
  }

  if (process.env.binary_tempDirectory) {
    coreOptions.tempDirectory = process.env.binary_tempDirectory
  }

  const jsreport = options.getJsreport()

  jsreport.defaults = Object.assign(jsreport.defaults, {
    // we put it as defaults to be able to override with config later
    discover: false
  })

  jsreport.options = Object.assign(jsreport.options, coreOptions)

  const Execution = require('./execution')

  jsreport.execution = new Execution(
    options.originalProjectDir,
    options.resources,
    options.version,
    options.shortid,
    coreOptions.tempDirectory
  )

  // dont use the jsreport default logs in the binary to avoid polluting work directory
  // just when uer configures the logs console,file,error => apply the default settings to them as in jsreport
  jsreport.afterConfigLoaded((reporter) => {
    reporter.options.logger.console = Object.assign({
      transport: 'console',
      level: 'debug',
      handleExceptions: true,
      format: loggerFormat.combine(
        loggerFormat.colorize(),
        defaultLoggerFormatWithTimestamp()
      )
    }, reporter.options.logger.console)

    if (reporter.options.logger.file) {
      reporter.options.logger.file = Object.assign({
        transport: 'file',
        level: 'debug',
        filename: 'logs/reporter.log',
        maxsize: 10485760,
        handleExceptions: true
      }, reporter.options.logger.file)
    }

    if (reporter.options.logger.error) {
      reporter.options.logger.error = Object.assign({
        transport: 'file',
        level: 'error',
        filename: 'logs/error.log',
        handleExceptions: true
      }, reporter.options.logger.error)
    }
  })

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
