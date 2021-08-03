// the folders needs to get propagated the visibility permissions
module.exports = async (reporter) => {
  const migrated = await reporter.settings.findValue('authorization-migrated-folders')

  if (migrated) {
    return
  }

  const folders = await reporter.documentStore.collection('folders').find({})

  // multiple levels are always already migrated
  if (folders.some(f => f.folder)) {
    return reporter.settings.addOrSet('authorization-migrated-folders', true)
  }

  for (const f of folders) {
    const finalVisibilityPermissionsSet = new Set()

    for (const es in reporter.documentStore.model.entitySets) {
      const entities = await reporter.documentStore.collection(es).find({
        folder: {
          shortid: f.shortid
        }
      })

      entities.forEach(e => (e.editPermissions || []).forEach(p => finalVisibilityPermissionsSet.add(p)))
      entities.forEach(e => (e.readPermissions || []).forEach(p => finalVisibilityPermissionsSet.add(p)))
      entities.forEach(e => (e.visibilityPermissions || []).forEach(p => finalVisibilityPermissionsSet.add(p)))
    }

    await reporter.documentStore.collection('folders').update({
      _id: f._id
    }, {
      $set: {
        visibilityPermissions: [...finalVisibilityPermissionsSet]
      }
    })
  }

  return reporter.settings.addOrSet('authorization-migrated-folders', true)
}
