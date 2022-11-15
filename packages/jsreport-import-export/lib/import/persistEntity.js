
module.exports = async function persistEntity (reporter, entity, info, req) {
  const col = reporter.documentStore.collection(info.collectionName)
  const action = info.action

  try {
    if (action === 'delete') {
      if (info.entityId == null) {
        throw new Error('Original entity id not available')
      }

      await col.remove({ _id: info.entityId }, req)
    } else if (action === 'update') {
      if (info.entityId == null) {
        throw new Error('Original entity id not available')
      }

      // do copy of entity because we don't want the original obj to be mutated
      await col.update({ _id: info.entityId }, { $set: { ...entity } }, req)

      const newEntity = await col.findOneAdmin({ _id: info.entityId }, req)

      return newEntity
    } else if (action === 'insert') {
      // do copy of entity because we don't want the original obj to be mutated
      const newEntity = await col.insert({ ...entity }, req)

      return newEntity
    } else {
      throw new Error(`Action "${action}" not implemented`)
    }
  } catch (e) {
    const log = `Unable to ${action} an entity (${info.collectionName}) "${info.entityNameDisplay}" during the import: ${e}`

    // this skips error with missing permissions or any other error during the query
    reporter.logger.warn(log)
    info.logs.push(log)

    e.message = log

    throw e
  }
}
