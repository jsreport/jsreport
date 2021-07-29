module.exports = function (reporter, definition) {
  reporter.documentStore.registerComplexType('UNOConvType', {
    format: { type: 'Edm.String' },
    enabled: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.unoconv = { type: 'jsreport.UNOConvType' }
}
