module.exports = function (reporter, definition) {
  reporter.extensionsManager.recipes.push({
    name: 'html-embedded-in-docx',
    execute: (req, res) => require('./recipe')(reporter, definition)(req, res)
  })
}
