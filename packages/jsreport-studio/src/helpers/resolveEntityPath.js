
function resolveEntityPath (entity, foldersByShortid) {
  if (!entity) {
    return
  }

  const pathFragments = [entity.name]

  while (entity.folder) {
    const folder = foldersByShortid[entity.folder.shortid]

    if (folder == null) {
      throw new Error(`Unable to find entity with shortid ${entity.folder.shortid}`)
    }

    pathFragments.push(folder.name)
    entity = folder
  }

  return '/' + pathFragments.reverse().join('/')
}

export default resolveEntityPath
