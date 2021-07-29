module.exports = (reporter, definition) => {
  reporter.documentStore.registerComplexType('LocalizationType', {
    language: { type: 'Edm.String' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.localization = { type: 'jsreport.LocalizationType' }
}
