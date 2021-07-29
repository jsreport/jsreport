const { resolvePropDefinition } = require('./typeUtils')

function findReferencePropertiesInType (model, type, parentProps = []) {
  const properties = []

  for (const [propName, propDef] of Object.entries(type)) {
    const currentFullProps = [...parentProps, propName]
    const result = resolvePropDefinition(model, propDef)

    if (!result) {
      continue
    }

    if (result.subType) {
      const subProperties = findReferencePropertiesInType(model, result.subType, currentFullProps)
      properties.push(...subProperties)
      continue
    }

    if (result.def.referenceTo != null) {
      properties.push({
        name: currentFullProps.join('.'),
        referenceTo: result.def.referenceTo
      })
    }
  }

  return properties
}

function findPropertiesForCollectionReference (store, collectionReferenceOriginName, collectionReferenceTargetName) {
  const properties = []

  for (const prop of store.model.entitySets[collectionReferenceOriginName].referenceProperties) {
    if (prop.referenceTo === collectionReferenceTargetName) {
      properties.push(prop.name)
    }
  }

  return properties
}

function findLinkedEntitiesForReferenceValue (store, entitiesByCollection, collectionReferenceTargetName, referenceValue) {
  const linkedEntities = []
  const targetCollections = []

  for (const property of store.model.entitySets[collectionReferenceTargetName].linkedReferenceProperties) {
    if (!targetCollections.includes(property.entitySet)) {
      targetCollections.push(property.entitySet)
    }
  }

  for (const colName of targetCollections) {
    const entitiesInCollection = entitiesByCollection[colName] || []

    for (const entity of entitiesInCollection) {
      const properties = existsReferenceValue(store, colName, entity, collectionReferenceTargetName, referenceValue)

      if (properties) {
        linkedEntities.push({
          properties,
          entity
        })
      }
    }
  }

  return linkedEntities
}

function existsReferenceValue (store, collectionReferenceOriginName, entity, collectionReferenceTargetName, referenceValue) {
  let exists = false
  const propertiesToCheck = findPropertiesForCollectionReference(store, collectionReferenceOriginName, collectionReferenceTargetName)

  const properties = []

  for (const propName of propertiesToCheck) {
    const entityType = store.model.entitySets[collectionReferenceOriginName].entityTypeDef

    const propParts = propName.split('.')

    exists = existsReferenceInProperty(store, entityType, entity, referenceValue, propParts)

    if (exists) {
      properties.push(propName)
    }
  }

  if (properties.length === 0) {
    return
  }

  return properties
}

function existsReferenceInProperty (store, type, obj, referenceValue, propsToEvaluate) {
  if (obj == null || propsToEvaluate.length === 0) {
    return false
  }

  const currentPropName = propsToEvaluate[0]
  const restProps = propsToEvaluate.slice(1)
  const currentPropDef = type[currentPropName]
  const currentPropValue = obj[currentPropName]

  if (currentPropValue == null || currentPropDef == null) {
    return false
  }

  const resolveResult = store.resolvePropertyDefinition(currentPropDef)

  if (resolveResult.subType && resolveResult.def.type.startsWith('Collection(')) {
    if (!Array.isArray(currentPropValue)) {
      return false
    }

    return currentPropValue.some((val) => {
      return existsReferenceInProperty(store, resolveResult.subType, val, referenceValue, restProps)
    })
  } else if (resolveResult.def.type.startsWith('Collection(') && resolveResult.subType == null) {
    if (restProps.length > 0) {
      return false
    }

    if (!Array.isArray(currentPropValue)) {
      return false
    }

    return currentPropValue.some((val) => val === referenceValue)
  } else if (resolveResult.subType) {
    return existsReferenceInProperty(store, resolveResult.subType, currentPropValue, referenceValue, restProps)
  }

  if (restProps.length > 0) {
    return false
  }

  return currentPropValue === referenceValue
}

