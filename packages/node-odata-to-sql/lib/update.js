var normalize = require('./normalize')
var filter = require('./filter')

module.exports = function (table, query, update, entitySetName, model) {
  var updateDoc = normalize(update.$set || {}, entitySetName, model)

  if (update.$inc) {
    var inc = normalize(update.$inc, entitySetName, model)

    for (var p in inc) {
      updateDoc[p] = table[p].plus(inc[p])
    }
  }

  var q = table.update(updateDoc)

  if (query) {
    var entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
    var entityType = model.entityTypes[entityTypeName]

    q = filter(q, table, query, entityType)
  }

  return q.toQuery()
}
