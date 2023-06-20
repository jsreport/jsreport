/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension for authorizing requests and data access. It is dependent on Authentication extension.
 *
 * Adds property readPermissions and editPermissions to every object as array od user ids identifying which
 * user can work on which object.
 */
const isEqual = require('lodash.isequal')
const modificationListeners = require('./modificationListeners')

module.exports = function (reporter, definition) {
  if (!reporter.authentication) {
    definition.options.enabled = false
    return
  }

  reporter.documentStore.registerComplexType('UserRefType', {
    shortid: { type: 'Edm.String', referenceTo: 'users' }
  })

  reporter.documentStore.registerEntityType('UsersGroupType', {
    name: { type: 'Edm.String' },
    users: { type: 'Collection(jsreport.UserRefType)' },
    isAdmin: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.registerEntitySet('usersGroups', {
    entityType: 'jsreport.UsersGroupType',
    shared: true,
    splitIntoDirectories: true
  })

  reporter.documentStore.model.entityTypes.UserType.editAllPermissions = { type: 'Edm.Boolean' }
  reporter.documentStore.model.entityTypes.UserType.readAllPermissions = { type: 'Edm.Boolean' }
  reporter.documentStore.model.entityTypes.FolderType.visibilityPermissions = { type: 'Collection(Edm.String)' }

  reporter.documentStore.on('before-init', (documentStore) => {
    for (const key in documentStore.model.entitySets) {
      const entitySet = documentStore.model.entitySets[key]

      if (entitySet.shared) {
        continue
      }

      const entityType = documentStore.model.entityTypes[entitySet.entityType.replace(documentStore.model.namespace + '.', '')]

      entityType.readPermissions = { type: 'Collection(Edm.String)' }
      entityType.editPermissions = { type: 'Collection(Edm.String)' }
      entityType.readPermissionsGroup = { type: 'Collection(Edm.String)' }
      entityType.editPermissionsGroup = { type: 'Collection(Edm.String)' }
      entityType.inheritedReadPermissions = { type: 'Collection(Edm.String)' }
      entityType.inheritedEditPermissions = { type: 'Collection(Edm.String)' }
    }
  })

  reporter.authorization = {
    findPermissionFilteringListeners: reporter.createListenerCollection('Authorization@findPermissionFiltering'),
    requestAuthorizationListeners: reporter.createListenerCollection('Authorization@requestAuthorization'),
    operationAuthorizationListeners: reporter.createListenerCollection('Authorization@operationAuthorization'),
    authorizeRequest: async function (req, res) {
      const authRes = await this.requestAuthorizationListeners.fireAndJoinResults(req, res)

      if (authRes === null) {
        return req.context.user !== null && req.context.user !== undefined
      }

      return authRes
    },
    createAuthorizationError: function (reason, meta) {
      return reporter.createError(`Unauthorized for ${reason}`, {
        ...meta,
        code: 'UNAUTHORIZED'
      })
    }
  }

  reporter.authorization.findPermissionFilteringListeners.add(definition.name, (collection, query, req) => {
    const filter = [
      { readPermissions: req.context.user._id.toString() },
      { editPermissions: req.context.user._id.toString() },
      { inheritedReadPermissions: req.context.user._id.toString() },
      { inheritedEditPermissions: req.context.user._id.toString() }
    ]

    if (collection.name === 'folders') {
      filter.push({ visibilityPermissions: req.context.user._id.toString() })
    }

    if (query.$or) {
      query.$and = [...query.$and || [], { $or: filter }, { $or: query.$or }]
      delete query.$or
    } else {
      query.$or = filter
    }
  })

  modificationListeners(reporter)

  reporter.initializeListeners.add(definition.name, async () => {
    const sharedEntitySets = []

    for (const key in reporter.documentStore.collections) {
      const col = reporter.documentStore.collections[key]

      if (reporter.documentStore.model.entitySets[col.entitySet].shared) {
        sharedEntitySets.push(col.entitySet)

        if (col.entitySet !== 'usersGroups') {
          continue
        }
      }

      if (col.entitySet === 'usersGroups') {
        col.beforeInsertListeners.add('usersGroups-validation', async (doc, req) => {
          const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

          if (req && req.context && req.context.user && !isAdmin) {
            throw reporter.authorization.createAuthorizationError(col.name)
          }

          if (req?.context?.user && !req.context.user.isSuperAdmin && (doc.isAdmin === true || doc.isSuperAdmin === true)) {
            // admin user should not be able to create admin users
            throw reporter.authorization.createAuthorizationError(`${col.name}. Only super admin user can create admin usersGroups`)
          }

          // remove invalid input for not super admin user
          if (req?.context?.user && !req.context.user.isSuperAdmin) {
            delete doc.isAdmin
            delete doc.isSuperAdmin
          }

          // cache invalidate when creating group (group can be created with users filled from api)
          if (req?.context?.isAdminCache) {
            delete req.context.isAdminCache
          }
        })

        col.beforeUpdateListeners.add('usersGroups-validation', async (q, u, options, req) => {
          const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

          if (req && req.context && req.context.user && !isAdmin) {
            throw reporter.authorization.createAuthorizationError(col.name)
          }

          if (req?.context?.user && !req.context.user.isSuperAdmin) {
            const groupsToUpdate = await reporter.documentStore.collection(col.name).findAdmin(q, req)

            return Promise.all(groupsToUpdate.map(async (currentGroup) => {
              const propertiesNotAllowed = ['isAdmin']

              const currentGroupIsAdmin = currentGroup.isAdmin === true

              if (currentGroupIsAdmin) {
                // admin user should not be able to update some properties about other admin usersGroups
                propertiesNotAllowed.push('_id')
                propertiesNotAllowed.push('shortid')
                propertiesNotAllowed.push('name')
                propertiesNotAllowed.push('users')
              }

              for (const prop of propertiesNotAllowed) {
                let setValue = u.$set[prop]

                if (prop === 'users' && Array.isArray(setValue)) {
                  setValue = setValue.map((v) => ({ shortid: v.shortid }))
                }

                if (
                  u.$set.isSuperAdmin != null ||
                  (
                    Object.prototype.hasOwnProperty.call(u.$set, prop) &&
                    (currentGroup[prop] != null || setValue != null) &&
                    !isEqual(currentGroup[prop], setValue)
                  )
                ) {
                  // admin user should not be able to update the value of .isAdmin, .users, etc
                  throw reporter.authorization.createAuthorizationError(`${col.name}. Only super admin user can update .${prop} property for admin usersGroups`)
                }
              }

              return null
            }))
          }

          // cache invalidate when updating users of group
          if (req?.context?.isAdminCache && Object.hasOwn(u.$set, 'users')) {
            delete req.context.isAdminCache
          }
        })

        col.beforeRemoveListeners.add('usersGroups-validation', async (q, req) => {
          const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

          if (req && req.context && req.context.user && !isAdmin) {
            throw reporter.authorization.createAuthorizationError(col.name)
          }

          if (req?.context?.user && !req.context.user.isSuperAdmin) {
            const groupsToRemove = await reporter.documentStore.collection(col.name).find(q, req)

            return Promise.all(groupsToRemove.map(async (currentGroup) => {
              const currentGroupIsAdmin = currentGroup.isAdmin === true

              if (currentGroupIsAdmin) {
                // admin user should not be able to remove other admin usersGroups
                throw reporter.authorization.createAuthorizationError(`${col.name}. Only super admin user can remove admin usersGroups`)
              }

              return null
            }))
          }

          // cache invalidate when removing group
          if (req?.context?.isAdminCache) {
            delete req.context.isAdminCache
          }
        })
      } else {
        col.beforeFindListeners.add('authorize', async (q, p, req) => {
          const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

          if (
            req &&
            req.context &&
            req.context.user &&
            req.context.user._id &&
            !isAdmin &&
            !req.context.user.readAllPermissions &&
            req.context.skipAuthorization !== true &&
            req.context.skipAuthorizationForQuery !== q
          ) {
            return reporter.authorization.findPermissionFilteringListeners.fire(col, q, req)
          }
        })
      }
    }

    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        sharedEntitySets
      })
    }
  })
}