function updateReferenceValue (store, collectionReferenceOriginName, entity, collectionReferenceTargetName, referenceOpts, newReferenceValue) {
  if (!referenceOpts) {
    throw new Error('reference options is required')
  }

  // the update has some cases that depends on the presence of the options:
  // - when you pass referenceValue but no referenceProp, the newReferenceValye will ONLY be updated if the detected linked properties contain value equal to referenceValue
  // - when you pass referenceProp but no referenceValue, the newReferenceValue will be set in referenceProp of entity
  // - when you pass both referenceProp and referenceValue, the newReferenceValye will ONLY be updated if the referenceProp contain value equal to referenceValue
  const { referenceProp, referenceValue } = referenceOpts

  if (!referenceProp && !referenceValue) {
    throw new Error('reference options needs either .referenceProp or .referenceValue value to be present')
  }

  const propertiesToCheck = findPropertiesForCollectionReference(store, collectionReferenceOriginName, collectionReferenceTargetName)

  for (const propName of propertiesToCheck) {
    if (referenceProp != null && referenceProp !== propName) {
      continue
    }

    const entityType = store.model.entitySets[collectionReferenceOriginName].entityTypeDef

    const propParts = propName.split('.')

    updateReferenceInProperty(store, entityType, entity, referenceValue, newReferenceValue, propParts)
  }
}

function updateReferenceInProperty (store, type, obj, referenceValue, newReferenceValue, propsToEvaluate) {
  const currentPropName = propsToEvaluate[0]
  const restProps = propsToEvaluate.slice(1)
  const currentPropDef = type[currentPropName]
  const currentPropValue = obj[currentPropName]

  if (currentPropDef == null) {
    return
  }

  const resolveResult = store.resolvePropertyDefinition(currentPropDef)

  if (resolveResult.subType && resolveResult.def.type.startsWith('Collection(')) {
    if (restProps.length === 0) {
      return
    }

    if (!Array.isArray(currentPropValue)) {
      obj[currentPropName] = []
    }

    if (obj[currentPropName].length === 0) {
      const newItem = {}
      obj[currentPropName].push(newItem)
      updateReferenceInProperty(store, resolveResult.subType, newItem, undefined, newReferenceValue, restProps)
    } else {
      const exists = obj[currentPropName].some((val) => {
        return existsReferenceInProperty(store, resolveResult.subType, val, referenceValue, restProps)
      })

      if (exists) {
        obj[currentPropName].forEach((val, idx) => {
          obj[currentPropName][idx] = val || {}
          return updateReferenceInProperty(store, resolveResult.subType, obj[currentPropName][idx], referenceValue, newReferenceValue, restProps)
        })
      } else {
        const newItem = {}
        obj[currentPropName].push(newItem)
        updateReferenceInProperty(store, resolveResult.subType, newItem, undefined, newReferenceValue, restProps)
      }
    }
  } else if (resolveResult.def.type.startsWith('Collection(') && resolveResult.subType == null) {
    if (restProps.length > 0) {
      return
    }

    if (!Array.isArray(currentPropValue)) {
      obj[currentPropName] = []
    }

    if (referenceValue != null && obj[currentPropName].includes(referenceValue)) {
      obj[currentPropName].forEach((val, idx) => {
        if (val === referenceValue) {
          obj[currentPropName][idx] = newReferenceValue
        }
      })
    } else {
      obj[currentPropName].push(newReferenceValue)
    }
  } else if (resolveResult.subType) {
    obj[currentPropName] = obj[currentPropName] || {}
    return updateReferenceInProperty(store, resolveResult.subType, obj[currentPropName], referenceValue, newReferenceValue, restProps)
  }

  if (restProps.length > 0) {
    return
  }

  if (referenceValue != null) {
    if (obj[currentPropName] === referenceValue) {
      obj[currentPropName] = newReferenceValue
    }
  } else {
    obj[currentPropName] = newReferenceValue
  }
}

module.exports.findReferencePropertiesInType = findReferencePropertiesInType
module.exports.findLinkedEntitiesForReferenceValue = findLinkedEntitiesForReferenceValue
module.exports.existsReferenceValue = existsReferenceValue
module.exports.updateReferenceValue = updateReferenceValue
