const recipe = require('./recipe')
const fs = require('fs').promises
const path = require('path')

module.exports = (reporter, definition) => {
  let helpersScript
  reporter.extensionsManager.recipes.push({
    name: 'docx',
    execute: recipe(reporter, definition)
  })

  reporter.beforeRenderListeners.insert({ before: 'templates' }, 'docx', (req) => {
    if (req.template.recipe === 'docx' && !req.template.name && !req.template.shortid && !req.template.content) {
      // templates extension otherwise complains that the template is empty
      // but that is fine for this recipe
      req.template.content = 'docx placeholder'
    }
  })

  reporter.beforeRenderListeners.insert({ after: 'templates' }, 'docx', async (req) => {
    if (req.template.recipe === 'docx') {
      if (!helpersScript) {
        helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
      }
      req.template.helpers = (req.template.helpers || '') + '\n' + helpersScript
    }
  })
}
