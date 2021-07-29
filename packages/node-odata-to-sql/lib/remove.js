const filter = require('./filter')

module.exports = function (table, query, entitySetName, model) {
  const entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  const entityType = model.entityTypes[entityTypeName]

  return filter(table.delete(), table, query, entityType).toQuery()
}
