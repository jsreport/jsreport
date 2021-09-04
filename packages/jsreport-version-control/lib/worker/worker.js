module.exports = (reporter, definition) => {
  reporter.registerWorkerAction('version-control-diff', (data, req) => {
    return require('./diffProcess')(data, reporter, req)
  })

  reporter.registerWorkerAction('version-control-commit', (data, req) => {
    return require('./commitProcess')(data, reporter, req)
  })

  reporter.registerWorkerAction('version-control-apply-patches', (data, req) => {
    return require('./applyPatchesProcess')(data, reporter, req)
  })
}
