const _ = require('lodash')
const filter = require('./filter')

module.exports = function (table, options, entitySetName, model) {
  let query

  options = _.extend({
    $orderBy: {},
    $select: {},
    $filter: {}
  }, options)

  query = table.select(table.star().count())
  query = query.from(table)

  const entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  const entityType = model.entityTypes[entityTypeName]

  query = filter(query, table, options.$filter, entityType)

  return query.toQuery()
}
