const _ = require('lodash')
const filter = require('./filter')

function getColumns (obj, entitySetName, model) {
  const result = {}
  const entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  const entityType = model.entityTypes[entityTypeName]

  for (const columnName in entityType) {
    const columnType = entityType[columnName]
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
      for (const complexColumnName in columnType.complexType) {
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
  let query

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
      for (const selectKey in options.$select) {
        columns[selectKey].forEach((c) => {
          query = (query || table).select(table[c])
        })
      }
    }
  }

  query = query.from(table)

  const entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  const entityType = model.entityTypes[entityTypeName]

  query = filter(query, table, options.$filter, entityType)

  if (options.$inlinecount) {
    return query.toQuery()
  }

  for (const orderByKey in options.$sort) {
    const column = table[orderByKey]
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
