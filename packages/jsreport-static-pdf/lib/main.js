
module.exports = function (reporter, definition) {
  reporter.documentStore.registerComplexType('StaticPdfTemplateType', {
    pdfAssetShortid: { type: 'Edm.String', referenceTo: 'assets' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.staticPdf = { type: 'jsreport.StaticPdfTemplateType' }

  reporter.extensionsManager.recipes.push({
    name: 'static-pdf'
  })
}
