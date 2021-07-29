const resolveFolderFromPath = require('./resolveFolderFromPath')
const resolveEntityFromPath = require('./resolveEntityFromPath')
const resolveEntityPath = require('./resolveEntityPath')

module.exports = (reporter) => {
  return {
    resolveEntityPath: resolveEntityPath(reporter),
    resolveFolderFromPath: resolveFolderFromPath(reporter),
    resolveEntityFromPath: resolveEntityFromPath(reporter)
  }
}
