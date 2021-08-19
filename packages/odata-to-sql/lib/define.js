var types = require('./types/types')

function parseType (def, name, model, primitiveTypes) {
  if (primitiveTypes[def.type]) {
    def.isPrimitive = true
    return [{ dataType: primitiveTypes[def.type](def), name: name }]
  }

  if (def.type.indexOf('Collection') === 0) {
    return [{ dataType: primitiveTypes['Edm.String'](def), name: name, isCollection: true }]
  }

  var complexTypeName = def.type.replace(model.namespace + '.', '')
  var complexType = model.complexTypes[complexTypeName]

  def.complexType = complexType

  if (!complexType) {
    throw new Error('Unable to recognize type ' + def.type + ' in ' + name)
  }

  var columns = []
  for (var columnName in complexType) {
    columns = columns.concat(parseType(complexType[columnName], name + '_' + columnName, model, primitiveTypes))
  }

  return columns
}

module.exports = function (model, dialect, prefix) {
  var tables = []
  var primitiveTypes = types(dialect)
  for (var name in model.entityTypes) {
    var table = { name: prefix + name, columns: [] }
    tables.push(table)
    for (var columnName in model.entityTypes[name]) {
      parseType(model.entityTypes[name][columnName], columnName, model, primitiveTypes).forEach(function (t) {
        table.columns.push(t)
      })
    }
  }

  return tables
}
