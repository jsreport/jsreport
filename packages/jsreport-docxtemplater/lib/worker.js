module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'docxtemplater',
    execute: (req, res) => require('./recipe')(reporter, definition)(req, res)
  })

  reporter.beforeRenderListeners.insert({ before: 'templates' }, 'docxtemplater', (req) => {
    if (req.template && req.template.recipe === 'docxtemplater' && !req.template.name && !req.template.shortid && !req.template.content) {
      // templates extension otherwise complains that the template is empty
      // but that is fine for this recipe
      req.template.content = 'docxtemplater placeholder'
    }
  })
}
