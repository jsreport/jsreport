const types = require('./types/types')

function parseType (def, name, model, primitiveTypes) {
  if (primitiveTypes[def.type]) {
    def.isPrimitive = true
    return [{ dataType: primitiveTypes[def.type](def), name: name, index: def.index }]
  }

  if (def.type.indexOf('Collection') === 0) {
    return [{ dataType: primitiveTypes['Edm.String'](def), name: name, isCollection: true }]
  }

  const complexTypeName = def.type.replace(model.namespace + '.', '')
  const complexType = model.complexTypes[complexTypeName]

  def.complexType = complexType

  if (!complexType) {
    throw new Error('Unable to recognize type ' + def.type + ' in ' + name)
  }

  let columns = []
  for (const columnName in complexType) {
    columns = columns.concat(parseType(complexType[columnName], name + '_' + columnName, model, primitiveTypes))
  }

  return columns
}

module.exports = function (model, dialect, prefix) {
  const tables = []
  const primitiveTypes = types(dialect)
  for (const name in model.entityTypes) {
    const table = { name: prefix + name, columns: [], indexes: [] }
    tables.push(table)
    for (const columnName in model.entityTypes[name]) {
      for (const c of parseType(model.entityTypes[name][columnName], columnName, model, primitiveTypes)) {
        table.columns.push(c)

        if (c.index) {
          table.indexes.push({
            name: `idx_${name}_${c.name}`,
            on: c.name
          })
        }
      }
    }
  }

  return tables
}
