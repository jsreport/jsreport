/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * ExtensionsManager responsible for loading and  registering jsreport extensions.
 */

const os = require('os')
const path = require('path')
const extend = require('node.extend.without.arrays')
const camelCase = require('camelcase')
const discover = require('./discover')
const findVersion = require('./findVersion')
const validateMinimalVersion = require('./validateMinimalVersion')
const sorter = require('./sorter')

module.exports = (reporter) => {
  return {
    availableExtensions: [],
    recipes: [],
    engines: [],
    usedExtensions: [],
    get extensions () {
      return this.availableExtensions.filter((e) => !e.options || e.options.enabled !== false)
    },

    async load (opts = {}) {
      this.availableExtensions = []

      if (reporter.options.discover || (reporter.options.discover !== false && this.usedExtensions.length === 0)) {
        const extensions = await discover({
          logger: reporter.logger,
          rootDirectory: reporter.options.rootDirectory,
          tempCoreDirectory: reporter.options.tempCoreDirectory,
          useExtensionsLocationCache: reporter.options.useExtensionsLocationCache
        })
        reporter.logger.debug(`Discovered ${extensions.length} extensions`)
        this.availableExtensions = this.availableExtensions.concat(extensions)
      }

      this.availableExtensions = this.availableExtensions.concat(this.usedExtensions)

      if (reporter.options.extensionsList) {
        this.availableExtensions = this.availableExtensions.filter((e) => reporter.options.extensionsList.indexOf(e.name) !== -1)
      }

      this.availableExtensions.sort(sorter)

      // filter out duplicated extensions
      // this can easily happen when you install jsreport and jsreport-cli into global modules
      this.availableExtensions = this.extensions.filter((v, i) => {
        if (!v.name) {
          return true
        }

        const extIndex = this.availableExtensions.findIndex(e => e.name === v.name)
        const isUnique = extIndex === i

        if (!isUnique) {
          reporter.logger.warn(`Filtering out duplicated extension "${v.name}" from ${v.directory}, using ${this.availableExtensions[extIndex].directory}`)
        }

        return isUnique
      })

      if (opts.onlyLocation !== true) {
        this.availableExtensions = await Promise.all(this.availableExtensions.map(async (e) => {
          const { version, pkgVersion, source } = await findVersion(e)
          return Object.assign(e, { source, version, pkgVersion })
        }))
      }
    },

    async init () {
      return this._useMany(this.availableExtensions)
    },

    use (extension) {
      if (typeof extension === 'function') {
        this.usedExtensions.push({
          main: extension,
          directory: reporter.options.parentModuleDirectory,
          dependencies: []
        })
        return
      }

      if (typeof extension === 'object') {
        this.usedExtensions.push(extension)
        return
      }

      throw new Error('use accepts function or object')
    },

    async _useMany (extensions) {
      const toValidateGroups = new Map()

      for (const e of extensions) {
        const activated = await this._useOne(e)

        if (!activated) {
          continue
        }

        const extensionRequires = Object.assign({}, e.requires)
        // core already validated here
        delete extensionRequires.core

        for (const baseExtName of Object.keys(extensionRequires)) {
          if (!toValidateGroups.has(baseExtName)) {
            toValidateGroups.set(baseExtName, [])
          }

          const deps = toValidateGroups.get(baseExtName)
          deps.push(e)
        }
      }

      for (const [baseExtName, deps] of toValidateGroups.entries()) {
        const baseExt = extensions.find((ext) => ext.name === baseExtName)

        if (baseExt == null || baseExt.pkgVersion == null) {
          continue
        }

        for (const ext of deps) {
          validateMinimalVersion({ name: baseExtName, version: baseExt.pkgVersion }, ext)
        }
      }
    },

    async _useOne (extension) {
      try {
        extension.options = extend(
          true,
          {},
          extension.options || {},
          extension.name != null ? reporter.options.extensions[camelCase(extension.name)] : {},
          extension.name != null ? reporter.options.extensions[extension.name] : {}
        )

        // we need to check for string "false" to support disabling extension by env or CLI args
        // since this option does not coerce by schema validation at this point but later
        if (extension.options.enabled === 'false' || extension.options.enabled === '0') {
          extension.options.enabled = false
        }

        if (extension.options.enabled === false) {
          if (!extension.name) {
            reporter.logger.debug(`Anonymous Extension${extension.directory != null ? ` at ${extension.directory}` : ''} is disabled, skipping`)
          } else {
            reporter.logger.debug(`Extension ${getExtensionDisplayName(extension)} is disabled, skipping`)
          }

          return false
        }

        validateMinimalVersion({ name: 'core', version: reporter.coreVersion }, extension)

        if (!extension.name) {
          reporter.logger.info(`Using anonymous extension${extension.directory != null ? ` at ${extension.directory}` : ''}`)
        } else {
          reporter.logger.info(`Using extension ${getExtensionDisplayName(extension)}`)
        }

        let optionsSchema

        if (extension.name != null) {
          optionsSchema = reporter.optionsValidator.getRootSchema().properties.extensions.properties[extension.name]
        }

        if (optionsSchema != null) {
          try {
            reporter.optionsValidator.addSchema(extension.name, optionsSchema)
          } catch (e) {
            throw new Error(`schema for extension options in definition does not contain a valid json schema. ${e.message}`)
          }

          const optionsValidationResult = reporter.optionsValidator.validate(extension.name, extension.options, { rootPrefix: 'options' })

          if (!optionsValidationResult.valid) {
            throw new Error(formatExtensionOptionsError(extension.name, optionsValidationResult.fullErrorMessage))
          }

          const availableExtensionIndex = this.availableExtensions.indexOf(extension)
          const usedExtensionIndex = this.usedExtensions.indexOf(extension)

          extension = new Proxy(extension, {
            set: (obj, prop, value, receiver) => {
              let newValue

              if (prop === 'options') {
                const newData = extend(true, {}, value)
                const result = reporter.optionsValidator.validate(extension.name, newData, { rootPrefix: 'options' })

                if (!result.valid) {
                  throw new Error(formatExtensionOptionsError(extension.name, result.fullErrorMessage))
                }

                newValue = newData
              } else {
                newValue = value
              }

              return Reflect.set(obj, prop, newValue, receiver)
            }
          })

          // ensure extension references in availableExtensions, usedExtensions have
          // the proxy instance also
          if (availableExtensionIndex !== -1) {
            this.availableExtensions[availableExtensionIndex] = extension
          }

          if (usedExtensionIndex !== -1) {
            this.usedExtensions[usedExtensionIndex] = extension
          }

          reporter.options.extensions[extension.name] = extension.options
        }

        if (typeof extension.main === 'function') {
          await extension.main.call(this, reporter, extension)
        } else {
          if (extension.directory && extension.main) {
            await require(path.join(extension.directory, extension.main)).call(this, reporter, extension)
          }
        }

        if (extension.options.enabled === false) {
          if (!extension.name) {
            reporter.logger.debug(`Anonymous Extension${extension.directory != null ? ` at ${extension.directory}` : ''} was disabled`)
          } else {
            reporter.logger.debug(`Extension ${getExtensionDisplayName(extension)} was disabled`)
          }
        }

        return extension.options.enabled !== false
      } catch (e) {
        let errorMsg

        if (!extension.name) {
          errorMsg = `Error when loading anonymous extension${extension.directory != null ? ` at ${extension.directory}` : ''}${os.EOL}${e.stack}`
        } else {
          errorMsg = `Error when loading extension ${getExtensionDisplayName(extension)}${os.EOL}${e.stack}`
        }

        throw new Error(errorMsg)
      }
    }
  }
}

function getExtensionDisplayName (extension) {
  if (extension.version != null) {
    return `${extension.name}@${extension.version}`
  }

  return extension.name
}

function formatExtensionOptionsError (extName, fullErrorMessage) {
  return `options of extension ${extName} contain values that does not match the defined schema. ${fullErrorMessage}`
}
