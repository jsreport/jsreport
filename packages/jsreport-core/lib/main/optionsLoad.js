const path = require('path')
const fs = require('fs')
const extend = require('node.extend.without.arrays')
const decamelize = require('decamelize')
const nconf = require('nconf')
const appRoot = require('app-root-path')
const { ignoreInitialSchemaProperties } = require('./optionsSchema')

const {
  getDefaultLoadConfig,
  getDefaultTempDirectory,
  getDefaultRootDirectory
} = require('./defaults')

/**
 * Initialize configuration options. This includes loading config files or initializing default config values
 */
async function optionsLoad ({
  defaults,
  options,
  validator,
  onConfigLoaded
}) {
  let shouldLoadExternalConfig = defaults.loadConfig

  if (options.loadConfig != null) {
    shouldLoadExternalConfig = options.loadConfig
  }

  if (shouldLoadExternalConfig == null) {
    shouldLoadExternalConfig = getDefaultLoadConfig()
  }

  let loadConfigResult

  if (shouldLoadExternalConfig) {
    loadConfigResult = await loadConfig(defaults, options)
  } else {
    loadConfigResult = await loadConfig(defaults, options, false)
  }

  const explicitOptions = loadConfigResult[0]
  const appliedConfigFile = loadConfigResult[1]

  options.loadConfig = shouldLoadExternalConfig

  // validating initial options at very first to ensure basic options are right
  // this makes afterConfigLoaded function be able to see sanitized values and let us
  // apply defaults later doing checks that expects the right value type
  const rootOptionsValidation = validator.validateRoot(options, {
    rootPrefix: 'rootOptions',
    ignore: ignoreInitialSchemaProperties
  })

  if (!rootOptionsValidation.valid) {
    throw new Error(`options contain values that does not match the defined base root schema. ${rootOptionsValidation.fullErrorMessage}`)
  }

  options.appDirectory = options.appDirectory || appRoot.toString()

  // if parentModuleDirectory is empty or null here we proceed with the fallback value to rootDirectory
  if (!options.parentModuleDirectory) {
    options.parentModuleDirectory = options.rootDirectory
  }

  options.extensions = options.extensions || {}
  options.logger = options.logger || {}

  if (onConfigLoaded != null) {
    await onConfigLoaded()
  }

  if (options.tempDirectory && !path.isAbsolute(options.tempDirectory)) {
    options.tempDirectory = path.join(options.rootDirectory, options.tempDirectory)
  }

  options.tempDirectory = options.tempDirectory || getDefaultTempDirectory()
  options.tempAutoCleanupDirectory = path.join(options.tempDirectory, 'autocleanup')
  options.tempCoreDirectory = path.join(options.tempDirectory, 'core')
  options.store = options.store || { provider: 'memory' }

  options.sandbox = options.sandbox || {}

  // NOTE: handling back-compatible introduction of "trustUserCode" option, "allowLocalFilesAccess" is deprecated
  if (explicitOptions.allowLocalFilesAccess === true && explicitOptions.trustUserCode == null) {
    options.trustUserCode = true
  }

  if (options.trustUserCode === true) {
    options.sandbox.allowedModules = '*'
  }

  options.sandbox.nativeModules = options.sandbox.nativeModules || []
  options.sandbox.modules = options.sandbox.modules || []
  options.sandbox.allowedModules = options.sandbox.allowedModules || []

  if (!fs.existsSync(options.tempDirectory)) {
    fs.mkdirSync(options.tempDirectory, { recursive: true })
  }

  if (!fs.existsSync(options.tempAutoCleanupDirectory)) {
    fs.mkdirSync(options.tempAutoCleanupDirectory, { recursive: true })
  }

  if (!fs.existsSync(options.tempCoreDirectory)) {
    fs.mkdirSync(options.tempCoreDirectory, { recursive: true })
  }

  return [explicitOptions, appliedConfigFile]
}

/**
 * Merge config values from arguments, environment variables, default passed to the constructor and configuration file
 */
