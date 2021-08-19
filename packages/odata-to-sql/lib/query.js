var _ = require('lodash')
var filter = require('./filter')

function getColumns (obj, entitySetName, model) {
  var result = {}
  var entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  var entityType = model.entityTypes[entityTypeName]

  for (var columnName in entityType) {
    var columnType = entityType[columnName]
    if (columnType.isPrimitive) {
      if (obj[columnName] != null) {
        result[columnName] = [columnName]
      }
      continue
    }

    if (obj[columnName] === undefined) {
      continue
    }

    if (columnType.complexType) {
      for (var complexColumnName in columnType.complexType) {
        result[columnName] = result[columnName] || []
        result[columnName].push(columnName + '_' + complexColumnName)
      }

      continue
    }

    result[columnName] = [columnName]
  }

  return result
}

module.exports = function (table, options, entitySetName, model) {
  var query

  options = _.extend({
    $orderBy: {},
    $select: {},
    $filter: {}
  }, options)

  if (options.$inlinecount) {
    query = table.select(table.star().count())
  } else {
    if (Object.getOwnPropertyNames(options.$select).length === 0 || (Object.getOwnPropertyNames(options.$select).length === 1 && options.$select._id)) {
      query = table.select(table.star())
    } else {
      const columns = getColumns(options.$select, entitySetName, model)
      for (var selectKey in options.$select) {
        columns[selectKey].forEach((c) => {
          query = (query || table).select(table[c])
        })
      }
    }
  }

  query = query.from(table)

  var entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  var entityType = model.entityTypes[entityTypeName]

  query = filter(query, table, options.$filter, entityType)

  if (options.$inlinecount) {
    return query.toQuery()
  }

  for (var orderByKey in options.$sort) {
    var column = table[orderByKey]
    query = query.order(column[options.$sort[orderByKey] === -1 ? 'desc' : 'asc'])
  }

  if (options.$limit) {
    query = query.limit(options.$limit)
  }

  if (options.$skip) {
    query = query.offset(options.$skip)
  }

  return query.toQuery()
}
