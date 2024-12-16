/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension allowing to add custom javascript hooks into the rendering process.
 */

module.exports = function (reporter, definition) {
  reporter.documentStore.registerEntityType('ScriptType', {
    content: { type: 'Edm.String', document: { main: true, extension: 'js' } },
    name: { type: 'Edm.String' },
    scope: { type: 'Edm.String', schema: { enum: ['template', 'global', 'folder'] }, index: true, length: 255 },
    isGlobal: { type: 'Edm.Boolean', index: true }
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
