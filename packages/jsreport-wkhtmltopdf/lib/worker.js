module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'wkhtmltopdf',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })
}
