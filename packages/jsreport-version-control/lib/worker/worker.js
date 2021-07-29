const commit = require('./commitProcess')
const diff = require('./diffProcess')
const applyPatches = require('./applyPatchesProcess')

module.exports = (reporter, definition) => {
  reporter.registerWorkerAction('version-control-diff', (data, req) => {
    return diff(data, reporter, req)
  })

  reporter.registerWorkerAction('version-control-commit', (data, req) => {
    return commit(data, reporter, req)
  })

  reporter.registerWorkerAction('version-control-apply-patches', (data, req) => {
    return applyPatches(data, reporter, req)
  })
}
