/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Recipe rendering pdf files using wkhtmltopdf.
 */

const extend = require('node.extend.without.arrays')
const wkhtmltopdf = require('wkhtmltopdf-installer')

module.exports = function (reporter, definition) {
  reporter.extensionsManager.recipes.push({
    name: 'wkhtmltopdf'
  })

  reporter.documentStore.registerComplexType('wkHtmlToPdfType', {
    orientation: { type: 'Edm.String' },
    header: { type: 'Edm.String' },
    footer: { type: 'Edm.String' },
    headerHeight: { type: 'Edm.String' },
    footerHeight: { type: 'Edm.String' },
    dpi: { type: 'Edm.String' },
    marginBottom: { type: 'Edm.String' },
    marginLeft: { type: 'Edm.String' },
    marginRight: { type: 'Edm.String' },
    marginTop: { type: 'Edm.String' },
    pageSize: { type: 'Edm.String' },
    pageHeight: { type: 'Edm.String' },
    pageWidth: { type: 'Edm.String' },
    cover: { type: 'Edm.String' },
    toc: { type: 'Edm.Boolean' },
    tocHeaderText: { type: 'Edm.String' },
    tocLevelIndentation: { type: 'Edm.String' },
    tocTextSizeShrink: { type: 'Edm.String' },
    title: { type: 'Edm.String' },
    keepRelativeLinks: { type: 'Edm.Boolean' },
    disableSmartShrinking: { type: 'Edm.Boolean' },
    printMediaType: { type: 'Edm.Boolean' },
    javascriptDelay: { type: 'Edm.String' },
    windowStatus: { type: 'Edm.String' },
    wkhtmltopdfVersion: { type: 'Edm.String' }
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    reporter.documentStore.model.entityTypes.TemplateType.wkhtmltopdf = { type: 'jsreport.wkHtmlToPdfType' }
  }

  reporter.initializeListeners.add(definition.name, () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        wkhtmltopdfVersions: definition.options.wkhtmltopdfVersions
      })
    }
  })

  definition.options.execOptions = definition.options.execOptions || {}
  definition.options.execOptions.env = extend(true, {}, process.env, definition.options.execOptions.env)
  definition.options.execOptions.maxBuffer = definition.options.execOptions.maxBuffer || (1000 * 1024)

  if (definition.options.allowLocalFilesAccess == null) {
    definition.options.allowLocalFilesAccess = reporter.options.trustUserCode
  }

  definition.options.wkhtmltopdfVersions = definition.options.wkhtmltopdfVersions = [{ version: wkhtmltopdf.version }]

  reporter.wkhtmltopdf = { definition }
}
