module.exports = function (doc, entitySetName, model) {
  var values = {}
  var entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  var entityType = model.entityTypes[entityTypeName]

  for (var columnName in entityType) {
    var columnType = entityType[columnName]
    if (columnType.isPrimitive) {
      if (doc[columnName] != null) {
        values[columnName] = doc[columnName]
      }
      continue
    }

    if (doc[columnName] === undefined) {
      continue
    }

    if (columnType.complexType) {
      for (var complexColumnName in columnType.complexType) {
        if (columnType.complexType[complexColumnName].isPrimitive) {
          values[columnName + '_' + complexColumnName] = doc[columnName] != null ? doc[columnName][complexColumnName] : null
        } else {
          if (doc[columnName][complexColumnName] != null) {
            values[columnName + '_' + complexColumnName] = doc[columnName] != null ? JSON.stringify(doc[columnName][complexColumnName]) : null
          }
        }
      }

      continue
    }

    values[columnName] = doc[columnName] != null ? JSON.stringify(doc[columnName]) : null
  }

  return values
}
