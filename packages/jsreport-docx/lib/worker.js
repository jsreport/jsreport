const fs = require('fs').promises
const path = require('path')

module.exports = (reporter, definition) => {
  // warm up of deps to make it work in trustUserCode: false (SES),
  // this also allows to not require early when it is not needed. (trustUserCode: true)
  // usage of try catch was done to prevent the app to fail here, instead it will fail
  // at the same later time in which the dep is used
  if (reporter.options.trustUserCode === false) {
    try {
      require('@xmldom/xmldom')
    } catch {}
  }

  let helpersScript

  reporter.extensionsManager.recipes.push({
    name: 'docx',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })

  reporter.beforeRenderListeners.insert({ before: 'templates' }, 'docx', (req) => {
    if (req.template.recipe === 'docx' && !req.template.name && !req.template.shortid && !req.template.content) {
      // templates extension otherwise complains that the template is empty
      // but that is fine for this recipe
      req.template.content = 'docx placeholder'
    }
  })

  reporter.registerHelpersListeners.add('docx', async () => {
    return helpersScript
  })

  reporter.initializeListeners.add('docx', async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })
}
