function validateReservedName (reporter, c, doc) {
  if (doc.folder) {
    return
  }

  if (!reporter.documentStore.model.entitySets[c].entityTypeDef.name) {
    return
  }

  const name = doc.name

  if (!name) {
    return
  }

  const reservedNames = [
    'storage',
    ...Object.keys(
      reporter.documentStore.model.entitySets
    ).filter((name) => !reporter.documentStore.model.entitySets[name].splitIntoDirectories).map((name) => name.toLowerCase())
  ]

  if (reservedNames.includes(name.toLowerCase())) {
    throw reporter.createError(`The name "${name}" is reserved in the root folder.`, {
      statusCode: 400
    })
  }
}

module.exports = function (reporter) {
  for (const c of Object.keys(reporter.documentStore.collections)) {
    if (!reporter.documentStore.model.entitySets[c].splitIntoDirectories) {
      continue
    }

    reporter.documentStore.collection(c).beforeInsertListeners.add('folders', (doc, req) => validateReservedName(reporter, c, doc))
    reporter.documentStore.collection(c).beforeUpdateListeners.add('folders', async (q, update, opts, req) => {
      if (update.$set && opts && opts.upsert === true) {
        await validateReservedName(reporter, c, update.$set)
      }

      if (!update.$set.name || update.$set.folder) {
        return
      }

      // we need to get folder spec so we need to load them anyway
      const entitiesToUpdate = await reporter.documentStore.collection(c).find(q, req)
      entitiesToUpdate.forEach(e => validateReservedName(reporter, c, Object.assign({}, e, update.$set)))
    })
  }
}

module.exports.validateReservedName = validateReservedName
