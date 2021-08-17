const recipe = require('./recipe')

module.exports = function (reporter, definition) {
  reporter.extensionsManager.recipes.push({
    name: 'html-embedded-in-docx',
    execute: recipe(reporter, definition)
  })
}
