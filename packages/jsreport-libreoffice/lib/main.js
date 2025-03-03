module.exports = function (reporter, definition) {
  reporter.documentStore.registerComplexType('LibreOfficeType', {
    format: { type: 'Edm.String' },
    enabled: { type: 'Edm.Boolean' },
    print: { type: 'Edm.String' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.libreOffice = { type: 'jsreport.LibreOfficeType' }
}
