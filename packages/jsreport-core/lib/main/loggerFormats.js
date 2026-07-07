const createDefaultLoggerFormat = require('./createDefaultLoggerFormat')
const createJsonLoggerFormat = require('./createJsonLoggerFormat')

const builtInFormats = {
  text: () => createDefaultLoggerFormat(),
  'text-with-timestamp': () => createDefaultLoggerFormat({ timestamp: true }),
  json: () => createJsonLoggerFormat()
}

function isWinstonFormat (value) {
  // a winston format constructor is a function returned by winston.format(fn).
  // a winston format instance has a .transform function.
  // we accept either.
  if (typeof value === 'function') return true
  if (value != null && typeof value === 'object' && typeof value.transform === 'function') return true
  return false
}

function ensureInstance (value) {
  // built-in / custom factories may return a winston format constructor (function)
  // or an already-instantiated format. Normalize to an instance so consumers can
  // always call .transform on the returned value.
  return typeof value === 'function' ? value() : value
}

function resolveFormat (formatOption, customFormats = {}) {
  if (formatOption == null) return null

  if (isWinstonFormat(formatOption)) {
    return ensureInstance(formatOption)
  }

  if (typeof formatOption !== 'string') {
    throw new Error('Invalid logger format value, must be a string name or a winston format. check your "logger" config')
  }

  if (Object.prototype.hasOwnProperty.call(customFormats, formatOption)) {
    return ensureInstance(customFormats[formatOption]())
  }

  if (Object.prototype.hasOwnProperty.call(builtInFormats, formatOption)) {
    return ensureInstance(builtInFormats[formatOption]())
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

    let factory
    if (typeof def.export === 'string' && def.export !== '') {
      factory = mod[def.export]
    } else if (typeof mod === 'function') {
      factory = mod
    } else if (mod != null && typeof mod.default === 'function') {
      factory = mod.default
    }

    if (typeof factory !== 'function') {
      throw new Error(`Invalid option "logger.formats.${name}", module "${def.module}" must export a factory function (default export or named via "export")`)
    }

    const formatOptions = def.options || {}

    loaded[name] = () => {
      const result = factory(formatOptions)
      if (!isWinstonFormat(result)) {
        throw new Error(`logger.formats.${name}: factory from module "${def.module}" did not return a winston format`)
      }
      return typeof result === 'function' ? result() : result
    }
  }

  return loaded
}

module.exports = { resolveFormat, loadCustomFormats, builtInFormats }
