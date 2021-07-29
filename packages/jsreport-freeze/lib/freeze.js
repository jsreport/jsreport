
function isAdminUserAuthenticated (req) {
  return req && req.user && req.user.isAdmin
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
    return reporter.settings.findValue('freeze').then(function (freeze) {
      if (isAdminUserAuthenticated() && !definition.options.hardFreeze && !freeze) {
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
      if (key === 'settings' || key === 'tasks' || key === 'reports') {
        return
      }

      hookListeners(key, col, rejectIfAppropriate)
    })
  })
}
