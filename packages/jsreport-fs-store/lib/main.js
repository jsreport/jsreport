/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * File system based templates store for jsreport
 */

const path = require('path')
const IO = require('socket.io')
const getIgnoreDefaults = require('./ignoreDefaults')
const Provider = require('./provider')

const ignoreDefaults = getIgnoreDefaults()

module.exports = function (reporter, definition) {
  if (reporter.options.store.provider !== 'fs' && reporter.options.blobStorage.provider !== 'fs') {
    definition.options.enabled = false
    return
  }

  if (definition.options.dataDirectory && !path.isAbsolute(definition.options.dataDirectory)) {
    definition.options.dataDirectory = path.join(reporter.options.rootDirectory, definition.options.dataDirectory)
  }

  if (definition.options.dataDirectory == null) {
    definition.options.dataDirectory = path.join(reporter.options.rootDirectory, 'data')
  }

  if (reporter.options.blobStorage.provider === 'fs') {
    if (reporter.options.blobStorage.dataDirectory == null) {
      reporter.options.blobStorage.dataDirectory = path.join(definition.options.dataDirectory, 'storage')
    } else {
      if (!path.isAbsolute(reporter.options.blobStorage.dataDirectory)) {
        reporter.options.blobStorage.dataDirectory = path.join(reporter.options.rootDirectory, reporter.options.blobStorage.dataDirectory)
      }
    }
    reporter.blobStorage.registerProvider(require('./blobStorageProvider')(reporter.options))
  }

  if (reporter.options.store.provider !== 'fs') {
    return
  }

  const options = Object.assign({
    logger: reporter.logger,
    createError: reporter.createError.bind(reporter),
    blobStorageDirectory: reporter.options.blobStorage.dataDirectory
  }, definition.options)

  // we ensure that our defaults are always there to avoid user having to repeat the
  // same options
  for (const iDefault of ignoreDefaults) {
    if (!options.ignore.includes(iDefault)) {
      options.ignore.push(iDefault)
    }
  }

  options.resolveFileExtension = reporter.documentStore.resolveFileExtension.bind(reporter.documentStore)

  const provider = Provider(options)

  // exposing api for fs-store persistence/sync extensions
  reporter.fsStore = {
    registerPersistence: (...args) => provider.registerPersistence(...args),
    reload: () => provider.reload()
  }

  reporter.documentStore.registerProvider(provider)

  reporter.initializeListeners.add(definition.name, () => {
    reporter.beforeRenderListeners.insert(0, 'fs-store', () => provider.sync())
  })

  if (!reporter.extensionsManager.extensions.some((e) => e.name === 'express')) {
    return
  }

  if (!definition.options.externalModificationsSync) {
    return
  }

  reporter.initializeListeners.add(definition.name, () => {
    if (options.persistence.provider !== 'fs') {
      throw reporter.createError('Cant use fs store externalModificationsSync with different persistence than fs')
    }

    if (reporter.express) {
      if (!reporter.express.server) {
        reporter.logger.warn(
          'jsreport-fs-store needs a valid server instance to initialize socket link with the studio ' +
            'if you are using jsreport in an existing express app pass a server instance to express.server option'
        )
        return
      }

      reporter.express.exposeOptionsToApi(definition.name, {
        updateStudio: true
      })
    }
  })

  reporter.initializeListeners.insert({ after: 'express' }, 'fs-store', () => {
    reporter.logger.info('fs store emits sockets to synchronize underlying changes with studio')
    const io = IO(reporter.express.server, { path: (reporter.options.appPath || '/') + 'socket.io' })

    provider.on('external-modification', (e) => {
      if (e.filePath && path.dirname(e.filePath) === definition.options.dataDirectory) {
        // skip for root files like reports, users, settings
        return
      }
      reporter.logger.debug('Sending external-modification socket to the studio')
      io.emit('external-modification', {})
    })
  })
}
