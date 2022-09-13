const normalize = require('./normalize')
const filter = require('./filter')

module.exports = function (table, query, update, entitySetName, model) {
  const updateDoc = normalize(update.$set || {}, entitySetName, model)

  if (update.$inc) {
    const inc = normalize(update.$inc, entitySetName, model)

    for (const p in inc) {
      updateDoc[p] = table[p].plus(inc[p])
    }
  }

  let q = table.update(updateDoc)

  if (query) {
    const entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
    const entityType = model.entityTypes[entityTypeName]

    q = filter(q, table, query, entityType)
  }

  return q.toQuery()
}
