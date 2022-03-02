
module.exports = (reporter) => {
  reporter.initializeListeners.add('core-validate-id', () => {
    for (const c of Object.keys(reporter.documentStore.collections)) {
      reporter.documentStore.collection(c).beforeInsertListeners.add('validate-id', (doc, req) => {
        if (req == null || req.context.skipValidationFor !== doc) {
          return validateIdForStoreChange(reporter, c, doc._id, undefined, req)
        }
      })

      reporter.documentStore.collection(c).beforeUpdateListeners.add('validate-id', async (q, update, opts, req) => {
        if (req != null && req.context.skipValidationFor === update) {
          return
        }

        if (update.$set && opts && opts.upsert === true) {
          await validateIdForStoreChange(reporter, c, update.$set._id, undefined, req)
        }

        if (!update.$set._id) {
          return
        }

        const entitiesToUpdate = await reporter.documentStore.collection(c).find(q, req)

        return Promise.all(entitiesToUpdate.map(e => validateIdForStoreChange(reporter, c, Object.assign({}, e, update.$set)._id, e._id, req)))
      })
    }
  })
}

async function validateIdForStoreChange (reporter, collectionName, idValue, originalIdValue, req) {
  const existingEntity = await reporter.documentStore.checkDuplicatedId(collectionName, idValue, req)

  if (!existingEntity) {
    return
  }

  if (originalIdValue != null && existingEntity._id === originalIdValue) {
    return
  }

  throw reporter.createError(`Entity with _id "${idValue}" already exists.`, {
    statusCode: 400,
    code: 'DUPLICATED_ENTITY',
    existingEntity,
    existingEntityEntitySet: collectionName
  })
}
