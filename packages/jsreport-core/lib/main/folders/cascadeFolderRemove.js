module.exports = (reporter) => {
  reporter.documentStore.collection('folders').beforeRemoveListeners.add('folders', async (q, req) => {
    async function removeInCol (c, folder) {
      const entities = await reporter.documentStore.collection(c).find({
        folder: {
          shortid: folder.shortid
        }
      }, req)

      if (entities.length === 0) {
        return
      }

      return reporter.documentStore.collection(c).remove({
        _id: {
          $in: entities.map(e => e._id)
        }
      }, req)
    }

    const foldersToRemove = await reporter.documentStore.collection('folders').find(q, req)
    const promises = []

    for (const folder of foldersToRemove) {
      for (const c of Object.keys(reporter.documentStore.collections)) {
        if (!reporter.documentStore.model.entitySets[c].entityTypeDef.folder) {
          continue
        }

        promises.push(removeInCol(c, folder))
      }
    }
    return Promise.all(promises)
  })
}
