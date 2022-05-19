const fs = require('fs').promises
const path = require('path')

module.exports = (reporter, definition) => {
  let componentHelpers

  reporter.registerWorkerAction('component-preview', (data, req) => {
    return require('./componentPreview')(data, reporter, req)
  })

  reporter.registerHelpersListeners.add('components', () => {
    return componentHelpers
  })

  reporter.initializeListeners.add('components', async () => {
    componentHelpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()
  })
}
