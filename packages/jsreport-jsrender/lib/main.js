/*!
 * Copyright(c) 2020 Jan Blaha
 */

module.exports = function (reporter, definition) {
  reporter.extensionsManager.engines.push({
    name: 'jsrender'
  })
}
