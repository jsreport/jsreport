const fs = require('fs').promises
const path = require('path')

module.exports = async (reporter, definition) => {
  let helpers

  reporter.initializeListeners.add('assets', async () => {
    helpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()
  })

  reporter.registerHelpersListeners.add(definition.name, (req) => {
    return helpers
  })

  reporter.beforeRenderListeners.add(definition.name, (req) => {
    if (req.template.localization?.language != null && req.options.localization?.language == null) {
      req.options.localization = Object.assign({}, req.options.localization, { language: req.template.localization.language })
    }
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

        const localizationDataPath = path.posix.join(folder, `${language || 'en'}.json`)
        const resolvedCurrentDirectoryPath = await proxy.currentDirectoryPath()
        const resolvedValue = await proxy.folders.resolveEntityFromPath(localizationDataPath, 'assets', { currentPath: resolvedCurrentDirectoryPath })

        if (!resolvedValue) {
          throw new Error('localize helper couldn\'t find asset with data at ' + localizationDataPath)
        }

        const localizedData = JSON.parse(resolvedValue.entity.content.toString())
        return localizedData[key]
      }
    }
  })
}
