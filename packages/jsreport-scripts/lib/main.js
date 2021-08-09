/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension allowing to add custom javascript hooks into the rendering process.
 */

module.exports = function (reporter, definition) {
  if (reporter.options.allowLocalFilesAccess === true && !definition.options.allowedModules) {
    definition.options.allowedModules = '*'
  }

  definition.options.allowedModules = definition.options.allowedModules || []
  reporter.options.scripts = definition.options

  reporter.documentStore.registerEntityType('ScriptType', {
    content: { type: 'Edm.String', document: { extension: 'js' } },
    name: { type: 'Edm.String' },
    isGlobal: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.registerComplexType('ScriptRefType', {
    content: { type: 'Edm.String' },
    shortid: { type: 'Edm.String', referenceTo: 'scripts' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.scripts = { type: 'Collection(jsreport.ScriptRefType)' }

  reporter.documentStore.registerEntitySet('scripts', {
    entityType: 'jsreport.ScriptType',
    splitIntoDirectories: true
  })
}
