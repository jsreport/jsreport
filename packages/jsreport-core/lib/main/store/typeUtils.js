
function getType (model, container, typeName, returnNormalizedTypeName) {
  const normalizedTypeName = typeName.replace(model.namespace + '.', '')
  const typeInfo = container[normalizedTypeName]

  if (!typeInfo) {
    return
  }

  if (returnNormalizedTypeName === true) {
    return normalizedTypeName
  }

  return typeInfo
}

function resolvePropDefinition (model, def) {
  const result = {}
  const collectionTypeRegExp = /^Collection\((\S+)\)$/
  const collectionMatchResult = collectionTypeRegExp.exec(def.type)

  if (def.type.startsWith('Edm')) {
    result.def = def
  } else if (collectionMatchResult != null && collectionMatchResult[1] != null) {
    const childType = collectionMatchResult[1]

    if (childType.startsWith('Edm')) {
      result.def = def
      result.subDef = { type: childType }
    } else {
      const subType = getType(model, model.complexTypes, childType)

      if (subType != null) {
        result.def = def
        result.subType = subType
      }
    }
  } else {
    const subType = getType(model, model.complexTypes, def.type)

    if (subType) {
      result.def = def
      result.subType = subType
    }
  }

  if (Object.keys(result).length === 0) {
    return
  }

  return result
}

const edmTypeToJSONSchema = {
  'Edm.String': 'string',
  'Edm.DateTimeOffset': { anyOf: [{ '$jsreport-stringToDate': true }, { '$jsreport-acceptsDate': true }] },
  'Edm.Boolean': 'boolean',
  'Edm.Int16': { type: 'integer', minimum: -32768, maximum: 32767 },
  'Edm.Int32': { type: 'integer', minimum: -2147483648, maximum: 2147483647 },
  'Edm.Double': 'number',
  'Edm.Decimal': 'number',
  'Edm.Binary': { anyOf: [{ type: 'null' }, { type: 'string' }, { '$jsreport-acceptsBuffer': true }] }
}

function typeDefToJSONSchema (model, def) {
  const jsonSchema = { type: 'object', properties: {} }

  if (def == null) {
    return
  }

  if (typeof def !== 'object' || Array.isArray(def)) {
    return
  }

  Object.keys(def).forEach((key) => {
    const propDef = def[key]

    if (propDef == null || propDef.type == null) {
      return
    }

    const extraSchema = propDef.schema

    const resolveResult = resolvePropDefinition(model, propDef)

    if (!resolveResult) {
      return
    }

    const isCollection = resolveResult.def.type.startsWith('Collection(')

    if (resolveResult.subType) {
      jsonSchema.properties[key] = typeDefToJSONSchema(model, resolveResult.subType)
    } else if (
      (isCollection && resolveResult.subType == null) ||
      (resolveResult.def.type.startsWith('Edm') && edmTypeToJSONSchema[resolveResult.def.type] != null)
    ) {
      let targetType = resolveResult.def.type

      if (isCollection && resolveResult.subType == null) {
        targetType = resolveResult.subDef.type
      }

      const value = edmTypeToJSONSchema[targetType]

      if (typeof value === 'string') {
        jsonSchema.properties[key] = { type: value }
      } else {
        jsonSchema.properties[key] = value
      }
    }

    if (isCollection) {
      jsonSchema.properties[key] = {
        type: 'array',
        items: jsonSchema.properties[key]
      }
    }

    if (extraSchema) {
      let originalType = jsonSchema.properties[key].type
      let newType = extraSchema.type

      if (originalType != null && newType != null) {
        if (!Array.isArray(originalType)) {
          originalType = [jsonSchema.properties[key].type]
        }

        if (!Array.isArray(newType)) {
          newType = [newType]
        }

        jsonSchema.properties[key] = {
          ...jsonSchema.properties[key],
          ...extraSchema,
          type: [...originalType, ...newType]
        }
      } else if (newType != null && originalType == null) {
        let newProperties = {}

        if (Array.isArray(jsonSchema.properties[key].anyOf)) {
          newProperties = {
            anyOf: [...jsonSchema.properties[key].anyOf, { type: newType }]
          }
        } else if (Array.isArray(jsonSchema.properties[key].allOf)) {
          newProperties = {
            allOf: [...jsonSchema.properties[key].allOf, { type: newType }]
          }
        } else if (Array.isArray(jsonSchema.properties[key].oneOf)) {
          newProperties = {
            oneOf: [...jsonSchema.properties[key].oneOf, { type: newType }]
          }
        }

        const copyExtraSchema = { ...extraSchema }

        delete copyExtraSchema.type

        jsonSchema.properties[key] = {
          ...jsonSchema.properties[key],
          ...copyExtraSchema,
          ...newProperties
        }
      } else {
        jsonSchema.properties[key] = Object.assign({}, jsonSchema.properties[key], extraSchema)
      }
    }
  })

  if (Object.keys(jsonSchema.properties).length === 0) {
    return
  }

  return jsonSchema
}

module.exports.getType = getType
module.exports.resolvePropDefinition = resolvePropDefinition
module.exports.typeDefToJSONSchema = typeDefToJSONSchema
