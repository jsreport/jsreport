const extend = require('node.extend.without.arrays')
const omit = require('lodash.omit')
const AssertPermissions = require('./assertPermissions.js')

async function collectEntitiesInHierarchy (reporter, items, sourceEntity, req) {
  if (sourceEntity.__entitySet === 'folders') {
    items.push(sourceEntity)

    const oneLevelItems = []

    for (const es in reporter.documentStore.model.entitySets) {
      const entities = await reporter.documentStore.collection(es).find(
        {
          folder: {
            shortid: sourceEntity.shortid
          }
        },
        req
      )

      entities.map(e => ({ ...e, __entitySet: es, folder: sourceEntity })).forEach(e => oneLevelItems.push(e))
    }

    oneLevelItems.filter(e => e.__entitySet !== 'folders').forEach(e => items.push(e))
    await Promise.all(oneLevelItems.filter(e => e.__entitySet === 'folders').map(e => collectEntitiesInHierarchy(reporter, items, e, req)))
  } else {
    items.push(sourceEntity)
  }
}

async function collectParentFolders (reporter, folder, req) {
  const folders = [folder]

  while (folder.folder) {
    folder = await reporter.documentStore.collection('folders').findOne({ shortid: folder.folder.shortid }, req)
    folders.push({ ...folder, __entitySet: 'folders' })
  }

  return folders
}

async function collectEntitiesAtSameLevel (reporter, folder, req) {
  const result = []
  for (const es in reporter.documentStore.model.entitySets) {
    const localReq = req ? reporter.Request(req) : req

    if (localReq) {
      localReq.context = localReq.context ? omit(localReq.context, 'user') : localReq.context
    }

    const entities = await reporter.documentStore.collection(es).find(
      {
        folder: {
          shortid: folder.shortid
        }
      },
      localReq
    )

    entities.map(e => ({ ...e, __entitySet: es })).forEach(e => result.push(e))
  }
  return result
}

function mergeArrays (...params) {
  const arrays = params.map((p) => {
    return p != null ? p : []
  })

  const all = arrays.reduce((acu, arr) => {
    acu.push(...arr)
    return acu
  }, [])

  return [...new Set([...all])]
}

function arraysEqual (a, b) {
  a = a != null ? a : []
  b = b != null ? b : []

  const sa = new Set(a)
  const sb = new Set(b)
  return sa.size === sb.size && a.every(v => sb.has(v))
}

function entitiesDontNeedPermissionsPropagation (a, b) {
  const folderSame =
    (a.folder === null && b.folder === null) ||
    (a.folder === undefined && b.folder === undefined) ||
    (a.folder && b.folder && a.folder.shortid === b.folder.shortid)
  const permissionsSame = arraysEqual(a.readPermissions, b.readPermissions) && arraysEqual(a.editPermissions, b.editPermissions)

  return folderSame && permissionsSame
}

async function propagateVisibilityPermissions (reporter, entity, permissions = [], req) {
  permissions = permissions != null ? permissions : []
  const folder = await reporter.documentStore.collection('folders').findOne({ shortid: entity.folder.shortid }, req)

  const folders = await collectParentFolders(reporter, folder, req)
  let entities = await collectEntitiesAtSameLevel(reporter, folder, req)
  entities = entities.filter(e => e._id !== entity._id)

  const finalVisibilityPermissionsSet = new Set([...permissions])
  entities.forEach(e => (e.editPermissions || []).forEach(p => finalVisibilityPermissionsSet.add(p)))
  entities.forEach(e => (e.readPermissions || []).forEach(p => finalVisibilityPermissionsSet.add(p)))
  entities.forEach(e => (e.visibilityPermissions || []).forEach(p => finalVisibilityPermissionsSet.add(p)))

  const finalVisibilityPermissions = [...finalVisibilityPermissionsSet]

  for (const f of folders) {
    const q = {
      _id: f._id
    }

    if (req && req.context) {
      req.context.skipAuthorizationForUpdate = q
    }

    if (arraysEqual(f.visibilityPermissions, finalVisibilityPermissions)) {
      continue
    }

    await reporter.documentStore.collection('folders').update(
      q,
      {
        $set: {
          visibilityPermissions: finalVisibilityPermissions
        }
      },
      req
    )
  }
}

