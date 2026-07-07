const { format } = require('winston')
const createDefaultLoggerFormat = require('./createDefaultLoggerFormat')

const builtInFormats = {
  text: () => createDefaultLoggerFormat()(),
  textWithTimestamp: () => createDefaultLoggerFormat({ timestamp: true })(),
  json: (opts) => format.json(opts)
}

function resolveFormat (formatOption, customFormats = {}) {
  if (formatOption == null) {
    return
  }

  if (isWinstonFormatInstance(formatOption)) {
    return formatOption
  }

  if (typeof formatOption !== 'string') {
    throw new Error('Invalid logger format value, must be a string name or a winston format. check your "logger" config')
  }

  if (Object.hasOwn(customFormats, formatOption)) {
    return customFormats[formatOption]()
  }

  if (Object.hasOwn(builtInFormats, formatOption)) {
    return builtInFormats[formatOption]()
  }

  const available = [...Object.keys(builtInFormats), ...Object.keys(customFormats)].join(', ')

  throw new Error(`Unknown logger format "${formatOption}". Available formats: ${available}. check your "logger" config`)
}

function loadCustomFormats (formatsConfig) {
  const loaded = {}

  if (formatsConfig == null) return loaded

  if (typeof formatsConfig !== 'object' || Array.isArray(formatsConfig)) {
    throw new Error('Invalid option "logger.formats", must be an object. check your "logger" config')
  }

  for (const [name, def] of Object.entries(formatsConfig)) {
    if (def == null || typeof def !== 'object') {
      throw new Error(`Invalid option "logger.formats.${name}", must be an object`)
    }

    let formatFactory

    // allow overriding options of built-in formats if no custom module specified
    if (Object.hasOwn(builtInFormats, name) && def.module == null) {
      formatFactory = builtInFormats[name]
    } else {
      if (typeof def.module !== 'string' || def.module === '') {
        throw new Error(`Invalid option "logger.formats.${name}", option "module" must be a non-empty string`)
      }

      let mod

      try {
        mod = require(def.module)
      } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Invalid option "logger.formats.${name}", module "${def.module}" not found. are you sure that you have installed it?`)
        }
        throw e
      }

      if (typeof mod === 'function') {
        formatFactory = mod
      }
    }

    if (typeof formatFactory !== 'function') {
      throw new Error(`Invalid option "logger.formats.${name}", module "${def.module}" must export a factory function (default export or named via "export")`)
    }

    const formatOptions = def.options || {}

    loaded[name] = () => {
      if (!isWinstonFormatFactory(formatFactory)) {
        throw new Error(`logger.formats.${name}: module "${def.module}" did not return a winston format`)
      }

      return formatFactory(formatOptions)
    }
  }

  return loaded
}

function isWinstonFormatFactory (value) {
  return typeof value === 'function' && typeof value.constructor === 'function'
}

function isWinstonFormatInstance (value) {
  return value != null && typeof value === 'object' && typeof value.transform === 'function'
}

module.exports = { resolveFormat, loadCustomFormats, builtInFormats, isWinstonFormatFactory, isWinstonFormatInstance }
