const fs = require('fs').promises
const path = require('path')
const _get = require('lodash.get')

module.exports = async (reporter, definition) => {
  let helpers

  reporter.localization = {
    cacheRequestsMap: new Map()
  }

  reporter.initializeListeners.add('assets', async () => {
    helpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()
  })

  reporter.registerHelpersListeners.add(definition.name, () => {
    return helpers
  })

  reporter.beforeRenderListeners.add(definition.name, (req) => {
    if (req.template.localization?.language != null && req.options.localization?.language == null && req.options.language == null) {
      req.options.localization = Object.assign({}, req.options.localization, { language: req.template.localization.language })
    }
  })

  reporter.afterRenderListeners.add(definition.name, (req) => {
    reporter.localization.cacheRequestsMap.delete(req.context.rootId)
  })

  reporter.renderErrorListeners.add(definition.name, (req) => {
    reporter.localization.cacheRequestsMap.delete(req.context.rootId)
  })

  reporter.extendProxy((proxy, req) => {
    proxy.localization = {
      localize: async function (key, folder) {
        let language

        if (typeof key === 'object') {
          const options = key
          key = options.key
          folder = options.folder
          language = options.language
        }

        if (key == null) {
          throw new Error('localize expects key parameter')
        }

        if (folder == null) {
          throw new Error('localize expects path to folder with localization assets as second parameter')
        }

        if (req.options.language) {
          reporter.logger.warn('options.language is deprecated, use options.localization.language instead', req)
        }

        language = language || (req.options.localization ? req.options.localization.language : req.options.language)

        if (!language) {
          throw new Error('Can\'t call localize without specified language')
        }

        if (!reporter.localization.cacheRequestsMap.has(req.context.rootId)) {
          reporter.localization.cacheRequestsMap.set(req.context.rootId, {})
        }
        const cache = reporter.localization.cacheRequestsMap.get(req.context.rootId)

        const localizationDataPath = path.posix.join(folder, `${language || 'en'}.json`)
        const resolvedCurrentDirectoryPath = await proxy.currentDirectoryPath()

        const localizationCacheKey = path.posix.join(resolvedCurrentDirectoryPath || '/', localizationDataPath)

        if (cache[localizationCacheKey] == null) {
          cache[localizationCacheKey] = (async () => {
            const resolvedValue = await proxy.folders.resolveEntityFromPath(localizationDataPath, 'assets', { currentPath: resolvedCurrentDirectoryPath })

            if (!resolvedValue) {
              throw new Error('localize helper couldn\'t find asset with data at ' + localizationDataPath)
            }

            return JSON.parse(resolvedValue.entity.content.toString())
          })()
        }

        const localizationData = await cache[localizationCacheKey]

        if (localizationData[key] == null && key.includes('.')) {
          return _get(localizationData, key)
        }

        return localizationData[key]
      }
    }
  })
}
