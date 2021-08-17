const fs = require('fs').promises
const path = require('path')

module.exports = (reporter, definition) => {
  let componentHelpers

  reporter.beforeRenderListeners.insert({ after: 'scripts' }, definition.name, this, async (req, res) => {
    req.context.systemHelpers += componentHelpers + '\n'
  })

  reporter.initializeListeners.add('components', async () => {
    componentHelpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()
  })
}
