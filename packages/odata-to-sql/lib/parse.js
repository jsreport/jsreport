module.exports = function (doc, entitySetName, model) {
  var parsedDoc = {}
  var entityTypeName = model.entitySets[entitySetName].entityType.replace(model.namespace + '.', '')
  var entityType = model.entityTypes[entityTypeName]

  for (var propertyName in entityType) {
    var propertyType = entityType[propertyName]

    if (propertyType.isPrimitive) {
      if (doc[propertyName] != null) {
        parsedDoc[propertyName] = doc[propertyName]
      }
      continue
    }

    if (propertyType.complexType) {
      parsedDoc[propertyName] = {}

      for (var complexColumnName in propertyType.complexType) {
        if (doc[propertyName + '_' + complexColumnName] != null) {
          if (propertyType.complexType[complexColumnName].isPrimitive) {
            parsedDoc[propertyName][complexColumnName] = doc[propertyName + '_' + complexColumnName]
          } else {
            parsedDoc[propertyName][complexColumnName] = JSON.parse(doc[propertyName + '_' + complexColumnName])
          }
        }
      }

      if (Object.getOwnPropertyNames(parsedDoc[propertyName]).length === 0) {
        delete parsedDoc[propertyName]
      }

      continue
    }

    if (doc[propertyName] != null) {
      parsedDoc[propertyName] = JSON.parse(doc[propertyName])
    }
  }

  return parsedDoc
}
