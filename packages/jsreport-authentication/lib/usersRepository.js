const passwordHash = require('password-hash')

const maxFailedAttempts = 10

module.exports = (reporter, admin) => {
  reporter.documentStore.registerEntityType('UserType', {
    username: { type: 'Edm.String' },
    name: { type: 'Edm.String' },
    password: { type: 'Edm.String', visible: false },
    isAdmin: { type: 'Edm.Boolean' },
    failedLoginAttemptsCount: { type: 'Edm.Int32', visible: false },
    failedLoginAttemptsStart: { type: 'Edm.DateTimeOffset', visible: false }
  })

  reporter.documentStore.registerEntitySet('users', {
    entityType: 'jsreport.UserType',
    shared: true,
    splitIntoDirectories: true
  })

  reporter.initializeListeners.add('repository', async () => {
    if (reporter.options.migrateAuthenticationUsernameProp !== false) {
      const users = await reporter.documentStore.collection('users').find({ name: null })

      if (users.length) {
        reporter.logger.info('Store contains user entities with deprecated username, migrating to name...')
      }

      for (const user of users) {
        await reporter.documentStore.collection('users').update({
          _id: user._id
        }, {
          $set: {
            name: user.username
          }
        })
      }
    }

    if (reporter.authorization) {
      const userCol = reporter.documentStore.collection('users')

      // users can be read by anyone so we don't add find listeners,
      // we only care about modification listeners.
      userCol.beforeInsertListeners.add('users-authorization', async (doc, req) => {
        const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

        if (req && req.context && req.context.user && !isAdmin) {
          throw reporter.authorization.createAuthorizationError(userCol.name)
        }

        if (req?.context?.user && !req.context.user.isSuperAdmin && (doc.isAdmin === true || doc.isSuperAdmin === true)) {
          // admin user should not be able to create admin users
          throw reporter.authorization.createAuthorizationError(`${userCol.name}. Only super admin user can create admin users`)
        }

        // remove invalid input for not super admin user
        if (req?.context?.user && !req.context.user.isSuperAdmin) {
          delete doc.isAdmin
          delete doc.isSuperAdmin
        }
      })

      // updates from studio (like change password) will still work because the updates there use
      // the reporter.authentication.usersRepository api which does not have a req
      // attached to the store calls
      userCol.beforeUpdateListeners.add('users-authorization', async (q, u, options, req) => {
        const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

        if (req && req.context && req.context.user && !isAdmin) {
          throw reporter.authorization.createAuthorizationError(userCol.name)
        }

        if (req?.context?.user && !req.context.user.isSuperAdmin) {
          const usersToUpdate = await reporter.documentStore.collection(userCol.name).findAdmin(q, req)

          return Promise.all(usersToUpdate.map(async (currentUser) => {
            const propertiesNotAllowed = ['isAdmin']

            const currentUserIsAdmin = await reporter.authentication.isUserAdmin(currentUser, req)

            if (currentUserIsAdmin) {
              // admin user should not be able to update some properties about other admin users
              propertiesNotAllowed.push('_id')
              propertiesNotAllowed.push('shortid')
              propertiesNotAllowed.push('name')
            }

            if (currentUser.name !== req.context.user.name) {
              propertiesNotAllowed.push('password')
            }

            for (const prop of propertiesNotAllowed) {
              if (
                u.$set.isSuperAdmin != null ||
                (
                  Object.prototype.hasOwnProperty.call(u.$set, prop) &&
                  (currentUser[prop] != null || u.$set[prop] != null) &&
                  currentUser[prop] !== u.$set[prop]
                )
              ) {
                // admin user should not be able to update the value of .isAdmin, .name, etc
                throw reporter.authorization.createAuthorizationError(`${userCol.name}. Only super admin user can update .${prop} property for admin users`)
              }
            }

            return null
          }))
        }

        // cache invalidate when update to isAdmin value
        if (req?.context?.isAdminCache && Object.hasOwn(u.$set, 'isAdmin')) {
          delete req.context.isAdminCache
        }
      })

      userCol.beforeRemoveListeners.add('users-authorization', async (q, req) => {
        const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

        if (req && req.context && req.context.user && !isAdmin) {
          throw reporter.authorization.createAuthorizationError(userCol.name)
        }

        if (req?.context?.user && !req.context.user.isSuperAdmin) {
          const usersToRemove = await reporter.documentStore.collection(userCol.name).find(q, req)

          return Promise.all(usersToRemove.map(async (currentUser) => {
            const currentUserIsAdmin = await reporter.authentication.isUserAdmin(currentUser, req)

            if (currentUserIsAdmin) {
              // admin user should not be able to remove other admin users (including itself)
              throw reporter.authorization.createAuthorizationError(`${userCol.name}. Only super admin user can remove other admin users`)
            }

            return null
          }))
        }

        // cache invalidate when removing user
        if (req?.context?.isAdminCache) {
          delete req.context.isAdminCache
        }
      })
    }

    reporter.documentStore.collection('users').beforeUpdateValidationListeners.add('users', async (q, u, o, req) => {
      if (u.$set.username && !u.$set.name) {
        reporter.logger.warn('Attribute username of entity user is deprecated, use name instead', req)
        u.$set.name = u.$set.username
      }

      if (u.$set.name && !u.$set.username) {
        u.$set.username = u.$set.name
      }
    })

    reporter.documentStore.collection('users').beforeInsertValidationListeners.add('users', async (doc, req) => {
      if (doc.username && !doc.name) {
        reporter.logger.warn('Attribute username of entity user is deprecated, use name instead', req)
        doc.name = doc.username
      }

      if (doc.name && !doc.username) {
        doc.username = doc.name
      }
    })

    reporter.documentStore.collection('users').beforeInsertListeners.add('users', async (doc, req) => {
      // normalizing username to prevent registering a repeated username with spaces
      doc.name = doc.name.trim()

      if (!doc.password) {
        throw reporter.createError('password is required', {
          statusCode: 400
        })
      }

      if (typeof doc.password !== 'string') {
        throw reporter.createError('password has an invalid value', {
          statusCode: 400
        })
      }

      delete doc.passwordVerification

      if (!passwordHash.isHashed(doc.password)) {
        doc.password = passwordHash.generate(doc.password)
      }

      const users = await reporter.documentStore.collection('users').find({ name: doc.name }, req)

      if (users.length > 0) {
        throw reporter.createError('User already exists', {
          statusCode: 409
        })
      }

      return true
    })
  })

  return {
    async authenticate (username, password) {
      let user

      if (admin.name === username) {
        user = admin
      } else {
        user = await reporter.documentStore.collection('users').findOne({ name: username })
      }

      if (user == null) {
        return {
          valid: false,
          message: 'Invalid password or user does not exist.'
        }
      }

      const validLogin = user.isSuperAdmin ? user.password === password : passwordHash.verify(password, user.password)
      const lockWindowInterval = 5 * 60 * 1000 // 5 minutes is considered the valid range for failed attempts reset
      const failedLoginAttemptsStart = user.failedLoginAttemptsStart || new Date()
      const currentDate = new Date()
      const isInLockWindow = (currentDate - failedLoginAttemptsStart) <= lockWindowInterval
      const failedAttemptsCount = user.failedLoginAttemptsCount || 0

      let newFailedAttemptsCount
      let newFailedLoginAttemptsStart
      let shouldUpdate

      if (isInLockWindow) {
        if (failedAttemptsCount >= maxFailedAttempts) {
          const secondsToWait = Math.round((lockWindowInterval - (currentDate - failedLoginAttemptsStart)) / 1000)

          return {
            valid: false,
            message: `Max attempts to login has been reached (${maxFailedAttempts}), login for this user has been locked for ${secondsToWait} second(s)`,
            status: 403
          }
        }

        newFailedAttemptsCount = validLogin ? failedAttemptsCount : failedAttemptsCount + 1
        newFailedLoginAttemptsStart = failedLoginAttemptsStart
        shouldUpdate = validLogin !== true
      } else {
        shouldUpdate = true
        newFailedAttemptsCount = validLogin ? 0 : 1
        newFailedLoginAttemptsStart = currentDate
      }

      if (shouldUpdate) {
        if (user.isSuperAdmin) {
          user.failedLoginAttemptsCount = newFailedAttemptsCount
          user.failedLoginAttemptsStart = newFailedLoginAttemptsStart
        } else {
          await reporter.documentStore.collection('users').update({
            name: user.name
          }, {
            $set: {
              failedLoginAttemptsCount: newFailedAttemptsCount,
              failedLoginAttemptsStart: newFailedLoginAttemptsStart
            }
          })
        }
      }

      if (validLogin) {
        return { valid: true, user }
      }

      return {
        valid: false,
        message: 'Invalid password or user does not exist.'
      }
    },

    async find (username) {
      const users = await reporter.documentStore.collection('users').find({ name: username })

      if (users.length !== 1) {
        return null
      }

      return users[0]
    },

    async changePassword (currentUser, shortid, oldPassword, newPassword) {
      const userCol = reporter.documentStore.collection('users')
      const targetUsers = await userCol.find({ shortid: shortid })
      const targetUser = targetUsers[0]
      let password = newPassword

      if (targetUser == null) {
        throw reporter.createError('Invalid user', {
          statusCode: 400
        })
      }

      const isTargetUserAdmin = await reporter.authentication.isUserAdmin(targetUser)
      const isCurrentUserAdmin = await reporter.authentication.isUserAdmin(currentUser)

      // admin users can not change password of other admin users, the only exception is that
      // it can change its own password
      if (
        isTargetUserAdmin &&
        isCurrentUserAdmin &&
        (currentUser.isGroup || currentUser.name !== targetUser.name)
      ) {
        throw reporter.createError('Invalid change password action. admin user can not change password of other admin user', {
          statusCode: 400
        })
      }

      let shouldCheckPassword = true

      if (currentUser.isSuperAdmin) {
        shouldCheckPassword = false
      } else if (isCurrentUserAdmin) {
        shouldCheckPassword = currentUser.isGroup ? false : currentUser.name === targetUser.name
      }

      if (shouldCheckPassword && !passwordHash.verify(oldPassword, targetUser.password)) {
        throw reporter.createError('Invalid password', {
          statusCode: 400
        })
      }

      if (!password) {
        throw reporter.createError('password is required', {
          statusCode: 400
        })
      }

      if (typeof password !== 'string') {
        throw reporter.createError('password has an invalid value', {
          statusCode: 400
        })
      }

      password = passwordHash.generate(password)

      return userCol.update({ shortid: shortid }, { $set: { password: password } })
    },

    get maxFailedLoginAttempts () {
      return maxFailedAttempts
    }
  }
}
