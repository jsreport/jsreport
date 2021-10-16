/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * This extension adds jsreport-html recipe.
 */
const path = require('path')
const fs = require('fs')
const browserClientContent = fs.readFileSync(path.join(path.dirname(require.resolve('@jsreport/browser-client')), 'jsreport.umd.js')).toString()

module.exports = (reporter, definition) => {
  reporter.documentStore.model.entityTypes.TemplateType.omitDataFromOutput = { type: 'Edm.Boolean' }
  reporter.extensionsManager.recipes.push({
    name: 'html-with-browser-client'
  })

  reporter.on('express-configure', (app) => {
    app.get('/extension/browser-client/public/js/jsreport.umd.js', (req, res, next) => {
      let script = browserClientContent
      script += `\n jsreport.serverUrl='${req.context.http.baseUrl}';`
      res.send(script)
    })
  })
}