async function loadConfig (defaults, options, loadExternal = true) {
  let loadedOptions = {}
  // using clean instance of nconf, avoids sharing values between multiple instances of jsreport
  const nconfInstance = new nconf.Provider()

  let rootDirectory = options.rootDirectory || defaults.rootDirectory || getDefaultRootDirectory()

  if (options.rootDirectory) {
    loadedOptions.rootDirectory = options.rootDirectory
  }

  // we use `.defaults({ store: <value> }` because nconf has problems reading objects with `store`
  // property, nconf always take the value of `.store` instead of whole options object in that case
  // so we need to pass our object inside store property in order to be loaded correctly
  let nfn = nconfInstance.overrides({ store: options })

  let appliedConfigFile = null

  const makeTransform = ({ normalize, separator }) => (obj) => {
    let separators = !Array.isArray(separator) ? [separator] : separator

    separators = separators.join('')

    if (normalize === true && obj.key === 'extensions' && typeof obj.value === 'object') {
      Object.keys(obj.value).forEach((extensionKey) => {
        const realExtensionName = decamelize(extensionKey, '-')
        const currentValue = obj.value[extensionKey]
        delete obj.value[extensionKey]

        // the camelCase key version should already contain all merged values
        // (from both the real extension name with "-" and camel case)
        obj.value[realExtensionName] = currentValue
      })
    } else if (!normalize && obj.key.startsWith('extensions')) {
      // the transform ensures that camelCase alias keys of extensions
      // are being loaded as decamelized keys, this is needed
      // in order to respect the order of configuration loading
      // for args and env config values
      const match = new RegExp(`extensions[${separators}](.[^${separators}]*)[${separators}]*.*`).exec(obj.key)

      if (!match) {
        return obj
      }

      if (match.length < 2) {
        throw new Error(`Wrong configuration value ${obj.key}`)
      }

      const realExtensionName = decamelize(match[1], '-')
      obj.key = obj.key.replace(match[1], realExtensionName)
    }

    return obj
  }

  if (loadExternal) {
    const separators = ['_', ':']

    nfn = nfn.argv({
      // we make a transform that just normalize keys,
      // because the transform for args receives single key "extensions" with
      // already parsed values of nested args
      // "--extensions.something.value = true", "--extensions.something2.value = true".
      // unlike the transform for env store which receives raw keys
      transform: makeTransform({ normalize: true })
    }).env({
      separator: ':',
      transform: makeTransform({ separator: separators })
    }).env({
      separator: '_',
      transform: makeTransform({ separator: separators })
    })
  }

  if (nfn.get('rootDirectory') != null) {
    rootDirectory = nfn.get('rootDirectory')
  }

  // the highest priority for applied config file has file specified using configFile option
  const configFileParam = nfn.get('configFile')

  if (configFileParam) {
    const configFilePath = path.isAbsolute(configFileParam) ? configFileParam : path.join(rootDirectory, configFileParam)

    if (!fs.existsSync(configFilePath)) {
      throw new Error('Config file ' + configFileParam + ' was not found.')
    }

    appliedConfigFile = configFileParam

    nfn.file({ file: configFilePath })

    if (nfn.get('rootDirectory') != null) {
      rootDirectory = nfn.get('rootDirectory')
    }
  }

  if (loadExternal) {
    // no config file applied so far, lets try to apply the default jsreport.config.json
    if (!appliedConfigFile) {
      if (fs.existsSync(path.join(rootDirectory, 'jsreport.config.json'))) {
        appliedConfigFile = 'jsreport.config.json'
        nfn.file({ file: path.join(rootDirectory, 'jsreport.config.json') })

        if (nfn.get('rootDirectory') != null) {
          rootDirectory = nfn.get('rootDirectory')
        }
      }
    }
  }

  // we pass a copy of defaults to avoid loosing the original
  // object values
  nfn.defaults({ store: extend(true, {}, defaults) })

  Object.assign(options, nconfInstance.get())

  loadedOptions = extend(true, {}, options, loadedOptions)

  options.rootDirectory = rootDirectory

  return [loadedOptions, appliedConfigFile]
}

module.exports = optionsLoad
