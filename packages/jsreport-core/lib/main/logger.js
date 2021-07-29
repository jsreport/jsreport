const path = require('path')
const omit = require('lodash.omit')
const winston = require('winston')
const Transport = require('winston-transport')
const debug = require('debug')('jsreport')
const getLogMeta = require('../shared/getLogMeta')

class DebugTransport extends Transport {
  constructor (options = {}) {
    super(options)
    this.name = 'debug'
    this.level = options.level || 'debug'
  }

  log (level, msg, meta, callback) {
    debug(level + ' ' + msg)
    callback(null, true)
  }
}

function createLogger () {
  if (!winston.loggers.has('jsreport')) {
    const debugTransport = new DebugTransport()

    winston.loggers.add('jsreport', {
      transports: [debugTransport]
    })

    winston.loggers.get('jsreport').emitErrs = true

    winston.loggers.get('jsreport').on('error', function (err) {
      let dir
      let msg

      if (err.code === 'ENOENT') {
        dir = path.dirname(err.path)

        if (dir === '.') {
          msg = 'Error from logger (winston) while trying to use a file to store logs:'
        } else {
          msg = 'Error from logger (winston) while trying to use a file to store logs. If the directory "' + dir + '" does not exist, please create it:'
        }

        // make the error intentionally more visible to get the attention of the user
        console.error('------------------------')
        console.error(msg, err)
        console.error('------------------------')
      }
    })
  } else {
    if (!winston.loggers.get('jsreport').transports.debug) {
      winston.loggers.get('jsreport').add(DebugTransport)
    }
  }

  const logger = winston.loggers.get('jsreport')

  logger.rewriters.push((level, msg, meta) => {
    return getLogMeta(level, msg, meta)
  })

  return logger
}

function configureLogger (logger, _transports) {
  const transports = _transports || {}

  const knownTransports = {
    debug: DebugTransport,
    memory: winston.transports.Memory,
    console: winston.transports.Console,
    file: winston.transports.File,
    http: winston.transports.Http
  }

  const knownOptions = ['transport', 'module', 'enabled']

  Object.keys(transports).forEach((transpName) => {
    const transpOptions = transports[transpName]
    let transportModule

    if (!transpOptions || typeof transpOptions !== 'object' || Array.isArray(transpOptions)) {
      return
    }

    if (typeof transpOptions.transport !== 'string' || transpOptions.transport === '') {
      throw new Error(`Invalid option for transport object "${
        transpName
      }", option "transport" is not specified or has an incorrect value, must be a string with a valid value. check your "logger" config`)
    }

    if (typeof transpOptions.level !== 'string' || transpOptions.level === '') {
      throw new Error(`Invalid option for transport object "${
        transpName
      }", option "level" is not specified or has an incorrect value, must be a string with a valid value. check your "logger" config`)
    }

    if (transpOptions.enabled === false) {
      return
    }

    if (knownTransports[transpOptions.transport]) {
      if (!logger.transports[transpName]) {
        logger.add(knownTransports[transpOptions.transport], Object.assign(omit(transpOptions, knownOptions), {
          name: transpName
        }))
      }
    } else {
      if (transpOptions.module == null) {
        throw new Error(`Invalid option for transport object "${
          transpName
        }", option "transport" has an unknown transport type: "${transpOptions.transport}". check your "logger" config`)
      }

      if (typeof transpOptions.module !== 'string') {
        throw new Error(`Invalid option for transport object "${
          transpName
        }", option "module" has an incorrect value, must be a string with a module name. check your "logger" config`)
      }

      try {
        transportModule = require(transpOptions.module)

        if (typeof winston.transports[transpOptions.transport] === 'function') {
          transportModule = winston.transports[transpOptions.transport]
        } else if (transportModule && typeof transportModule[transpOptions.transport] === 'function') {
          transportModule = transportModule[transpOptions.transport]
        }

        if (typeof transportModule !== 'function') {
          throw new Error(`Invalid option for transport object "${
            transpName
          }", module "${transpOptions.module}" does not export a valid transport. check your "logger" config`)
        }
      } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Invalid option for transport object "${
            transpName
          }", module "${transpOptions.module}" in "module" option could not be found. are you sure that you have installed it?. check your "logger" config'`)
        }

        throw e
      }

      if (!logger.transports[transpName]) {
        logger.add(transportModule, Object.assign(omit(transpOptions, knownOptions), {
          name: transpName
        }))
      }
    }
  })
}

function silentLogs (logger) {
  if (logger.transports) {
    Object.keys(logger.transports).forEach((transportName) => {
    // this is the recommended way to modify transports in runtime, as per winston's docs
      logger.transports[transportName].silent = true
    })
  }
}

module.exports.createLogger = createLogger
module.exports.configureLogger = configureLogger
module.exports.silentLogs = silentLogs
