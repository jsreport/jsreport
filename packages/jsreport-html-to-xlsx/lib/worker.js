const fs = require('fs').promises
const path = require('path')

module.exports = (reporter, definition) => {
  definition.options.tmpDir = reporter.options.tempAutoCleanupDirectory

  reporter.extensionsManager.recipes.push({
    name: 'html-to-xlsx',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })

  reporter.options.sandbox.modules.push({
    alias: 'tmpHandler.js',
    path: path.join(__dirname, './tmpHandler.js')
  })

  let htmlToXlsxHelpers

  reporter.initializeListeners.add('html-to-xlsx', async () => {
    htmlToXlsxHelpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()
  })

  reporter.registerHelpersListeners.add('htmlToXlsx', (req) => {
    if (req.template.recipe === 'html-to-xlsx') {
      return htmlToXlsxHelpers
    }
  })

  reporter.beforeRenderListeners.insert({ after: 'data' }, 'htmlToXlsx', async (req) => {
    if (req.template.recipe !== 'html-to-xlsx') {
      return
    }

    req.data = req.data || {}
    req.data.$tempAutoCleanupDirectory = reporter.options.tempAutoCleanupDirectory
    req.data.$writeToFiles = ['cheerio', 'chrome'].includes((req.template.htmlToXlsx || {}).htmlEngine)
  })
}
