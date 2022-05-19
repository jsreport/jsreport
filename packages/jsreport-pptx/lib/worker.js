const path = require('path')
const fs = require('fs').promises

module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'pptx',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })

  reporter.beforeRenderListeners.insert({ before: 'templates' }, definition.name, (req) => {
    if (req.template.recipe === 'pptx' && !req.template.name && !req.template.shortid && !req.template.content) {
      // templates extension otherwise complains that the template is empty
      // but that is fine for this recipe
      req.template.content = 'pptx placeholder'
    }
  })

  let helpersScript

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })

  reporter.registerHelpersListeners.add(definition.name, () => {
    return helpersScript
  })
}
