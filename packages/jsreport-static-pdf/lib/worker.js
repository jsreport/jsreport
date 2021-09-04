module.exports = function (reporter, definition) {
  reporter.extensionsManager.recipes.push({
    name: 'static-pdf',
    execute: (req, res) => require('./recipe')(reporter, req, res)
  })
}