module.exports = (reporter) => {
  const assertPermissions = AssertPermissions(reporter)

  reporter.initializeListeners.add('authorization-cascade', () => {
    for (const key in reporter.documentStore.collections) {
      const col = reporter.documentStore.collections[key]

      if (reporter.documentStore.model.entitySets[col.entitySet].shared) {
        continue
      }

      col.beforeInsertListeners.add('authorization-insert-cascade', async (doc, req) => {
        if (req && req.context && req.context.user && req.context.user._id && !req.context.user.isAdmin) {
          doc.readPermissions = mergeArrays(doc.readPermissions, [req.context.user._id.toString()])
          doc.editPermissions = mergeArrays(doc.editPermissions, [req.context.user._id.toString()])
        }

        if (!doc.folder) {
          return
        }

        const folder = await reporter.documentStore.collection('folders').findOne(
          {
            shortid: doc.folder.shortid
          },
          req
        )

        if (!folder) {
          throw reporter.authorization.createAuthorizationError(col.entitySet)
        }

        doc.inheritedReadPermissions = mergeArrays(doc.inheritedReadPermissions, folder.readPermissions, folder.inheritedReadPermissions)
        doc.inheritedEditPermissions = mergeArrays(doc.inheritedEditPermissions, folder.editPermissions, folder.inheritedEditPermissions)

        await assertPermissions.assertInsert(col, doc, req)

        await propagateVisibilityPermissions(
          reporter,
          doc,
          mergeArrays(doc.readPermissions, doc.editPermissions, doc.inheritedReadPermissions, doc.inheritedEditPermissions),
          req
        )
      })

      col.beforeRemoveListeners.add('authorization-cascade-remove', async (q, req) => {
        if (!req || req.context.skipPermissionsCascade) {
          return
        }

        await assertPermissions.assertRemove(col, q, req)

        req.context.skipPermissionsCascade = true

        const originalEntity = await reporter.documentStore.collection(key).findOne(extend(true, {}, q), req)

        if (!originalEntity) {
          return
        }

        if (originalEntity.folder) {
          await propagateVisibilityPermissions(reporter, originalEntity, [], req)
        }
      })

      col.beforeUpdateListeners.add('authorization-cascade-update', async (q, u, options, req) => {
        if (!req || req.context.skipPermissionsCascade) {
          return
        }

        await assertPermissions.assertUpdate(col, q, u, options, req)

        if (u.$set.folder === undefined && !u.$set.readPermissions && !u.$set.editPermissions) {
          return
        }

        req.context.skipPermissionsCascade = true

        const originalEntity = await reporter.documentStore.collection(key).findOne(extend(true, {}, q), req)

        if (!originalEntity) {
          return
        }

        const entityBeingUpdated = extend(true, {}, originalEntity, { __entitySet: key, ...u.$set })

        // primary optimization to avoid running complex propagation when folder and permission was not changed
        if (entitiesDontNeedPermissionsPropagation(originalEntity, entityBeingUpdated)) {
          return
        }

        // propagate cached "inherited" permissions from folders down the tree
        // user having read permissions to the folder should see all entities down the tree
        if (entityBeingUpdated.folder) {
          entityBeingUpdated.folder = await reporter.documentStore.collection('folders').findOne({ shortid: entityBeingUpdated.folder.shortid }, req)
        }

        const items = []
        await collectEntitiesInHierarchy(reporter, items, entityBeingUpdated, req)

        for (const i of items) {
          if (!i.folder) {
            i.inheritedReadPermissions = []
            i.inheritedEditPermissions = []
          } else {
            i.inheritedReadPermissions = mergeArrays(i.folder.readPermissions, i.folder.inheritedReadPermissions)
            i.inheritedEditPermissions = mergeArrays(i.folder.editPermissions, i.folder.inheritedEditPermissions)
          }
        }

        for (const item of items) {
          await reporter.documentStore.collection(item.__entitySet).update(
            {
              _id: item._id
            },
            {
              $set: {
                inheritedReadPermissions: item.inheritedReadPermissions,
                inheritedEditPermissions: item.inheritedEditPermissions
              }
            },
            req
          )
        }

        // update the visibility permissions in the original tree
        // only if is changed and don't propagate permissions of the "removed" entity
        if (originalEntity.folder && (!entityBeingUpdated.folder || entityBeingUpdated.folder.shortid !== originalEntity.folder.shortid)) {
          await propagateVisibilityPermissions(reporter, originalEntity, [], req)
        }

        // propagate visibility permissions up
        // user having permissions to the entity should always see all folders up the tree
        if (entityBeingUpdated.folder) {
          await propagateVisibilityPermissions(
            reporter,
            entityBeingUpdated,
            mergeArrays(entityBeingUpdated.readPermissions, entityBeingUpdated.editPermissions, entityBeingUpdated.visibilityPermissions),
            req
          )
        }

        req.context.skipPermissionsCascade = false
      })
    }
  })
}
