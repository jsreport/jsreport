const path = require('path')
const fs = require('fs').promises

module.exports = (reporter, definition) => {
  let helpersScript

  reporter.registerHelpersListeners.add(definition.name, () => {
    return helpersScript
  })

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })

  async function recipe (request, response) {
    response.meta.contentType = 'text/html'
    response.meta.fileExtension = 'html'

    if (!request.context.http || !request.context.http.baseUrl) {
      throw reporter.createError('html-with-browser-client requires context.http.baseUrl to be set', {
        statusCode: 400,
        weak: true
      })
    }

    const script = `<script src="${request.context.http.baseUrl}/extension/browser-client/public/js/jsreport.umd.js"></script>`
    const content = (await response.output.getBuffer()).toString()
    const endBody = content.search(/<\/body\s*>/)
    await response.output.update(Buffer.from(endBody === -1 ? (script + content) : content.substring(0, endBody) + script + content.substring(endBody)))
  }

  reporter.extensionsManager.recipes.push({
    name: 'html-with-browser-client',
    execute: recipe
  })
}
