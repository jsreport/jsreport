var define = require('./define')
var insert = require('./insert')
var query = require('./query')
var count = require('./count')
var upd = require('./update')
var remove = require('./remove')
var parse = require('./parse')
var sql = require('jsreport-sql-2')

module.exports = function (model, dialect, prefix, schema) {
  prefix = prefix || ''
  sql.setDialect(dialect)

  var tableList = define(model, dialect, prefix).map(function (t) {
    if (schema) {
      t.schema = schema
    }

    return sql.define(t)
  })

  var tables = {}
  for (var entitySetName in model.entitySets) {
    tables[entitySetName] = tableList.filter(function (t) {
      return t._name === (prefix + model.entitySets[entitySetName].entityType.replace(model.namespace + '.', ''))
    })[0]
  }

  return {
    create: function () {
      return tableList.map(function (t) {
        return t.create().ifNotExists().toQuery()
      })
    },
    drop: function () {
      return tableList.map(function (t) {
        return t.drop().toQuery()
      })
    },
    insert: function (entitySetName, doc) {
      doc = insert(doc, entitySetName, model)

      return tables[entitySetName].insert(doc).toQuery()
    },
    query: function (entitySetName, mongoOptions) {
      return query(tables[entitySetName], mongoOptions, entitySetName, model)
    },
    count: function (entitySetName, mongoOptions) {
      return count(tables[entitySetName], mongoOptions)
    },
    parse: function (entitySetName, doc) {
      return parse(doc, entitySetName, model)
    },
    update: function (entitySetName, query, update) {
      return upd(tables[entitySetName], query, update, entitySetName, model)
    },
    delete: function (entitySetName, query) {
      return remove(tables[entitySetName], query, entitySetName, model)
    }
  }
}
