const fs = require('fs').promises
const path = require('path')

module.exports = (reporter, definition) => {
  let helpersScript

  reporter.extensionsManager.recipes.push({
    name: 'docx',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })

  reporter.beforeRenderListeners.insert({ before: 'templates' }, 'docx', (req) => {
    if (req.template.recipe === 'docx' && !req.template.name && !req.template.shortid && !req.template.content) {
      // templates extension otherwise complains that the template is empty
      // but that is fine for this recipe
      req.template.content = 'docx placeholder'
    }
  })

  reporter.registerHelpersListeners.add('docx', async (req) => {
    return helpersScript
  })

  reporter.initializeListeners.add('docx', async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })
}
