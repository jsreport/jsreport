module.exports = (reporter, definition) => {
  function recipe (request, response) {
    response.meta.contentType = 'text/html'
    response.meta.fileExtension = 'html'

    let serverUrl

    if (definition.options.scriptLinkRootPath != null) {
      serverUrl = definition.options.scriptLinkRootPath
    } else if (request.context.http && request.context.http.baseUrl) {
      serverUrl = request.context.http.baseUrl
    }

    if (serverUrl == null) {
      throw reporter.createError(`browser-client needs to know the url from where to fetch the jsreport client. Set it using "extensions.browserClient.scriptLinkRootPath" option in config`, {
        statusCode: 400
      })
    }

    serverUrl = serverUrl.replace(/\/$/, '')

    let script = `<script src="${serverUrl}/extension/browser-client/public/js/jsreport.min.js"></script>`
    script += `<script>jsreport.serverUrl='${serverUrl}';`
    script += `jsreport.template=JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(request.template || {}))}"));`
    script += `jsreport.options=JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(request.options || {}))}"));`

    if (!JSON.parse(request.template.omitDataFromOutput || 'false')) {
      script += `jsreport.data=${JSON.stringify(request.data || {})};`
    }

    script += '</script>'

    const content = response.content.toString()
    const endBody = content.search(/<\/body\s*>/)
    response.content = Buffer.from(endBody === -1 ? (script + content) : content.substring(0, endBody) + script + content.substring(endBody))
  }

  reporter.extensionsManager.recipes.push({
    name: 'html-with-browser-client',
    execute: recipe
  })
}
