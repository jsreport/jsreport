const fs = require('fs/promises')
const path = require('path')
const etag = require('etag')
const mime = require('mime')
const { response } = require('@jsreport/office')
const { readFile, linkPath, readAsset } = require('./assetsShared')

module.exports = function (reporter, definition) {
  reporter.documentStore.registerEntityType('AssetType', {
    name: { type: 'Edm.String' },
    content: { type: 'Edm.Binary', document: { main: true, extension: 'html', content: true } },
    forceUpdate: { type: 'Edm.Boolean' },
    sharedHelpersScope: { type: 'Edm.String', schema: { type: 'null', enum: [null, 'global', 'folder'] } },
    isSharedHelper: { type: 'Edm.Boolean' },
    link: { type: 'Edm.String' }
  })

  reporter.documentStore.registerEntitySet('assets', {
    entityType: 'jsreport.AssetType',
    splitIntoDirectories: true
  })

  if (reporter.options.trustUserCode === true && !definition.options.allowedFiles && definition.options.searchOnDiskIfNotFoundInStore == null) {
    definition.options.allowedFiles = '**/*.*'
    definition.options.searchOnDiskIfNotFoundInStore = true
  }

  reporter.assets = { options: definition.options }

  reporter.on('express-configure', (app) => {
    function responseAsset (fn, req, res) {
      fn().then((asset) => {
        if (req.query.download === 'true') {
          res.setHeader('Content-Disposition', 'attachment;filename=' + asset.filename)
        }
        res.setHeader('ETag', etag(asset.content))
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.setHeader('Last-Modified', asset.modified.toUTCString())

        const type = mime.getType(asset.filename)
        if (type) {
          const charset = type.startsWith('text') ? 'UTF-8' : null
          res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''))
        }
        res.end(asset.content, 'binary')
      }).catch(function (e) {
        reporter.logger.warn('Unable to get asset content  ' + e.stack)
        res.status(500).end(e.message)
      })
    }

    app.get('/assets/content/:path*', (req, res) => {
      const assetLink = req.params.path + req.params['0']
      responseAsset(() => readAsset(reporter, definition, { id: null, name: assetLink, encoding: 'binary' }, req), req, res)
    })

    app.get('/assets/:id/content*', (req, res) => {
      responseAsset(() => readAsset(reporter, definition, { id: req.params.id, name: null, encoding: 'binary' }, req), req, res)
    })

    app.get('/assets/office/:id/content', async (req, res) => {
      try {
        const asset = await readAsset(reporter, definition, { id: req.params.id, name: null, encoding: 'binary' }, req)

        req.options = req.options || {}
        req.options.preview = true

        res.meta = res.meta || {}

        const officeContent = await response({
          previewOptions: reporter.options.office != null && reporter.options.office.preview != null ? reporter.options.office.preview : {},
          officeDocumentType: path.extname(asset.filename).slice(1),
          buffer: asset.buffer,
          logger: reporter.logger
        }, req, res)

        res.setHeader('Content-Type', res.meta.contentType)

        res.end(officeContent)
      } catch (e) {
        reporter.logger.warn(`Unable to get office asset content ${e.stack}`)
        res.status(500).end(e.message)
      }
    })

    app.get('/assets/link/:path*', (req, res) => {
      const assetLink = req.params.path + req.params['0']
      try {
        res.send(linkPath(reporter, definition, assetLink))
      } catch (e) {
        reporter.logger.warn('Unable to get asset link "' + assetLink + '" ' + e.stack)
        res.status(500).end(e.message)
      }
    })
  })

  reporter.initializeListeners.add('assets', () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        allowAssetsLinkedToFiles: definition.options.allowAssetsLinkedToFiles !== false,
        officePreview: {
          enabled: reporter.options.office != null && reporter.options.office.preview != null ? reporter.options.office.preview.enabled : undefined,
          showWarning: reporter.options.office != null && reporter.options.office.preview != null ? reporter.options.office.preview.showWarning : undefined
        }
      })
    }

    if (definition.options.publicAccessEnabled) {
      reporter.emit('export-public-route', '/assets')
    }

    reporter.documentStore.addFileExtensionResolver(function (doc, entitySetName, entityType, propertyType) {
      if (entitySetName === 'assets' && propertyType.document.content) {
        const extensions = path.extname(doc.name).split('.')
        return extensions[extensions.length - 1]
      }
    })

    reporter.documentStore.collection('assets').beforeInsertListeners.add('assets', async (entity) => {
      const allowAssetsLinkedToFiles = definition.options.allowAssetsLinkedToFiles !== false

      delete entity.forceUpdate

      if (entity.link) {
        if (!allowAssetsLinkedToFiles) {
          throw reporter.createError('Can\'t set .link in asset when "allowAssetsLinkedToFiles" option is false', {
            statusCode: 400,
            weak: true
          })
        }

        entity.name = path.basename(entity.link)
        await readFile(reporter, definition, entity.link)
        return entity
      }
    })

    reporter.documentStore.collection('assets').beforeUpdateListeners.add('assets', async (query, update) => {
      const allowAssetsLinkedToFiles = definition.options.allowAssetsLinkedToFiles !== false

      if (update.$set.link && !allowAssetsLinkedToFiles) {
        throw reporter.createError('Can\'t set .link in asset when "allowAssetsLinkedToFiles" option is false', {
          statusCode: 400,
          weak: true
        })
      }

      if (query._id && update.$set && update.$set.forceUpdate && update.$set.link) {
        try {
          await fs.writeFile(linkPath(reporter, definition, update.$set.link), update.$set.content)
          delete update.$set.forceUpdate
          delete update.$set.content
        } catch (e) {
          throw reporter.createError(`Unable to access file ${linkPath(reporter, definition, update.$set.link)}`, {
            weak: true,
            original: e
          })
        }
      } else {
        delete update.$set.forceUpdate
      }
    })
  })
}
