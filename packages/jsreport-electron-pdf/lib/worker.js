const { promisify } = require('util')
const pickBy = require('lodash.pickby')
const electronConvert = require('electron-html-to')
const recipe = require('./recipe')

module.exports = (reporter, definition) => {
  const {
    strategy,
    numberOfWorkers,
    pingTimeout,
    tmpDir,
    portLeftBoundary,
    portRightBoundary,
    host,
    chromeCommandLineSwitches,
    maxLogEntrySize
  } = definition.options

  let convertOptions = {
    strategy,
    numberOfWorkers,
    pingTimeout,
    tmpDir,
    portLeftBoundary,
    portRightBoundary,
    host,
    chromeCommandLineSwitches,
    maxLogEntrySize
  }

  // filter undefined options
  convertOptions = pickBy(convertOptions, (val) => val !== undefined)

  const shouldAccessLocalFiles = Object.prototype.hasOwnProperty.call(definition.options, 'allowLocalFilesAccess') ? definition.options.allowLocalFilesAccess : false

  const electronConversion = promisify(electronConvert({
    ...convertOptions,
    allowLocalFilesAccess: shouldAccessLocalFiles
  }))

  reporter.extensionsManager.recipes.push({
    name: 'electron-pdf',
    execute: recipe(reporter, definition, electronConversion)
  })
}
