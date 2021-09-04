module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'html-to-text',
    execute: (req, res) => require('./recipe')(reporter, definition)(req, res)
  })
}
