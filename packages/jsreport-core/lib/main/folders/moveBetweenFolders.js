const omit = require('lodash.omit')

async function collectEntitiesInHierarchy (reporter, entities, sourceEntity, onlyChildren, req) {
  if (sourceEntity.__entitySet === 'folders') {
    if (!onlyChildren) {
      entities.push(sourceEntity)
    }

    const childEntities = await reporter.folders.getEntitiesInFolder(sourceEntity.shortid, true, req)

    for (const { entitySet, entity } of childEntities) {
      entities.push(Object.assign(entity, {
        __entitySet: entitySet
      }))
    }
  } else {
    entities.push(sourceEntity)
  }
}

async function throwIfEntityIsNotFolder (reporter, targetShortid, req) {
  const folder = await reporter.documentStore.collection('folders').findOne({
    shortid: targetShortid
  }, req)

  if (!folder) {
    throw reporter.createError(`Target entity "${targetShortid}" is not a folder, please review that the copy/move is against a valid folder entity`, {
      statusCode: 400
    })
  }
}

module.exports = (reporter) => async ({ source, target, shouldCopy, shouldReplace }, req) => {
  const isSingleSource = Array.isArray(source) ? source.length === 1 : true
  const sourceList = isSingleSource ? [source] : source

  if (target.shortid === undefined) {
    throw reporter.createError('target should specify ".shortid"', {
      statusCode: 400
    })
  }

  if (target.shortid != null) {
    await throwIfEntityIsNotFolder(reporter, target.shortid, req)
  }

  const targetUpdateReferences = target.updateReferences === true && target.shortid != null

  const allEntitiesInvolved = []

  for (const sourceInfo of sourceList) {
    const sourceCol = reporter.documentStore.collection(sourceInfo.entitySet)

    if (!sourceCol) {
      throw reporter.createError(`Invalid entity set "${sourceInfo.entitySet}" for source`, {
        statusCode: 400
      })
    }

    const sourceEntity = await sourceCol.findOne({ _id: sourceInfo.id }, req)

    if (!sourceEntity) {
      throw reporter.createError('Source entity with specified id does not exists', {
        statusCode: 400
      })
    }

    const onlyChildren = sourceInfo.onlyChildren === true

    if (onlyChildren && sourceInfo.entitySet !== 'folders') {
      throw reporter.createError('onlyChildren option can only be enabled when source is a folder')
    }

    let entitiesInHierarchy = []

    await collectEntitiesInHierarchy(
      reporter,
      entitiesInHierarchy,
      Object.assign(sourceEntity, { __entitySet: sourceInfo.entitySet }),
      onlyChildren,
      req
    )

    let rootChildren

    if (onlyChildren) {
      rootChildren = entitiesInHierarchy.filter((e) => {
        return e.folder.shortid === sourceEntity.shortid
      })
    }

    // ignore if we are doing a copy/move at the same level of hierarchy between source and target
    if (
      (sourceEntity.folder == null && target.shortid === null) ||
      (sourceEntity.folder != null &&
      target.shortid != null &&
      sourceEntity.folder.shortid === target.shortid)
    ) {
      continue
    }

    if (!shouldCopy) {
      // validates that we can't move entities from higher level
      // into lower level of the same hierarchy
      if (entitiesInHierarchy.some((e) => e.shortid === target.shortid)) {
        continue
      }

      let updateQ

      if (target.shortid === null) {
        updateQ = {
          $set: {
            folder: null
          }
        }
      } else {
        updateQ = {
          $set: {
            folder: {
              shortid: target.shortid
            }
          }
        }
      }

      let sourceEntities

      if (!onlyChildren) {
        sourceEntities = [sourceEntity]
      } else {
        sourceEntities = rootChildren
      }

      for (const entity of sourceEntities) {
        try {
          await reporter.documentStore.collection(entity.__entitySet).update({
            _id: entity._id
          }, updateQ, req)
        } catch (e) {
          if (e.code === 'DUPLICATED_ENTITY' && shouldReplace) {
            // replacing is not supported when it generates a conflict with folder
            if (e.existingEntityEntitySet === 'folders') {
              throw e
            }

            const removeFolderQ = target.shortid === null ? { folder: null } : { folder: { shortid: target.shortid } }

            await reporter.documentStore.collection(e.existingEntityEntitySet).remove({
              _id: e.existingEntity._id,
              ...removeFolderQ
            }, req)

            await reporter.documentStore.collection(entity.__entitySet).update({
              _id: entity._id
            }, updateQ, req)
          } else {
            throw e
          }
        }
      }

      const sourceEntityItems = entitiesInHierarchy.filter((e) => {
        return sourceEntities.find((childE) => childE._id === e._id) != null
      })

      for (const sourceEntityItem of sourceEntityItems) {
        if (target.shortid === null) {
          sourceEntityItem.folder = null
        } else {
          sourceEntityItem.folder = {
            shortid: target.shortid
          }
        }
      }
    } else {
      const entitiesInHierarchyByCollection = entitiesInHierarchy.reduce((acu, entity) => {
        acu[entity.__entitySet] = acu[entity.__entitySet] || []
        acu[entity.__entitySet].push(entity)
        return acu
      }, {})

      const entityReferencesMap = new WeakMap()
      const originalEntitiesNewMap = new WeakMap()
      const entityRecordNewValueMap = new WeakMap()
      const records = []

      // eslint-disable-next-line
      function createUpdateReferences (record) {
        return async (newEntity) => {
          const { entitySet, entity, originalEntity } = record
          const linkedEntities = entityReferencesMap.get(entity)

          if (linkedEntities.length === 0) {
            return
          }

          for (const { properties: linkedProperties, entity: originalLinkedEntity } of linkedEntities) {
            const currentNewLinkedEntity = originalEntitiesNewMap.get(originalLinkedEntity)

            if (entityRecordNewValueMap.has(currentNewLinkedEntity)) {
              const currentEntityProcessedNew = entityRecordNewValueMap.get(currentNewLinkedEntity)
              const currentEntityUpdate = {}

              // if we get here it means that the entity was already processed, so we need to
              // execute an update directly to the store
              for (const prop of linkedProperties) {
                // here we care to use the new object result because we want to preserve other values
                // in case the property is array with objects
                reporter.documentStore.updateReference(originalLinkedEntity.__entitySet, currentEntityProcessedNew, entitySet, { referenceProp: prop, referenceValue: originalEntity.shortid }, newEntity.shortid)
                const rootProp = prop.split('.')[0]
                currentEntityUpdate[rootProp] = currentEntityProcessedNew[rootProp]
              }

              await reporter.documentStore.collection(originalLinkedEntity.__entitySet).update({
                _id: currentEntityProcessedNew._id
              }, { $set: currentEntityUpdate }, req)
            } else {
              // here we care to update all properties to point to old reference value
              reporter.documentStore.updateReference(originalLinkedEntity.__entitySet, currentNewLinkedEntity, entitySet, { referenceValue: originalEntity.shortid }, newEntity.shortid)
            }
          }
        }
      }

      if (targetUpdateReferences) {
        const targetEntity = await reporter.documentStore.collection('folders').findOne({
          shortid: target.shortid
        }, req)

        targetEntity.__entitySet = 'folders'
        entitiesInHierarchyByCollection.folders = entitiesInHierarchyByCollection.folders || []
        entitiesInHierarchyByCollection.folders.push(targetEntity)
        originalEntitiesNewMap.set(targetEntity, targetEntity)
        entityRecordNewValueMap.set(targetEntity, targetEntity)
      }

      for (const entity of entitiesInHierarchy) {
        const newEntity = {
          ...omit(entity, ['_id', 'shortid', '__entitySet'])
        }

        let isSourceEntityItem

        if (!onlyChildren) {
          isSourceEntityItem = sourceInfo.id === entity._id
        } else {
          isSourceEntityItem = rootChildren.find((e) => e._id === entity._id) != null
        }

        if (isSourceEntityItem) {
          if (target.shortid === null) {
            newEntity.folder = null
          } else {
            newEntity.folder = {
              shortid: target.shortid
            }
          }

          // when we are copying with multi selection we want to normalize names
          // so in case of duplicates we just add "(copy)" suffix, for single source
          // we want the replace dialog
          if (!isSingleSource) {
            let copyAttempt = 0
            let existsAtTarget

            do {
              existsAtTarget = await reporter.documentStore.collection(entity.__entitySet).findOne({
                name: newEntity.name,
                folder: newEntity.folder
              })

              if (existsAtTarget != null) {
                copyAttempt++
                newEntity.name = `${entity.name}(copy${copyAttempt > 1 ? copyAttempt : ''})`
              }
            } while (existsAtTarget != null)
          }
        }

        const entitySet = entity.__entitySet
        newEntity.__entitySet = entitySet

        const linkedEntities = reporter.documentStore.findLinkedEntitiesForReference(
          entitiesInHierarchyByCollection,
          entitySet,
          entity.shortid
        )

        const record = {
          entitySet,
          originalEntity: entity,
          entity: newEntity
        }

        record.updateReferences = createUpdateReferences(record)

        originalEntitiesNewMap.set(entity, newEntity)
        entityReferencesMap.set(newEntity, linkedEntities)

        records.push(record)
      }

      const processNewEntity = async (entitySet, entity) => {
        const newEntityFromStore = await reporter.documentStore.collection(entitySet).insert({
          ...omit(entity, ['__entitySet'])
        }, req)

        entityRecordNewValueMap.set(entity, newEntityFromStore)
      }

      for (const record of records) {
        try {
          await processNewEntity(record.entitySet, record.entity)
        } catch (e) {
          if (e.code === 'DUPLICATED_ENTITY' && shouldReplace) {
            // replacing is not supported when it generates a conflict with folder
            if (e.existingEntityEntitySet === 'folders') {
              throw e
            }

            const removeFolderQ = target.shortid === null ? { folder: null } : { folder: { shortid: target.shortid } }

            await reporter.documentStore.collection(e.existingEntityEntitySet).remove({
              _id: e.existingEntity._id,
              ...removeFolderQ
            }, req)

            await processNewEntity(record.entitySet, record.entity)
          } else {
            throw e
          }
        }

        await record.updateReferences(entityRecordNewValueMap.get(record.entity))
      }

      entitiesInHierarchy = records.map((record) => ({
        ...omit(entityRecordNewValueMap.get(record.entity), ['$entitySet', '__entitySet']),
        __entitySet: record.entitySet
      }))
    }

    allEntitiesInvolved.push(...entitiesInHierarchy)
  }

  // return fresh version of creationDate, modificationDate in the records.
  // this helps with concurrent validation on studio
  await Promise.all(allEntitiesInvolved.map(async (entity) => {
    const entitySet = reporter.documentStore.model.entitySets[entity.__entitySet]
    const entityType = entitySet.entityTypeDef
    const projection = {}

    if (entityType.creationDate != null && entityType.creationDate.type === 'Edm.DateTimeOffset') {
      projection.creationDate = 1
    }

    if (entityType.modificationDate != null && entityType.modificationDate.type === 'Edm.DateTimeOffset') {
      projection.modificationDate = 1
    }

    if (Object.keys(projection).length === 0) {
      return
    }

    const doc = await reporter.documentStore.collection(entity.__entitySet).findOne({
      _id: entity._id
    }, {
      creationDate: 1,
      modificationDate: 1
    }, req)

    if (projection.creationDate) {
      entity.creationDate = doc.creationDate
    }

    if (projection.modificationDate) {
      entity.modificationDate = doc.modificationDate
    }
  }))

  return allEntitiesInvolved
}
