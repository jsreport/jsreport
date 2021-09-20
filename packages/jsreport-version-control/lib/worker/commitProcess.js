const omit = require('lodash.omit')
const pEach = require('p-each-series')
const pReduce = require('p-reduce')
const { applyPatches, createPatch } = require('./patches')
const { serialize, deepEqual } = require('./customUtils')

module.exports = async function scriptCommitProcessing ({ commitMessage, versions, currentEntities, documentModel, diffLimit }, reporter, req) {
  const newCommit = { message: commitMessage, creationDate: new Date(), changes: [] }
  const lastState = await applyPatches(versions, documentModel, reporter, req)

  newCommit.changes = await pReduce(lastState, async (res, s) => {
    const entity = currentEntities[s.entitySet].find((e) => e._id === s.entityId)

    if (!entity) {
      // if not found we try to search by entity path, if we found it, it means that the id changed
      // and we just show the diff as update
      const entityByPath = currentEntities[s.entitySet].find((e) => e.__entityPath === s.path)

      if (entityByPath) {
        return res.concat({
          operation: 'update',
          path: entityByPath.__entityPath,
          entitySet: s.entitySet,
          entityId: s.entityId,
          serializedPatch: serialize(createPatch({
            name: s.path,
            oldEntity: s.entity,
            // prevent the __entityPath showing on diff
            newEntity: omit(entityByPath, ['__entityPath']),
            entitySet: s.entitySet,
            documentModel,
            diffLimit
          }))
        })
      }

      // entity is not in the new state, it was removed
      return res.concat({
        operation: 'remove',
        entitySet: s.entitySet,
        entityId: s.entityId,
        __local: {
          name: s.entity.name,
          folder: s.entity.folder
        }
      })
    }

    // entity is equal so it was not modified, don't adding change
    if (deepEqual(omit(entity, '__entityPath'), s.entity)) {
      return res
    }

    return res.concat({
      operation: 'update',
      path: entity.__entityPath,
      entitySet: s.entitySet,
      entityId: s.entityId,
      serializedPatch: serialize(createPatch({
        name: s.path,
        oldEntity: s.entity,
        // prevent the __entityPath showing on diff
        newEntity: omit(entity, ['__entityPath']),
        entitySet: s.entitySet,
        documentModel,
        diffLimit
      }))
    })
  }, [])

  // the entities that exist in store and are not in the last state gets insert change operation
  await pEach(Object.keys(currentEntities), (es) => {
    return pEach(currentEntities[es], async (e) => {
      const foundById = lastState.find((s) => s.entityId === e._id && s.entitySet === es)
      const foundByPath = lastState.find((s) => s.path === e.__entityPath && s.entitySet === es)

      if (!foundById && !foundByPath) {
        newCommit.changes.push({
          operation: 'insert',
          path: e.__entityPath,
          entitySet: es,
          entityId: e._id,
          // prevent the __entityPath showing on diff
          serializedDoc: serialize(omit(e, ['__entityPath']))
        })
      }
    })
  })

  return {
    commit: newCommit,
    localFolders: lastState.filter((r) => r.entitySet === 'folders').map((r) => {
      return {
        name: r.entity.name,
        shortid: r.entity.shortid,
        folder: r.entity.folder
      }
    })
  }
}
