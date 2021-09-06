module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'phantom-image',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })
}
