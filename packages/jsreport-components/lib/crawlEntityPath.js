/**
 * Starting from a given entity and a relative path, finds the target entity.
 */
module.exports = function crawlEntityPath (entities, path, startingEntity) {
  const byShortid = Object.fromEntries(
    entities.filter(e => e.shortid).map(e => [e.shortid, e])
  )

  let folderShortid = startingEntity?.folder?.shortid ?? null
  let rootEntity = startingEntity && !startingEntity.folder ? startingEntity : null

  // Absolute path resets context
  if (path.startsWith('/')) {
    folderShortid = null
    rootEntity = null
    path = path.slice(1)
  }

  // Split, keep empty segments to detect trailing slash, but ignore '.' segments
  const parts = path.split('/').filter(seg => seg !== '.')

  // If last segment is empty, it's a trailing slash (should only match folders)
  if (parts.length === 0 || parts.at(-1) === '') {
    return null
  }

  for (const part of parts.slice(0, -1)) {
    if (part === '') continue // ignore redundant slashes
    if (part === '..') {
      if (!folderShortid && !rootEntity) {
        // Stay at root if already at root and going up
        continue
      }
      if (folderShortid) {
        const folder = byShortid[folderShortid]
        if (!folder) return null
        folderShortid = folder.folder?.shortid ?? null
        if (!folderShortid) rootEntity = null
      } else {
        rootEntity = null
      }
    } else {
      const subfolder = entities.find(
        e =>
          e.__entitySet === 'folders' &&
          eqName(e.name, part) &&
          ((folderShortid == null && !e.folder) ||
            e.folder?.shortid === folderShortid)
      )
      if (!subfolder) return null
      folderShortid = subfolder.shortid
      rootEntity = null
    }
  }

  const name = parts.at(-1)
  const found = entities.find(e =>
    folderShortid
      ? eqName(e.name, name) && e.folder?.shortid === folderShortid
      : eqName(e.name, name) && !e.folder?.shortid
  )

  return found && found.__entitySet !== 'folders' ? found : null
}

// Helper for case-insensitive name comparison
function eqName (a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()
}
