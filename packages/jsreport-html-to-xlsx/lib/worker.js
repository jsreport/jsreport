const recipe = require('./recipe')
const fs = require('fs').promises

const path = require('path')

module.exports = (reporter, definition) => {
  definition.options.tmpDir = reporter.options.tempAutoCleanupDirectory

  reporter.extensionsManager.recipes.push({
    name: 'html-to-xlsx',
    execute: recipe(reporter, definition)
  })

  reporter.options.sandbox.modules.push({
    alias: 'tmpHandler.js',
    path: path.join(__dirname, './tmpHandler.js')
  })

  reporter.beforeRenderListeners.insert({ after: 'data' }, 'htmlToXlsx', async (req) => {
    if (req.template.recipe !== 'html-to-xlsx') {
      return
    }

    req.data = req.data || {}
    req.data.$tempAutoCleanupDirectory = reporter.options.tempAutoCleanupDirectory
    req.data.$writeToFiles = ['cheerio', 'chrome'].includes((req.template.htmlToXlsx || {}).htmlEngine)

    const helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
    req.template.helpers = helpersScript + '\n' + (req.template.helpers || '')
  })
}
