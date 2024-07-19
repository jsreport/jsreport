const path = require('path')
const omit = require('lodash.omit')
const { MESSAGE } = require('triple-beam')
const winston = require('winston')
const Transport = require('winston-transport')
const debug = require('debug')('jsreport')
const createDefaultLoggerFormat = require('./createDefaultLoggerFormat')
const createNormalizeMetaLoggerFormat = require('./createNormalizeMetaLoggerFormat')
const Request = require('./request')

const defaultLoggerFormat = createDefaultLoggerFormat()
const defaultLoggerFormatWithTimestamp = createDefaultLoggerFormat({ timestamp: true })
const normalizeMetaLoggerFormat = createNormalizeMetaLoggerFormat()

function createLogger () {
  const logger = winston.createLogger(getConfigurationOptions())

  logger.on('error', (err) => {
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

  return logger
}

function configureLogger (logger, _transports) {
  const transports = _transports || {}
  const transportFormatMap = new WeakMap()

  // we ensure we do .format cleanup on options first before checking if the logger
  // is configured or not, this ensure that options are properly cleaned up when
  // configureLogger is called more than once (like when execution cli commands from extensions)
  for (const [, transpOptions] of Object.entries(transports)) {
    if (transpOptions.format != null) {
      transportFormatMap.set(transpOptions, transpOptions.format)
      delete transpOptions.format
    }
  }

  const configuredPreviously = logger.__configured__ === true

  if (configuredPreviously) {
    return
  }

  const knownTransports = {
    debug: DebugTransport,
    console: winston.transports.Console,
    file: winston.transports.File,
    http: winston.transports.Http
  }

  const knownOptions = ['transport', 'module', 'enabled']
  const transportsToAdd = []

  for (const [transpName, transpOptions] of Object.entries(transports)) {
    let transportModule

    if (!transpOptions || typeof transpOptions !== 'object' || Array.isArray(transpOptions)) {
      continue
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

    if (transpName !== 'debug' && transpOptions.enabled === false) {
      continue
    }

    let originalFormat

    if (transportFormatMap.has(transpOptions)) {
      originalFormat = transportFormatMap.get(transpOptions)
    }

    if (
      originalFormat != null &&
      typeof originalFormat.constructor !== 'function'
    ) {
      throw new Error(`Invalid option for transport object "${
        transpName
      }", option "format" has an incorrect value, must be an instance of loggerFormat. check your "logger" config`)
    }

    const options = Object.assign(omit(transpOptions, knownOptions), {
      name: transpName
    })

    if (originalFormat != null) {
      options.format = originalFormat
    }

    if (knownTransports[transpOptions.transport]) {
      if (transpName === 'debug') {
        options.enabled = transpOptions.enabled !== false
      }

      transportsToAdd.push({
        TransportClass: knownTransports[transpOptions.transport],
        options
      })
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

      transportsToAdd.push({
        TransportClass: transportModule,
        options
      })
    }
  }

  for (const { TransportClass, options } of transportsToAdd) {
    if (options.silent) {
      continue
    }

    const transportInstance = new TransportClass(options)

    const existingTransport = logger.transports.find((t) => t.name === transportInstance.name)

    if (existingTransport) {
      logger.remove(existingTransport)
    }

    logger.add(transportInstance)
  }

  const originalLog = logger.log

  // we want to normalize the req has httpIncomingRequest early
  // otherwise we will get serialization issues when trying to
  // log http.IncomingRequest
  logger.log = function (level, msg, ...splat) {
    const [meta] = splat

    if (
      typeof meta === 'object' &&
      meta !== null &&
      meta.context != null &&
      meta.socket != null
    ) {
      splat[0] = Request(meta)
    }

    return originalLog.call(this, level, msg, ...splat)
  }

  logger.__configured__ = true
}

function getConfigurationOptions () {
  return {
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    },
    format: winston.format.combine(
      normalizeMetaLoggerFormat(),
      defaultLoggerFormatWithTimestamp()
    ),
    transports: [new DebugTransport()]
  }
}

function silentLogs (logger) {
  if (logger.transports.length > 0) {
    // this is the recommended way to modify transports in runtime, as per winston's docs
    for (const transport of logger.transports) {
      transport.silent = true
    }
  }
}

class DebugTransport extends Transport {
  constructor (options = {}) {
    super(options)
    this.name = 'debug'
    this.level = options.level || 'debug'

    this.format = options.format || winston.format.combine(
      winston.format.colorize(),
      defaultLoggerFormat()
    )

    this.enabled = options.enabled !== false
  }

  log (info, callback) {
    if (this.enabled) {
      setImmediate(() => {
        this.emit('logged', info)
      })

      debug(info[MESSAGE])
    }

    if (callback) {
      callback()
    }
  }
}

module.exports.createLogger = createLogger
module.exports.configureLogger = configureLogger
module.exports.silentLogs = silentLogs
