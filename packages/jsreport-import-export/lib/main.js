const Multer = require('multer')
const processImport = require('./import')
const exportToStream = require('./export')
const { parseMultipart } = require('./helpers')
let multer

module.exports = (reporter, definition) => {
  const beforeEntityPersistedListeners = reporter.createListenerCollection('Import@beforeEntityPersisted')
  const beforeEntityValidationListeners = reporter.createListenerCollection('ImportValidation@beforeEntityValidation')

  multer = Multer({ dest: reporter.options.tempAutoCleanupDirectory })

  reporter.export = async (selection, req) => {
    const result = await exportToStream(reporter, selection, req)
    return result
  }

  reporter.import = (...args) => {
    const exportFilePath = args[0]
    let req
    let opts

    // back-compatibility
    if (args[1] && args[1].__isJsreportRequest__) {
      req = args[1]
    } else {
      opts = args[1]
      req = args[2]
    }

    if (opts == null) {
      opts = {}
    }

    return processImport(reporter, exportFilePath, {
      ...opts,
      validation: false
    }, req)
  }

  reporter.import.beforeEntityPersistedListeners = beforeEntityPersistedListeners

  reporter.importValidation = (...args) => {
    const exportFilePath = args[0]
    let req
    let opts

    // back-compatibility
    if (args.length < 3) {
      req = args[1]
    } else {
      opts = args[1]
      req = args[2]
    }

    if (opts == null) {
      opts = {}
    }

    return processImport(reporter, exportFilePath, {
      ...opts,
      validation: true
    }, req)
  }

  reporter.importValidation.beforeEntityValidationListeners = beforeEntityValidationListeners

  reporter.on('express-configure', (app) => {
    app.post('/api/export', (req, res) => {
      exportToStream(reporter, req.body.selection, req).then((result) => {
        const stream = result.stream
        res.set('Export-Entities-Count', JSON.stringify(result.entitiesCount))
        stream.pipe(res)
      }).catch(res.error)
    })

    app.post('/api/import', (req, res) => {
      parseMultipart(reporter, multer)(req, res, (err, exportFilePath) => {
        if (err) {
          return res.error(err)
        }

        const opts = {}

        if (req.query.targetFolder != null) {
          opts.targetFolder = req.query.targetFolder
        }

        if (req.query.fullImport != null) {
          opts.fullImport = req.query.fullImport === true || req.query.fullImport === 'true'
        }

        if (req.query.continueOnFail != null) {
          opts.continueOnFail = req.query.continueOnFail === true || req.query.continueOnFail === 'true'
        }

        processImport(reporter, exportFilePath, opts, req).then((result) => {
          res.set('Import-Entities-Count', JSON.stringify(result.entitiesCount))
          res.send({ status: '0', message: 'ok', log: result.log })
        }).catch((err) => {
          if (err.canContinueAfterFail) {
            return res.status(400).json({
              message: err.message,
              stack: err.stack,
              canContinueAfterFail: true
            })
          }

          res.error(err)
        })
      })
    })

    app.post('/api/validate-import', (req, res) => {
      parseMultipart(reporter, multer)(req, res, (err, exportFilePath) => {
        if (err) {
          return res.error(err)
        }

        const opts = {}

        if (req.query.targetFolder != null) {
          opts.targetFolder = req.query.targetFolder
        }

        if (req.query.fullImport != null) {
          opts.fullImport = req.query.fullImport === true || req.query.fullImport === 'true'
        }

        processImport(reporter, exportFilePath, {
          ...opts,
          validation: true
        }, req).then((result) => {
          res.set('Import-Entities-Count', JSON.stringify(result.entitiesCount))
          res.send({ status: '0', log: result.log })
        }).catch(res.error)
      })
    })
  })

  reporter.initializeListeners.add(definition.name, () => {
    if (reporter.express) {
      const exportableEntitySets = Object.keys(reporter.documentStore.model.entitySets).reduce((acu, entitySetName) => {
        const entitySet = reporter.documentStore.model.entitySets[entitySetName]

        if (entitySet.exportable == null || entitySet.exportable === true) {
          acu.push(entitySetName)
        }

        return acu
      }, [])

      reporter.express.exposeOptionsToApi(definition.name, {
        exportableEntitySets: exportableEntitySets
      })
    }
  })
}
