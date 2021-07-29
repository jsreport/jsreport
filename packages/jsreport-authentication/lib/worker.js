module.exports = (reporter, definition) => {
  reporter.addRequestContextMetaConfig('user', { sandboxHidden: true })
}
