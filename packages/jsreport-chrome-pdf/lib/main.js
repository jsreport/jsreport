/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using headless chrome.
 */

const os = require('os')
const numCPUs = os.cpus().length

async function ensureMigrated (reporter) {
  if (reporter.options.migrateChromeNetworkIdleProp === false) {
    return
  }

  const migrated = await reporter.settings.findValue('chrome-network-idle-migrated')

  if (migrated) {
    return
  }

  reporter.logger.info('Migrating templates chrome settings (waitForNetworkIddle -> waitForNetworkIdle)')
  const templateIds = await reporter.documentStore.collection('templates').find({}, { _id: 1 })
  for (const id of templateIds) {
    const template = await reporter.documentStore.collection('templates').findOne({ _id: id._id })
    let doUpdate = false
    if (template.chrome && template.chrome.waitForNetworkIddle != null) {
      template.chrome.waitForNetworkIdle = template.chrome.waitForNetworkIddle
      doUpdate = true
    }
    if (template.chromeImage && template.chromeImage.waitForNetworkIddle != null) {
      template.chromeImage.waitForNetworkIdle = template.chromeImage.waitForNetworkIddle
      doUpdate = true
    }

    if (doUpdate) {
      await reporter.documentStore.collection('templates').update({ _id: template._id }, { $set: template })
    }
  }

  await reporter.settings.addOrSet('chrome-network-idle-migrated', true)
  reporter.logger.info('Migration successful')
}

module.exports = function (reporter, definition) {
  definition.options = Object.assign({}, reporter.options.chrome, definition.options)

  if (definition.options.launchOptions?.internalInitialArgs != null && definition.options.launchOptions?.args == null) {
    definition.options.launchOptions = {
      ...definition.options.launchOptions,
      args: definition.options.launchOptions.internalInitialArgs
    }
  }

  // we cant apply the defaults in the jsreport.config.js, because user won't be able to change values in root chrome config
  // it would be always overwritten by defaults from extensions.chrome-pdf
  definition.options.strategy = definition.options.strategy || 'chrome-pool'
  definition.options.numberOfWorkers = definition.options.numberOfWorkers || 1

  if (definition.options.allowLocalFilesAccess == null) {
    definition.options.allowLocalFilesAccess = reporter.options.trustUserCode
  }

  if (definition.options.launchOptions == null) {
    definition.options.launchOptions = {}
  }

  if (definition.options.launchOptions.protocolTimeout == null) {
    definition.options.launchOptions.protocolTimeout = reporter.options.reportTimeout
  }

  if (definition.options.strategy == null) {
    definition.options.strategy = 'dedicated-process'
  }

  if (
    definition.options.strategy !== 'dedicated-process' &&
    definition.options.strategy !== 'chrome-pool' &&
    definition.options.strategy !== 'connect'
  ) {
    throw new Error(`Unsupported strategy "${definition.options.strategy}" for chrome-pdf`)
  }

  if (definition.options.numberOfWorkers == null) {
    definition.options.numberOfWorkers = numCPUs
  }

  if (definition.options.strategy === 'chrome-pool') {
    reporter.logger.debug(`Chrome strategy is ${definition.options.strategy}, numberOfWorkers: ${definition.options.numberOfWorkers}`)
  } else {
    reporter.logger.debug(`Chrome strategy is ${definition.options.strategy}`)
  }

  if (definition.options.launchOptions && Object.keys(definition.options.launchOptions).length > 0) {
    reporter.logger.debug('Chrome custom launch options are', definition.options.launchOptions)
  }

  reporter.extensionsManager.recipes.push({
    name: 'chrome-pdf'
  })

  reporter.extensionsManager.recipes.push({
    name: 'chrome-image'
  })

  reporter.documentStore.registerComplexType('ChromeType', {
    url: { type: 'Edm.String' },
    scale: { type: 'Edm.Decimal', schema: { type: 'null' } },
    displayHeaderFooter: { type: 'Edm.Boolean' },
    printBackground: { type: 'Edm.Boolean' },
    landscape: { type: 'Edm.Boolean' },
    pageRanges: { type: 'Edm.String' },
    format: { type: 'Edm.String' },
    width: { type: 'Edm.String' },
    height: { type: 'Edm.String' },
    marginTop: { type: 'Edm.String' },
    marginRight: { type: 'Edm.String' },
    marginBottom: { type: 'Edm.String' },
    marginLeft: { type: 'Edm.String' },
    mediaType: { type: 'Edm.String' },
    viewportWidth: { type: 'Edm.Decimal', schema: { type: 'null' } },
    viewportHeight: { type: 'Edm.Decimal', schema: { type: 'null' } },
    waitForJS: { type: 'Edm.Boolean' },
    waitForNetworkIddle: { type: 'Edm.Boolean' },
    waitForNetworkIdle: { type: 'Edm.Boolean' },
    headerTemplate: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    footerTemplate: { type: 'Edm.String', document: { extension: 'html', engine: true } }
  })

  reporter.documentStore.registerComplexType('ChromeImageType', {
    url: { type: 'Edm.String' },
    type: { type: 'Edm.String' },
    quality: { type: 'Edm.Decimal', schema: { type: 'null' } },
    fullPage: { type: 'Edm.Boolean' },
    clipX: { type: 'Edm.Decimal', schema: { type: 'null' } },
    clipY: { type: 'Edm.Decimal', schema: { type: 'null' } },
    clipWidth: { type: 'Edm.Decimal', schema: { type: 'null' } },
    clipHeight: { type: 'Edm.Decimal', schema: { type: 'null' } },
    omitBackground: { type: 'Edm.Boolean' },
    mediaType: { type: 'Edm.String' },
    viewportWidth: { type: 'Edm.Decimal', schema: { type: 'null' } },
    viewportHeight: { type: 'Edm.Decimal', schema: { type: 'null' } },
    waitForJS: { type: 'Edm.Boolean' },
    waitForNetworkIddle: { type: 'Edm.Boolean' },
    waitForNetworkIdle: { type: 'Edm.Boolean' }
  })

  reporter.initializeListeners.add('chrome-pdf', async () => {
    await ensureMigrated(reporter)

    reporter.documentStore.collection('templates').beforeInsertListeners.add('chrome network idle rename', (doc, req) => {
      if (doc.chrome && doc.chrome.waitForNetworkIddle != null) {
        doc.chrome.waitForNetworkIdle = doc.chrome.waitForNetworkIddle
      }
      if (doc.chromeImage && doc.chromeImage.waitForNetworkIddle != null) {
        doc.chromeImage.waitForNetworkIdle = doc.chromeImage.waitForNetworkIddle
      }
    })

    reporter.documentStore.collection('templates').beforeUpdateListeners.add('chrome network idle rename', (q, u, req) => {
      if (u.$set && u.$set.chrome && u.$set.chrome.waitForNetworkIddle != null) {
        u.$set.chrome.waitForNetworkIdle = u.$set.chrome.waitForNetworkIddle
      }
      if (u.$set && u.$set.chromeImage && u.$set.chromeImage.waitForNetworkIddle != null) {
        u.$set.chromeImage.waitForNetworkIdle = u.$set.chromeImage.waitForNetworkIddle
      }
    })
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    reporter.documentStore.model.entityTypes.TemplateType.chrome = { type: 'jsreport.ChromeType' }
    reporter.documentStore.model.entityTypes.TemplateType.chromeImage = { type: 'jsreport.ChromeImageType' }
  }
}
