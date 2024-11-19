const extend = require('node.extend.without.arrays')
const AssertPermissions = require('./assertPermissions.js')
const _omit = require('lodash.omit')

const {
  collectEntitiesInHierarchy,
  collectParentFolders,
  collectEntitiesAtSameLevel,
  collectEntitiesWithGroup,
  collectPermissionsFromEntityGroups,
  sortByHierarchyLevel,
  mergeArrays,
  arraysEqual
} = require('./utils')

module.exports = (reporter) => {
  const assertPermissions = AssertPermissions(reporter)

  reporter.initializeListeners.add('authorization-cascade', () => {
    for (const key in reporter.documentStore.collections) {
      const col = reporter.documentStore.collections[key]

      if (reporter.documentStore.model.entitySets[col.entitySet].shared && col.entitySet !== 'usersGroups') {
        continue
      }

      col.beforeInsertListeners.add('authorization-insert-cascade', async (doc, req) => {
        if (col.entitySet === 'usersGroups') {
          return
        }

        let assertFirst = false

        if (req && req.context && req.context.user && !req.context.user.isSuperAdmin) {
          if (!req.context.user.isGroup) {
            doc.readPermissions = mergeArrays(doc.readPermissions, [req.context.user._id.toString()])
            doc.editPermissions = mergeArrays(doc.editPermissions, [req.context.user._id.toString()])
          } else {
            // if entity target is root folder we need to replicate the behavior of a normal user
            // insert, which is to allow the insert, in this case then we don't assert first
            if (doc.folder == null) {
              doc.readPermissionsGroup = mergeArrays(doc.readPermissionsGroup, [req.context.user._id.toString()])
              doc.editPermissionsGroup = mergeArrays(doc.editPermissionsGroup, [req.context.user._id.toString()])
            } else {
              assertFirst = () => {
                doc.readPermissionsGroup = mergeArrays(doc.readPermissionsGroup, [req.context.user._id.toString()])
                doc.editPermissionsGroup = mergeArrays(doc.editPermissionsGroup, [req.context.user._id.toString()])
              }
            }
          }
        }

        if (!assertFirst) {
          await propagatePermissions(reporter, 'insert', { entity: doc, entitySet: col.entitySet }, req)
          await assertPermissions.assertInsert(col, doc, req)
        } else {
          // we need to propagate first to normalize existing permissions (from folder and custom read/edit permissions group)
          await propagatePermissions(reporter, 'insert', { entity: doc, entitySet: col.entitySet }, req)

          await assertPermissions.assertInsert(col, doc, req)
          assertFirst()

          // propagate the remaining (current user as group)
          await propagatePermissions(reporter, 'insert', { entity: doc, entitySet: col.entitySet }, req)
        }
      })

      col.beforeRemoveListeners.add('authorization-cascade-remove', async (q, req) => {
        if (!req || req.context.skipPermissionsCascade) {
          return
        }

        if (col.name !== 'usersGroups') {
          await assertPermissions.assertRemove(col, q, req)
        }

        const originalEntity = await reporter.documentStore.collection(key).findOne(extend(true, {}, q), req)

        if (!originalEntity) {
          return
        }

        req.context.skipPermissionsCascade = true

        if (col.name === 'usersGroups') {
          let entitiesAffected = await collectEntitiesWithGroup(reporter, originalEntity, req)
          entitiesAffected = await sortByHierarchyLevel(reporter, entitiesAffected, req)

          for (const entityToUpdate of entitiesAffected) {
            const entityNewReadPermissionsGroup = entityToUpdate.readPermissionsGroup != null ? entityToUpdate.readPermissionsGroup.filter((g) => g !== originalEntity._id.toString()) : []
            const entityNewEditPermissionsGroup = entityToUpdate.editPermissionsGroup != null ? entityToUpdate.editPermissionsGroup.filter((g) => g !== originalEntity._id.toString()) : []

            entityToUpdate.readPermissionsGroup = entityNewReadPermissionsGroup
            entityToUpdate.editPermissionsGroup = entityNewEditPermissionsGroup

            await reporter.documentStore.collection(entityToUpdate.__entitySet).update({
              _id: entityToUpdate._id
            }, {
              $set: {
                readPermissionsGroup: entityToUpdate.readPermissionsGroup,
                editPermissionsGroup: entityToUpdate.editPermissionsGroup
              }
            }, req)

            await propagatePermissions(reporter, 'update', { entity: entityToUpdate, entitySet: entityToUpdate.__entitySet, originalEntity: entityToUpdate }, req)
          }
        } else {
          if (originalEntity.folder) {
            await propagateVisibilityPermissions(reporter, originalEntity, { permissions: [] }, req)
          }
        }

        req.context.skipPermissionsCascade = false
      })

      col.beforeUpdateListeners.add('authorization-cascade-update', async (q, u, options, req) => {
        if (!req || req.context.skipPermissionsCascade) {
          return
        }

        if (col.entitySet !== 'usersGroups') {
          await assertPermissions.assertUpdate(col, q, u, options, req)
        }

        const originalEntity = await reporter.documentStore.collection(key).findOne(extend(true, {}, q), req)

        if (!originalEntity) {
          return
        }

        req.context.skipPermissionsCascade = true

        if (col.name === 'usersGroups') {
          if (u.$set.users) {
            let entitiesAffected = await collectEntitiesWithGroup(reporter, originalEntity, req)
            entitiesAffected = await sortByHierarchyLevel(reporter, entitiesAffected, req)

            for (const entityToUpdate of entitiesAffected) {
              await propagatePermissions(reporter, 'update', {
                entity: entityToUpdate,
                entitySet: entityToUpdate.__entitySet,
                originalEntity: entityToUpdate,
                groupUsers: {
                  [originalEntity._id]: {
                    _id: originalEntity._id,
                    users: u.$set.users
                  }
                }
              }, req)
            }
          }
        } else {
          if (
            u.$set.folder === undefined &&
            !u.$set.readPermissions &&
            !u.$set.editPermissions &&
            !u.$set.readPermissionsGroup &&
            !u.$set.editPermissionsGroup
          ) {
            return
          }

          const entityBeingUpdated = extend(true, {}, originalEntity, { __entitySet: key, ...u.$set })

          // primary optimization to avoid running complex propagation when folder and permission was not changed
          if (entitiesDontNeedPermissionsPropagation(originalEntity, entityBeingUpdated)) {
            return
          }

          await propagatePermissions(reporter, 'update', { entity: entityBeingUpdated, entitySet: col.entitySet, originalEntity }, req)

          // we don't want the update to override the permissions
          // we had calculated
          if (u.$set.inheritedReadPermissions) {
            delete u.$set.inheritedReadPermissions
          }

          if (u.$set.inheritedEditPermissions) {
            delete u.$set.inheritedEditPermissions
          }

          if (u.$set.visibilityPermissions) {
            delete u.$set.visibilityPermissions
          }
        }

        req.context.skipPermissionsCascade = false
      })
    }
  })
}

