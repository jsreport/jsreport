const fs = require('fs').promises
const path = require('path')

module.exports = async (reporter, definition) => {
  let helpers
  reporter.initializeListeners.add('assets', async () => {
    helpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()
  })

  reporter.beforeRenderListeners.add(definition.name, this, (req, res) => {
    req.context.systemHelpers += helpers + '\n'
  })

  reporter.extendProxy((proxy, req) => {
    proxy.localization = {
      localize: async function (key, folder) {
        if (key == null) {
          throw new Error('localize expects key parameter')
        }

        if (folder == null) {
          throw new Error('localize expects path to folder with localization assets as second parameter')
        }

        if (req.options.language) {
          reporter.logger.warn('options.language is deprecated, use options.localization.language instead', req)
        }

        let language = req.options.localization ? req.options.localization.language : req.options.language
        if (!language) {
          language = req.template.localization ? req.template.localization.language : null
        }

        if (!language) {
          throw new Error('Can\'t call localize without specified language')
        }

        const localizationDataPath = path.posix.join(folder, `${language || 'en'}.json`)
        const resolvedValue = await proxy.folders.resolveEntityFromPath(localizationDataPath, 'assets')

        if (!resolvedValue) {
          throw new Error('localize helper couldn\'t find asset with data at ' + localizationDataPath)
        }

        const localizedData = JSON.parse(resolvedValue.entity.content.toString())
        return localizedData[key]
      }
    }
  })
}
