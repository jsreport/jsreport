module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'electron-pdf',
    execute: (req, res) => require('./recipe')(reporter, definition)(req, res)
  })
}
