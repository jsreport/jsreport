
module.exports = (reporter) => {
  reporter.initializeListeners.add('core-validate-shortid', () => {
    for (const c of Object.keys(reporter.documentStore.collections)) {
      const es = reporter.documentStore.model.entitySets[c]
      const et = reporter.documentStore.model.entityTypes[es.entityType.substring('jsreport.'.length)]

      if (!et.shortid) {
        return
      }

      reporter.documentStore.collection(c).beforeInsertListeners.add('validate-shortid', (doc, req) => {
        return validateShortid(reporter, c, doc, undefined, req)
      })

      reporter.documentStore.collection(c).beforeUpdateListeners.add('validate-shortid', async (q, update, opts, req) => {
        if (update.$set && opts && opts.upsert === true) {
          await validateShortid(reporter, c, update.$set, undefined, req)
        }

        if (typeof update.$set.shortid === 'undefined') {
          return
        }

        const entitiesToUpdate = await reporter.documentStore.collection(c).find(q, req)
        return Promise.all(entitiesToUpdate.map(e => validateShortid(reporter, c, Object.assign({}, e, update.$set), e._id, req)))
      })
    }
  })
}

async function validateShortid (reporter, collectionName, doc, originalIdValue, req) {
  if (req != null && req.context.skipValidationFor === doc) {
    return
  }

  const shortid = doc.shortid

  if (!shortid) {
    throw reporter.createError('Entity shortid property can not be empty', {
      statusCode: 400
    })
  }

  const existingEntity = await findEntity(reporter, collectionName, shortid, req)

  if (existingEntity) {
    if (originalIdValue != null && existingEntity._id === originalIdValue) {
      return
    }

    throw reporter.createError(`Entity with shortid "${shortid}" already exists.`, {
      statusCode: 400,
      code: 'DUPLICATED_ENTITY',
      existingEntity,
      existingEntityEntitySet: collectionName
    })
  }
}

async function findEntity (reporter, collectionName, shortid, req) {
  // we should validate without caring about permissions
  const existingEntity = await reporter.documentStore.collection(collectionName).findOneAdmin({
    shortid
  }, req)

  return existingEntity
}
