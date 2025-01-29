const resolveEntityPath = require('../../shared/folders/resolveEntityPath')

async function findEntity (reporter, name, folder, req) {
  async function findEntityInColAndFolder (c, folder) {
    const entities = await reporter.documentStore.collection(c).findAdmin({
      folder
    }, {
      name: 1
    }, req)

    return {
      entities,
      entitySet: c
    }
  }

  const promises = []
  for (const c of Object.keys(reporter.documentStore.collections)) {
    if (!reporter.documentStore.model.entitySets[c].entityTypeDef.name) {
      continue
    }

    if (folder != null && !reporter.documentStore.model.entitySets[c].entityTypeDef.folder) {
      continue
    }

    promises.push(findEntityInColAndFolder(c, folder))
  }

  const results = await Promise.all(promises)

  for (const { entities, entitySet } of results) {
    const existingEntity = entities.find((entity) => {
      if (entity.name) {
        // doing the check for case insensitive string (foo === FOO)
        return entity.name.toLowerCase() === name.toLowerCase()
      }

      return false
    })

    if (existingEntity) {
      return { entity: existingEntity, entitySet }
    }
  }
}

async function validateDuplicatedName (reporter, c, doc, originalIdValue, req) {
  const resolveEntityPathFn = resolveEntityPath(reporter)

  if (!reporter.documentStore.model.entitySets[c].entityTypeDef.name) {
    return
  }

  const name = doc.name

  if (!name) {
    return
  }

  const existingEntity = await findEntity(reporter, name, doc.folder, req)

  if (existingEntity) {
    if (originalIdValue != null && existingEntity.entity._id === originalIdValue) {
      return
    }

    let msg = `Entity with name "${name}" already exists`
    let folder

    if (doc.folder != null) {
      folder = await reporter.documentStore.collection('folders').findOne({
        shortid: doc.folder.shortid
      }, req)

      if (folder) {
        const folderFullPath = await resolveEntityPathFn(folder, 'folders', req)

        msg = `${msg} in the ${folderFullPath} folder.`
      } else {
        msg = `${msg} in the same folder.`
      }
    } else {
      msg = `${msg} at the root level.`
    }

    // prints existing name in message when name are different, this can happen because the name validation
    // is case insensitivity (uppercase and lowercase form are equivalent)
    if (reporter.documentStore.model.entitySets[existingEntity.entitySet].entityTypeDef.name && existingEntity.entity.name !== name) {
      msg = `${msg} existing: "${existingEntity.entity.name}".`
    }

    throw reporter.createError(msg, {
      statusCode: 400,
      weak: true,
      code: 'DUPLICATED_ENTITY',
      existingEntity: existingEntity.entity,
      existingEntityEntitySet: existingEntity.entitySet
    })
  }
}

module.exports = function (reporter) {
  for (const c of Object.keys(reporter.documentStore.collections)) {
    reporter.documentStore.collection(c).beforeInsertListeners.add('unique-name-folders', (doc, req) => validateDuplicatedName(reporter, c, doc, undefined, req))
    reporter.documentStore.collection(c).beforeUpdateListeners.add('unique-name-folders', async (q, update, opts, req) => {
      if (update.$set && opts && opts.upsert === true) {
        await validateDuplicatedName(reporter, c, update.$set, undefined, req)
      }

      // we need to get folder spec so we need to load them anyway
      const entitiesToUpdate = await reporter.documentStore.collection(c).find(q, req)
      return Promise.all(entitiesToUpdate.map(e => validateDuplicatedName(reporter, c, Object.assign({}, e, update.$set), e._id, req)))
    })
  }
}

module.exports.validateDuplicatedName = validateDuplicatedName
