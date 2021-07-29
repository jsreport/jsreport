module.exports = (reporter, definition) => {
  // TODO shouldn't this run in the main? so it doesn't need to run in every worker every time it restarts
  reporter.addRequestContextMetaConfig('skipAuthorization', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('skipAuthorizationForUpdate', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('skipAuthorizationForInsert', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('skipAuthorizationForQuery', { sandboxHidden: true })
}
