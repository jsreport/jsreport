module.exports = (reporter, definition) => {
  reporter.addRequestContextMetaConfig('user', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('isAdminCache', { sandboxHidden: true })
}
