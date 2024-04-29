module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'text',
    execute: (request, response) => {
      response.meta.contentType = request.template.contentType || 'text/plain'
      response.meta.fileExtension = request.template.fileExtension || 'txt'

      const contentDisposition = request.template.contentDisposition || 'inline'
      response.meta.contentDisposition = contentDisposition + (
        contentDisposition.indexOf(';') !== -1 ? '' : ';filename=report.' + response.meta.fileExtension)
    }
  })
}
