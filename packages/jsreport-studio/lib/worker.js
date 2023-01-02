
module.exports = (reporter, definition) => {
  reporter.addRequestContextMetaConfig('htmlTitle', { sandboxReadOnly: true })

  reporter.registerWorkerAction('text-matches', (data, req) => {
    return require('./textMatches')(data, reporter, req)
  })
}
