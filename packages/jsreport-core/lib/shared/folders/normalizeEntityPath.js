const path = require('path')

module.exports = function normalizeEntityPath (entityPath, { currentPath }, req) {
  let parentPath = '/'

  if (req && req.context.currentFolderPath) {
    parentPath = req.context.currentFolderPath
  }

  if (currentPath) {
    parentPath = currentPath
  }

  return path.posix.resolve(parentPath, entityPath).replace(/\\/g, '/')
}
