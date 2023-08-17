
async function isAdminUserAuthenticated (reporter, req) {
  if (reporter.authentication == null) {
    return false
  }

  const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

  return req && req.user && isAdmin
}

function hookListeners (colName, col, rejectIfAppropriate) {
  col.beforeUpdateListeners.insert(0, 'freeze', col, (query, update, req) => {
    // allow updating schedule.state => the scheduler extension works in the freeze mode
    // but user cannot update any of the schedules properties
    if (colName === 'schedules' && update.$set.state && Object.keys(update.$set).length === 1) {
      return
    }

    return rejectIfAppropriate(req)
  })

  col.beforeInsertListeners.insert(0, 'freeze', col, (doc, req) => rejectIfAppropriate(req))
  col.beforeRemoveListeners.insert(0, 'freeze', col, (query, req) => rejectIfAppropriate(req))
}

module.exports = (reporter, definition) => {
  function rejectIfAppropriate (req) {
    const freeze = req?.context?._cachedFreeze != null ? req.context._cachedFreeze : reporter.settings.findValue('freeze')
    return Promise.all([
      freeze,
      isAdminUserAuthenticated(reporter, req)
    ]).then(function ([freeze, isAdmin]) {
      if (req?.context) {
        req.context._cachedFreeze = freeze != null && freeze
      }

      if (isAdmin && !definition.options.hardFreeze && !freeze) {
        return
      }

      if (!definition.options.hardFreeze && !freeze) {
        return
      }

      throw reporter.createError('Editing is frozen through jsreport-freeze extension.', {
        statusCode: 403
      })
    })
  }

  reporter.initializeListeners.add(definition.name, () => {
    Object.entries(reporter.documentStore.collections).forEach(([key, col]) => {
      if (key === 'settings' || key === 'tasks' || key === 'profiles' || key === 'monitoring' || key === 'reports') {
        return
      }

      hookListeners(key, col, rejectIfAppropriate)
    })
  })
}
