
module.exports = (reporter) => {
  reporter.documentStore.registerEntityType('TemplateType', {
    name: { type: 'Edm.String' },
    content: { type: 'Edm.String', document: { main: true, extension: 'html', engine: true } },
    recipe: { type: 'Edm.String' },
    helpers: { type: 'Edm.String', document: { main: true, extension: 'js' }, schema: { type: 'object' } },
    engine: { type: 'Edm.String' }
  }, true)

  reporter.documentStore.registerEntitySet('templates', {
    entityType: 'jsreport.TemplateType',
    splitIntoDirectories: true
  })

  reporter.initializeListeners.add('templates', () => {
    const templatesCol = reporter.documentStore.collection('templates')

    templatesCol.beforeInsertListeners.add('templates', (doc) => {
      if (!doc.engine) {
        throw reporter.createError('Template must contain engine', {
          weak: true,
          statusCode: 400
        })
      }
      if (!doc.recipe) {
        throw reporter.createError('Template must contain recipe', {
          weak: true,
          statusCode: 400
        })
      }
    })
  })
}
