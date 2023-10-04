const os = require('os')
const getImportRecords = require('./getImportRecords')
const persistEntity = require('./persistEntity')
const { unzipEntities } = require('../helpers')

async function processImport (reporter, exportFilePath, opts, req) {
  const validation = opts.validation === true
  const fullImport = opts.fullImport === true
  const continueOnFail = opts.continueOnFail === true

  if (!validation) {
    reporter.logger.debug('import is reading export file')
  }

  let unzippingRes

  try {
    unzippingRes = await unzipEntities(exportFilePath)
  } catch (e) {
    throw reporter.createError('Unable to read export file', {
      original: e,
      status: 400,
      weak: true
    })
  }

  const entitiesInExportFile = unzippingRes.entities
  const metadata = unzippingRes.metadata

  let targetFolder
  let targetFolderPath
  let sum = 0
  const importByEntitySet = metadata == null
  const entitiesCount = {}
  const logs = []

  for (const [collectionName, entities] of Object.entries(entitiesInExportFile)) {
    const collection = reporter.documentStore.collection(collectionName)

    entitiesCount[collectionName] = entities.length
    sum += entities.length

    if (collection) {
      entitiesInExportFile[collectionName] = await collection.deserializeProperties(entities)
    }
  }

  if (!validation) {
    reporter.logger.debug(`import found ${sum} objects`)
  }

  if (sum === 0) {
    logs.push('Info: No entities found to import')

    return {
      entitiesCount,
      log: logs.join(os.EOL)
    }
  }

  if (fullImport === true) {
    logs.push([
      'Info: Processing as full import mode',
      os.EOL
    ].join(''))
  } else if (opts.targetFolder != null) {
    targetFolder = await reporter.documentStore.collection('folders').findOne({ shortid: opts.targetFolder }, req)

    if (!targetFolder) {
      throw reporter.createError(`Import validation error: target folder (shortid: ${opts.targetFolder}) does not exists, make sure to pass shortid of folder that exists`, {
        statusCode: 400,
        weak: true
      })
    }

    targetFolderPath = await reporter.folders.resolveEntityPath(targetFolder, 'folders', req)

    logs.push([
      `Info: entities in export file will be imported inside target folder ${targetFolderPath}`,
      os.EOL
    ].join(''))
  }

  if (validation) {
    if (importByEntitySet) {
      logs.push([
        'Warning: export file contains entities from old installation in which everything was grouped by entity sets.',
        os.EOL,
        'entities in this export file will be imported into folders that emulates the previous grouping by entity sets',
        os.EOL
      ].join(''))
    }
  }

  const { records, ignored } = await getImportRecords(reporter, req, {
    entitiesInExportFile,
    targetFolder,
    targetFolderPath,
    importByEntitySet,
    fullImport
  })

  if (records.length === 0) {
    logs.push('Info: No changes to import. Entities are the same than entities in export file')
  }

  if (ignored.length > 0) {
    const pendingLogs = []
    const counter = {}

    for (const item of ignored) {
      const { reason, collectionName, entityDisplayProperty, entityDisplay } = item

      if (reason === 'missingCollection') {
        counter.missingCollection = counter.missingCollection || {}
        counter.missingCollection[collectionName] = counter.missingCollection[collectionName] || 0
        counter.missingCollection[collectionName] += 1
      } else if (reason === 'collectionNotExportable') {
        counter.collectionNotExportable = counter.collectionNotExportable || {}
        counter.collectionNotExportable[collectionName] = counter.collectionNotExportable[collectionName] || 0
        counter.collectionNotExportable[collectionName] += 1
      } else if (reason === 'missingParentFolder') {
        pendingLogs.push(`Warning: Parent folder for entity (${collectionName}) ${entityDisplayProperty}: ${entityDisplay} does not exists, skipping import of it`)
      } else {
        pendingLogs.push(`Warning: entity (${collectionName}) ${entityDisplayProperty}: ${entityDisplay} was skipped for import. reason: ${reason}`)
      }
    }

    if (counter.missingCollection != null) {
      Object.keys(counter.missingCollection).forEach((colName) => {
        pendingLogs.unshift(`Warning: export file contains entities (${counter.missingCollection[colName]}) from collection "${colName}" which is not available in this installation, these entities won't be imported`)
      })
    }

    if (counter.collectionNotExportable != null) {
      Object.keys(counter.collectionNotExportable).forEach((colName) => {
        pendingLogs.unshift(`Warning: export file contains entities (${counter.collectionNotExportable[colName]}) from collection "${colName}" which is not exportable, these entities won't be imported`)
      })
    }

    for (const log of pendingLogs) {
      logs.push(log)
      reporter.logger.warn(log)
    }
  }

  if (validation) {
    const validations = []

    const addValidation = async ({ action, collectionName, entity, entityNameDisplay, entityNameDisplayProperty, log }) => {
      const validationInfo = {
        importType: action,
        collectionName,
        entity
      }

      if (log) {
        validationInfo.log = log
      } else {
        validationInfo.log = (
          `Entity ${action}: (${collectionName}) ${entityNameDisplay}`
        )
      }

      validationInfo.nameDisplay = entityNameDisplay
      validationInfo.nameDisplayProperty = entityNameDisplayProperty

      await reporter.importValidation.beforeEntityValidationListeners.fire(req, validationInfo)

      validations.push({
        nameDisplay: entityNameDisplay,
        action,
        log: validationInfo.log
      })
    }

    for (const record of records) {
      const { action, collectionName, entity, entityNameDisplay, entityNameDisplayProperty } = record
      let customLog

      if (action === 'delete' && collectionName === 'folders') {
        const entities = await reporter.folders.getEntitiesInFolder(entity.shortid, true, reporter.adminRequest(req, reporter.Request))

        for (const childInfo of entities) {
          const entityPath = await reporter.folders.resolveEntityPath(childInfo.entity, childInfo.entitySet, req)

          await addValidation({
            action,
            collectionName: childInfo.entitySet,
            entity: childInfo.entity,
            entityNameDisplay: entityPath,
            entityNameDisplayProperty: 'path'
          })
        }
      } else if (action === 'update' && entity.name) {
        const originalEntity = await reporter.documentStore.collection(collectionName).findOneAdmin({
          _id: record.entityId
        }, req)

        let renamedFrom

        if (originalEntity.name !== entity.name) {
          renamedFrom = await reporter.folders.resolveEntityPath(originalEntity, collectionName, req)
        }

        if (renamedFrom) {
          customLog = (
            `Entity ${action}: (${collectionName}) rename ${renamedFrom} to ${entityNameDisplay}`
          )
        }
      }

      await addValidation({
        action,
        collectionName,
        entity,
        entityNameDisplay,
        entityNameDisplayProperty,
        log: customLog
      })
    }

    const actionPriority = { delete: 1, update: 2, insert: 3 }

    const logsFromValidations = validations.sort((a, b) => {
      const nameA = a.nameDisplay.toUpperCase()
      const actionA = a.action
      const hierarchyPartsA = nameA.split('/')
      const nameB = b.nameDisplay.toUpperCase()
      const actionB = b.action
      const hierarchyPartsB = nameB.split('/')

      // sort by action ASC
      if (actionA !== actionB) {
        if (actionPriority[actionA] < actionPriority[actionB]) {
          return -1
        }

        if (actionPriority[actionA] > actionPriority[actionB]) {
          return 1
        }
      }

      // sort by hierarchy level according to the action
      if (hierarchyPartsA.length !== hierarchyPartsB.length) {
        if (actionA === 'delete') {
          // when action is delete sort by hierarchy level DESC
          if (hierarchyPartsA.length > hierarchyPartsB.length) {
            return -1
          }

          if (hierarchyPartsA.length < hierarchyPartsB.length) {
            return 1
          }
        } else {
          // when action is update, insert sort by hierarchy level ASC
          if (hierarchyPartsA.length < hierarchyPartsB.length) {
            return -1
          }

          if (hierarchyPartsA.length > hierarchyPartsB.length) {
            return 1
          }
        }
      }

      // sort by name length ASC
      if (nameA.length !== nameB.length) {
        if (nameA.length < nameB.length) {
          return -1
        }

        if (nameA.length > nameB.length) {
          return 1
        }
      }

      // finally sort by name string relevance ASC
      if (nameA < nameB) {
        return -1
      }

      if (nameA > nameB) {
        return 1
      }

      return 0
    }).map((v) => v.log)

    if (logsFromValidations.length > 0) {
      logs.push(...logsFromValidations)
    }
  } else {
    await reporter.documentStore.beginTransaction(req)

    try {
      for (const record of records) {
        try {
          await processEntityRecord(reporter, req, record, { metadata, logs })
        } catch (e) {
          if (!continueOnFail) {
            e.canContinueAfterFail = true
            throw e
          }
        }
      }

      await reporter.documentStore.commitTransaction(req)
    } catch (e) {
      await reporter.documentStore.rollbackTransaction(req)

      e.message = `Import failed: ${e.message}`

      throw e
    }
  }

  if (!validation) {
    reporter.logger.debug('import finished')
  }

  if (logs.length === 0) {
    return {
      entitiesCount,
      log: ''
    }
  }

  if (!validation) {
    logs.push('Info: import finished')
  }

  return {
    entitiesCount,
    log: logs.join(os.EOL)
  }
}

async function processEntityRecord (reporter, req, record, { metadata, logs }) {
  const entityToProcess = record.entity
  const entityNameDisplay = record.entityNameDisplay
  const entityNameDisplayProperty = record.entityNameDisplayProperty
  const collectionName = record.collectionName

  await reporter.import.beforeEntityPersistedListeners.fire(req, entityToProcess, metadata, logs)

  const processingInfo = {
    action: record.action,
    req,
    collectionName,
    metadata,
    logs
  }

  processingInfo.entityId = record.entityId
  processingInfo.entityNameDisplay = entityNameDisplay
  processingInfo.entityNameDisplayProperty = entityNameDisplayProperty

  const newEntity = await persistEntity(reporter, entityToProcess, processingInfo, req)

  if (record.updateReferences) {
    await record.updateReferences(
      newEntity,
      async (updateRecord) => processEntityRecord(reporter, req, updateRecord, { metadata, logs })
    )
  }
}

module.exports = processImport
