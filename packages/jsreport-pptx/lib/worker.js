const path = require('path')
const fs = require('fs').promises

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

  reporter.options.sandbox.modules.push({
    alias: 'pptxGetColWidth',
    path: path.join(__dirname, './getColWidth.js')
  })

  reporter.options.sandbox.modules.push({
    alias: 'pptxProcessTableGrid',
    path: path.join(__dirname, './processTableGrid.js')
  })

  reporter.extensionsManager.recipes.push({
    name: 'pptx',
    execute: (req, res) => require('./recipe')(reporter, definition, req, res)
  })

  reporter.beforeRenderListeners.insert({ before: 'templates' }, definition.name, (req) => {
    if (req.template.recipe === 'pptx' && !req.template.name && !req.template.shortid && !req.template.content) {
      // templates extension otherwise complains that the template is empty
      // but that is fine for this recipe
      req.template.content = 'pptx placeholder'
    }
  })

  let helpersScript

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })

  reporter.registerHelpersListeners.add(definition.name, () => {
    return helpersScript
  })
}
