module.exports = (reporter) => {
  reporter.documentStore.collection('folders').beforeRemoveListeners.add('folders', async (q, req) => {
    const foldersToRemove = await reporter.documentStore.collection('folders').find(q, req)

    for (const folder of foldersToRemove) {
      for (const c of Object.keys(reporter.documentStore.collections)) {
        const entities = await reporter.documentStore.collection(c).find({
          folder: {
            shortid: folder.shortid
          }
        }, req)

        if (entities.length === 0) {
          continue
        }

        for (const e of entities) {
          await reporter.documentStore.collection(c).remove({
            _id: e._id
          }, req)
        }
      }
    }
  })
}
