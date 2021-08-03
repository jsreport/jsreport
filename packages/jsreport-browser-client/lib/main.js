/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * This extension adds jsreport-html recipe.
 */
const path = require('path')

module.exports = (reporter, definition) => {
  const distPath = path.dirname(require.resolve('jsreport-browser-client-dist'))

  reporter.documentStore.model.entityTypes.TemplateType.omitDataFromOutput = { type: 'Edm.Boolean' }
  reporter.extensionsManager.recipes.push({
    name: 'html-with-browser-client'
  })

  reporter.on('express-configure', (app) => {
    app.get('/extension/browser-client/public/js/jsreport.min.js', (req, res, next) => {
      res.sendFile(path.join(distPath, 'jsreport.min.js'))
    })
  })
}