async function propagatePermissions (reporter, modificationType, data, req) {
  const { entity, entitySet, originalEntity, groupUsers } = data

  // start with inherited permissions clean
  entity.inheritedReadPermissions = []
  entity.inheritedEditPermissions = []

  const originalFolderRef = entity.folder

  // propagate cached "inherited" permissions from folders down the tree
  // user having read permissions to the folder should see all entities down the tree
  if (entity.folder) {
    entity.folder = await reporter.documentStore.collection('folders').findOne({ shortid: entity.folder.shortid }, req)

    if (!entity.folder) {
      throw reporter.authorization.createAuthorizationError(entitySet)
    }
  }

  const { readPermissions: inheritedReadPermissionsFromGroup, editPermissions: inheritedEditPermissionsFromGroup } = await collectPermissionsFromEntityGroups(reporter, { entity, groupUsers }, req)

  entity.inheritedReadPermissions = mergeArrays(entity.inheritedReadPermissions, inheritedReadPermissionsFromGroup)
  entity.inheritedEditPermissions = mergeArrays(entity.inheritedEditPermissions, inheritedEditPermissionsFromGroup)

  const entitiesInHierarchy = []

  if (modificationType === 'insert') {
    if (entity.folder) {
      entity.inheritedReadPermissions = mergeArrays(entity.inheritedReadPermissions, entity.folder.readPermissions, entity.folder.inheritedReadPermissions)
      entity.inheritedEditPermissions = mergeArrays(entity.inheritedEditPermissions, entity.folder.editPermissions, entity.folder.inheritedEditPermissions)
    }
  } else {
    await collectEntitiesInHierarchy(reporter, entitiesInHierarchy, entity, req)

    for (const i of entitiesInHierarchy) {
      if (i._id !== entity._id) {
        // reset inherited permissions to other entities in the hierarchy
        // because we are regenerating them here
        i.inheritedReadPermissions = []
        i.inheritedEditPermissions = []

        const { readPermissions: inheritedReadPermissionsFromGroup, editPermissions: inheritedEditPermissionsFromGroup } = await collectPermissionsFromEntityGroups(reporter, { entity: i, groupUsers }, req)

        i.inheritedReadPermissions = mergeArrays(i.inheritedReadPermissions, inheritedReadPermissionsFromGroup)
        i.inheritedEditPermissions = mergeArrays(i.inheritedEditPermissions, inheritedEditPermissionsFromGroup)
      }

      if (i.folder) {
        i.inheritedReadPermissions = mergeArrays(i.inheritedReadPermissions, i.folder.readPermissions, i.folder.inheritedReadPermissions)
        i.inheritedEditPermissions = mergeArrays(i.inheritedEditPermissions, i.folder.editPermissions, i.folder.inheritedEditPermissions)
      }
    }

    for (const item of entitiesInHierarchy) {
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
  }

  const hasFolderChanged = () => (
    originalEntity != null &&
    originalEntity.folder != null &&
    (entity.folder == null || entity.folder.shortid !== originalEntity.folder.shortid)
  )

  const hasGroupPermissionsChanged = () => (
    originalEntity != null &&
    (!arraysEqual(originalEntity.readPermissionsGroup, entity.readPermissionsGroup) ||
    !arraysEqual(originalEntity.editPermissionsGroup, entity.editPermissionsGroup))
  )

  if (
    modificationType === 'update' &&
    originalEntity.folder != null &&
    // update the visibility permissions in the original tree
    // only if it is changed and don't propagate permissions of the "removed" entity
    (hasFolderChanged() || hasGroupPermissionsChanged())
  ) {
    await propagateVisibilityPermissions(reporter, originalEntity, { permissions: [], groupUsers }, req)
  }

  // visibility should start with group permissions that are set on the folder itself
  const entityVisibilityPermissionsSet = new Set([...inheritedReadPermissionsFromGroup, ...inheritedEditPermissionsFromGroup])

  if (modificationType === 'update' && entitySet === 'folders') {
    // when entity is folder we should recalculate visibility permissions
    // for it and then use those visibility permissions for the propagation
    const entities = await collectEntitiesAtSameLevel(reporter, entity, req)

    for (const e of entities) {
      if (e.editPermissions) {
        e.editPermissions.forEach(p => entityVisibilityPermissionsSet.add(p))
      }

      if (e.readPermissions) {
        e.readPermissions.forEach(p => entityVisibilityPermissionsSet.add(p))
      }

      if (e.visibilityPermissions) {
        e.visibilityPermissions.forEach(p => entityVisibilityPermissionsSet.add(p))
      }

      const {
        readPermissions: inheritedReadPermissionsFromGroup,
        editPermissions: inheritedEditPermissionsFromGroup
      } = await collectPermissionsFromEntityGroups(reporter, { entity: e, groupUsers }, req)

      inheritedReadPermissionsFromGroup.forEach(p => entityVisibilityPermissionsSet.add(p))
      inheritedEditPermissionsFromGroup.forEach(p => entityVisibilityPermissionsSet.add(p))
    }

    const updatedVisibilityPermissions = [...entityVisibilityPermissionsSet]

    entity.visibilityPermissions = updatedVisibilityPermissions

    await reporter.documentStore.collection('folders').update(
      { _id: entity._id },
      {
        $set: {
          visibilityPermissions: updatedVisibilityPermissions
        }
      },
      req
    )
  }

  // propagate visibility permissions up
  // user having permissions to the entity should always see all folders up the tree
  if (entity.folder) {
    const permissions = mergeArrays(
      entity.readPermissions,
      entity.editPermissions,
      entity.inheritedReadPermissions,
      entity.inheritedEditPermissions,
      [...entityVisibilityPermissionsSet]
    )

    await propagateVisibilityPermissions(
      reporter,
      entity,
      { permissions, groupUsers },
      req
    )
  }

  // it is important to restore the original folder info
  // specially when the entity is going to be inserted
  entity.folder = originalFolderRef
}

async function propagateVisibilityPermissions (reporter, entity, { permissions = [], groupUsers } = {}, req) {
  const adminReq = reporter.adminRequest(req, reporter.Request)

  permissions = permissions != null ? permissions : []
  const folder = await reporter.documentStore.collection('folders').findOneAdmin({ shortid: entity.folder.shortid }, adminReq)
  const folders = await collectParentFolders(reporter, folder, adminReq)
  let entities = await collectEntitiesAtSameLevel(reporter, folder, adminReq)
  entities = entities.filter(e => e._id !== entity._id)

  const visibilityPermissionsSet = new Set([...permissions])

  for (const e of entities) {
    await collectVisibilityPermissionsFromEntity(reporter, e, groupUsers, adminReq, visibilityPermissionsSet)
  }

  await collectVisibilityPermissionsFromEntity(reporter, _omit(folder, 'visibilityPermissions'), groupUsers, adminReq, visibilityPermissionsSet)

  for (const f of folders) {
    const q = {
      _id: f._id
    }

    if (adminReq && adminReq.context) {
      adminReq.context.skipAuthorizationForUpdate = q
    }

    if (f._id !== folder._id) {
      const childFolders = await reporter.documentStore.collection('folders').find({
        folder: { shortid: f.shortid }
      },
      adminReq
      )

      for (const childFolder of childFolders) {
        await collectVisibilityPermissionsFromEntity(reporter, childFolder, groupUsers, adminReq, visibilityPermissionsSet)
      }
    }

    const finalVisibilityPermissions = [...visibilityPermissionsSet]
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
      adminReq
    )
  }
}

