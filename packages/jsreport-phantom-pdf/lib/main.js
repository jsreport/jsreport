/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using phantomjs.
 */

const fs = require('fs/promises')
const path = require('path')

const defaultPhantomjsVersion = '1.9.8'

module.exports = (reporter, definition) => {
  definition.options = Object.assign({}, reporter.options.phantom, definition.options)
  definition.options.strategy = definition.options.strategy || 'dedicated-process'

  if (definition.options.allowLocalFilesAccess == null) {
    definition.options.allowLocalFilesAccess = reporter.options.trustUserCode
  }

  reporter.extensionsManager.recipes.push({
    name: 'phantom-pdf'
  })

  reporter.documentStore.registerComplexType('PhantomType', {
    margin: { type: 'Edm.String', schema: { type: 'object' } },
    header: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    headerHeight: { type: 'Edm.String' },
    footer: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    footerHeight: { type: 'Edm.String' },
    orientation: { type: 'Edm.String' },
    format: { type: 'Edm.String' },
    width: { type: 'Edm.String' },
    height: { type: 'Edm.String' },
    printDelay: { type: 'Edm.Int32' },
    resourceTimeout: { type: 'Edm.Int32' },
    phantomjsVersion: { type: 'Edm.String' },
    customPhantomJS: { type: 'Edm.Boolean' },
    blockJavaScript: { type: 'Edm.Boolean' },
    waitForJS: { type: 'Edm.Boolean' },
    fitToPage: { type: 'Edm.Boolean' }
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    reporter.documentStore.model.entityTypes.TemplateType.phantom = { type: 'jsreport.PhantomType' }
  }

  reporter.initializeListeners.add('phantomjs', async () => {
    const npm = path.join(reporter.options.rootDirectory, 'node_modules')

    function crawlAvailablePhantomVersions () {
      return fs.readdir(npm).then(function (files) {
        return files.filter(function (f) {
          return f.indexOf('phantomjs-exact-') !== -1
        }).map(function (f) {
          return {
            path: path.join(npm, f),
            version: f.replace('phantomjs-exact-', '').replace(/-/g, '.')
          }
        })
      })
    }

    const versions = await crawlAvailablePhantomVersions()
    definition.options.phantoms = versions

    definition.options.phantoms.splice(0, 0, {
      version: defaultPhantomjsVersion
    })

    if (definition.options.defaultPhantomjsVersion && definition.options.defaultPhantomjsVersion !== defaultPhantomjsVersion) {
      let defPhantomInstance
      definition.options.phantoms = definition.options.phantoms.filter(function (p) {
        if (p.version === definition.options.defaultPhantomjsVersion) {
          defPhantomInstance = p
          return false
        } else {
          return true
        }
      })

      if (!defPhantomInstance) {
        throw new Error('defaultPhantomjsVersion ' + definition.options.defaultPhantomjsVersion + ' was not found')
      }

      definition.options.phantoms.splice(0, 0, defPhantomInstance)
    }

    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        phantoms: definition.options.phantoms
      })
    }

    reporter['phantom-pdf'] = { definition: definition }
  })
}
