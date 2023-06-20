const extend = require('node.extend.without.arrays')

module.exports = (reporter) => ({
  assertInsert (col, doc, req) {
    if (!req || req.context.skipAuthorizationForInsert === doc) {
      return
    }
    return check(reporter, col, req, () => authorizeInsert(doc, col, req))
  },

  assertUpdate (col, q, u, opts, req) {
    if (!req || req.context.skipAuthorizationForUpdate === q) {
      return
    }

    return check(reporter, col, req, () => authorizeUpdate(q, u, col, req))
  },

  assertRemove (col, q, req) {
    return check(reporter, col, req, () => authorizeRemove(q, col, req))
  }
})

async function check (reporter, collection, req, authAction) {
  const fn = async () => {
    if (!req) {
      return true
    }

    const defaultAuthResult = await defaultAuth(reporter, collection, req)

    if (defaultAuthResult === true) {
      return true
    }
    if (defaultAuthResult === false) {
      return false
    }

    return authAction()
  }

  const res = await fn()

  if (res !== true) {
    if (req.context.user) {
      reporter.logger.warn(`User ${req.context.user.name} not authorized for ${collection.entitySet}`)
    }

    throw reporter.authorization.createAuthorizationError(collection.entitySet)
  }
}

async function defaultAuth (reporter, collection, req) {
  if (collection.name === 'settings' || collection.name === 'profiles' || collection.name === 'monitoring') {
    return true
  }

  if (req.context.skipAuthorization) {
    return true
  }

  if (!req) { // background jobs
    return true
  }

  if (!req.context.user) {
    return true
  }

  const isAdmin = await reporter.authentication.isUserAdmin(req.context.user, req)

  if (isAdmin) {
    return true
  }

  if (req.context.user.editAllPermissions) {
    return true
  }

  return null
}

async function authorizeUpdate (query, update, collection, req) {
  const items = await findWithoutPermissions(collection, query, req)

  let result = true
  items.forEach((entity) => {
    if (collection.name === 'users' && (entity._id && entity._id !== req.context.user._id.toString())) {
      result = false
    }

    if (collection.name === 'users' && (entity._id && entity._id === req.context.user._id.toString())) {
      result = true
    } else {
      if (result) {
        result = checkPermissions(entity, req)
      }
    }
  })

  return result
}

async function authorizeRemove (query, collection, req) {
  const items = await findWithoutPermissions(collection, query, req)

  let result = true
  items.forEach((entity) => {
    if (result) {
      result = checkPermissions(entity, req)
    }
  })

  return result
}

async function authorizeInsert (doc, collection, req) {
  if (doc.folder == null) {
    // entities at root should both check for edit and
    // inheritedEdit permissions
    return checkPermissions(doc, req)
  }

  return (
    (doc.inheritedEditPermissions || []).some((p) => p === req.context.user._id.toString())
  )
}

function checkPermissions (entity, req) {
  return (
    (entity.editPermissions || []).some((p) => p === req.context.user._id.toString()) ||
    (entity.inheritedEditPermissions || []).some((p) => p === req.context.user._id.toString())
  )
}

async function findWithoutPermissions (collection, query, req) {
  const q = extend(true, {}, query)
  req.context.skipAuthorization = true

  // the query can already contain permissions filter, because it was used
  // for some other validations before without deep clone
  // that is likely wrong usage, but to be safe we rather filter permissions
  // manually
  if (q.$or) {
    q.$or = q.$or.filter(e => (
      !e.readPermissions &&
      !e.editPermissions &&
      !e.readPermissionsGroup &&
      !e.editPermissionsGroup &&
      !e.inheritedReadPermissions &&
      !e.inheritedEditPermissions &&
      !e.visibilityPermissions
    ))

    if (q.$or.length === 0) {
      delete q.$or
    }
  }
  if (q.$and) {
    q.$and = q.$and.filter(e => !e.$or || !e.$or.some(ee => ee.editPermissions || ee.readPermissions))
    if (q.$and.length === 0) {
      delete q.$and
    }
  }

  const items = await collection.find(q, req)
  req.context.skipAuthorization = false
  return items
}
