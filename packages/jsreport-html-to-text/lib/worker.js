const recipe = require('./recipe')

module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'html-to-text',
    execute: recipe(reporter, definition)
  })
}
