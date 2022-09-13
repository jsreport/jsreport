module.exports = function (doc, entitySetName, model) {
  const values = {}
  const entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  const entityType = model.entityTypes[entityTypeName]

  for (const columnName in entityType) {
    const columnType = entityType[columnName]
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
      for (const complexColumnName in columnType.complexType) {
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
