const normalizeEntityPath = require('./normalizeEntityPath')

module.exports = (reporter) => async (entityPathParam, req) => {
  const entityPath = normalizeEntityPath(entityPathParam, {}, req)
  const fragments = entityPath.split('/').filter(s => s)
  let found = false
  let currentFolder = null

  for (const f of fragments) {
    if (found) {
      currentFolder = null
      break
    }

    const query = {
      name: f
    }

    if (currentFolder) {
      query.folder = { shortid: currentFolder.shortid }
    } else {
      query.folder = null
    }

    const folder = await reporter.documentStore.collection('folders').findOne(query, req)

    if (!folder) {
      found = true
      // we don't know from path /a/b if b is template or folder,
      // so if folder is not found, we assume it was other entity and continue
      continue
    }

    currentFolder = folder
  }

  return currentFolder
}
