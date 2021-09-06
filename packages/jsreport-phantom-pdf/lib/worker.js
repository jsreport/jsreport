/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using phantomjs.
 */

module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'phantom-pdf',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })
}
