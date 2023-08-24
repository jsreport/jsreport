const fs = require('fs').promises
const path = require('path')

module.exports = (reporter, definition) => {
  // warm up of deps to make it work in trustUserCode: false (SES),
  // this also allows to not require early when it is not needed. (trustUserCode: true)
  // usage of try catch was done to prevent the app to fail here, instead it will fail
  // at the same later time in which the dep is used
  if (reporter.options.trustUserCode === false) {
    try {
      require('unzipper')
    } catch {}

    try {
      require('puppeteer')
    } catch {}
  }

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

  reporter.registerHelpersListeners.add('htmlToXlsx', () => {
    return htmlToXlsxHelpers
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