async function collectVisibilityPermissionsFromEntity (reporter, entity, groupUsers, adminReq, visibilityPermissionsSet) {
  if (entity.editPermissions) {
    entity.editPermissions.forEach(p => visibilityPermissionsSet.add(p))
  }

  if (entity.readPermissions) {
    entity.readPermissions.forEach(p => visibilityPermissionsSet.add(p))
  }

  if (entity.visibilityPermissions) {
    entity.visibilityPermissions.forEach(p => visibilityPermissionsSet.add(p))
  }

  const {
    readPermissions: inheritedReadPermissionsFromGroup,
    editPermissions: inheritedEditPermissionsFromGroup
  } = await collectPermissionsFromEntityGroups(reporter, { entity, groupUsers }, adminReq)

  inheritedReadPermissionsFromGroup.forEach(p => visibilityPermissionsSet.add(p))
  inheritedEditPermissionsFromGroup.forEach(p => visibilityPermissionsSet.add(p))
}

function entitiesDontNeedPermissionsPropagation (a, b) {
  const folderSame = (
    (a.folder === null && b.folder === null) ||
    (a.folder === undefined && b.folder === undefined) ||
    (a.folder && b.folder && a.folder.shortid === b.folder.shortid)
  )

  const permissionsSame = (
    arraysEqual(a.readPermissions, b.readPermissions) &&
    arraysEqual(a.editPermissions, b.editPermissions) &&
    arraysEqual(a.readPermissionsGroup, b.readPermissionsGroup) &&
    arraysEqual(a.editPermissionsGroup, b.editPermissionsGroup)
  )

  return folderSame && permissionsSame
}
