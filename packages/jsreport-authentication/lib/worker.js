module.exports = (reporter, definition) => {
  reporter.addRequestContextMetaConfig('user', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('user.name', { sandboxReadOnly: true })
  reporter.addRequestContextMetaConfig('user.isAdmin', { sandboxReadOnly: true })
  reporter.addRequestContextMetaConfig('user.isSuperAdmin', { sandboxReadOnly: true })
  reporter.addRequestContextMetaConfig('user.isGroup', { sandboxReadOnly: true })
  reporter.addRequestContextMetaConfig('isAdminCache', { sandboxHidden: true })
}
