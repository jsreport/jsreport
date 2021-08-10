
module.exports = function (reporter, definition) {
  reporter.documentStore.registerComplexType('htmlToText', {
    tables: { type: 'Edm.String' },
    tablesSelectAll: { type: 'Edm.Boolean' },
    wordWrap: { type: 'Edm.Int32' },
    linkHrefBaseUrl: { type: 'Edm.String' },
    hideLinkHrefIfSameAsText: { type: 'Edm.Boolean' },
    ignoreHref: { type: 'Edm.Boolean' },
    ignoreImage: { type: 'Edm.Boolean' },
    preserveNewlines: { type: 'Edm.Boolean' },
    decodeOptions: { type: 'Edm.String' },
    uppercaseHeadings: { type: 'Edm.Boolean' },
    singleNewLineParagraphs: { type: 'Edm.Boolean' },
    baseElement: { type: 'Edm.String' },
    returnDomByDefault: { type: 'Edm.Boolean' },
    longWordSplitWrapCharacters: { type: 'Edm.String' },
    longWordSplitForceWrapOnLimit: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.htmlToText = { type: 'jsreport.htmlToText' }

  reporter.extensionsManager.recipes.push({
    name: 'html-to-text'
  })
}
