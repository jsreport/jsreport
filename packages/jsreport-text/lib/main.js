/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * text recipe simply just evaluates engines and return the defined content type.
 */

module.exports = (reporter, definition) => {
  reporter.documentStore.model.entityTypes.TemplateType.contentType = { type: 'Edm.String' }
  reporter.documentStore.model.entityTypes.TemplateType.fileExtension = { type: 'Edm.String' }
  reporter.documentStore.model.entityTypes.TemplateType.contentDisposition = { type: 'Edm.String' }

  reporter.extensionsManager.recipes.push({
    name: 'text'
  })
}
