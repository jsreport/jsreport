const { resolvePropDefinition } = require('./typeUtils')
const adminRequest = require('../../shared/adminRequest')
const createListenerCollection = require('../../shared/listenerCollection')
const createError = require('../../shared/createError')
const Request = require('../../shared/request')
const validateEntityName = require('../validateEntityName')

module.exports = (entitySet, provider, model, validator, encryption, transactions) => ({
  name: entitySet,
  beforeFindListeners: createListenerCollection(`DocumentStoreCollection(${entitySet})@beforeFind`),
  beforeUpdateListeners: createListenerCollection(`DocumentStoreCollection(${entitySet})@beforeUpdate`),
  beforeInsertListeners: createListenerCollection(`DocumentStoreCollection(${entitySet})@beforeInsert`),
  beforeRemoveListeners: createListenerCollection(`DocumentStoreCollection(${entitySet})@beforeRemove`),
  beforeUpdateValidationListeners: createListenerCollection(`DocumentStoreCollection(${entitySet})@beforeUpdateValidation`),
  beforeInsertValidationListeners: createListenerCollection(`DocumentStoreCollection(${entitySet})@beforeInsertValidation`),
  entitySet,

  load: (...args) => {
    provider.load(entitySet, ...args)
  },

  find (q, p, req) {
    if (p && p.__isJsreportRequest__ === true) {
      req = p
      p = {}
    }

    p = p || {}

    const listenerPromise = this.beforeFindListeners.fire(q, p, req)

    // the jsreport back-compatible API for find returns promise with the result array
    // the new API returns a cursor like mongo uses
    // to make it working for both way of calling, we return
    // an object which is a promise and in the same time a cursor
    const cursorCalls = []
    const functions = ['skip', 'limit', 'sort', 'toArray', 'count']
    const fakeCursor = {}
    functions.forEach((f) => {
      fakeCursor[f] = (...args) => {
        cursorCalls.push({ f: f, args: args })
        return fakeCursor
      }
    })

    const replay = (cursor) => {
      cursorCalls.filter((c) => c.f !== 'toArray' && c.f !== 'count').forEach((c) => cursor[c.f].apply(cursor, c.args))

      if (cursorCalls.find((c) => c.f === 'count')) {
        return cursor.count()
      }

      return cursor.toArray()
    }

    return Object.assign(fakeCursor, {
      then: (onFulfilled, onRejected) => {
        // the node A compatible promise expects then to be called with two functions
        let promise = listenerPromise.then(() => {
          return replay(provider.find(entitySet, q, p, {
            transaction: transactions.getActiveTransaction(req)
          }))
        })

        // the node A compatible promise expects then to be called with two functions
        if (typeof onFulfilled === 'function') {
          promise = promise.then(onFulfilled)
        }

        if (typeof onRejected === 'function') {
          promise = promise.catch(onRejected)
        }

        return promise
      }
    })
  },

  findAdmin (q, p, req) {
    if (p && p.__isJsreportRequest__ === true) {
      req = p
      p = {}
    }

    p = p || {}

    req = adminRequest(req, Request)

    return this.find(q, p, req)
  },

  async findOne (...args) {
    const res = await this.find(...args)
    if (res.length > 0) {
      return res[0]
    }

    return null
  },

  findOneAdmin (q, p, req) {
    if (p && p.__isJsreportRequest__ === true) {
      req = p
      p = {}
    }

    p = p || {}

    req = adminRequest(req, Request)

    return this.findOne(q, p, req)
  },

  count (...args) {
    return this.find(...args).count()
  },

  async insert (data, req) {
    await this.beforeInsertValidationListeners.fire(data, req)

    // internal entities are not in the model
    if (model.entitySets[entitySet] && model.entitySets[entitySet].entityTypeDef.name) {
      validateEntityName(data.name)
    }

    if (req == null || req.context.skipValidationFor !== data) {
      const entityType = model.entitySets[entitySet] ? model.entitySets[entitySet].normalizedEntityTypeName : null

      if (entityType != null && validator.getSchema(entityType) != null) {
        const validationResult = validator.validate(entityType, data)

        if (!validationResult.valid) {
          throw createError(`Error when trying to insert into "${entitySet}" collection. input contain values that does not match the schema. ${validationResult.fullErrorMessage}`, {
            weak: true,
            statusCode: 400
          })
        }
      }
    }

    await this.beforeInsertListeners.fire(data, req)

    return provider.insert(entitySet, data, {
      transaction: transactions.getActiveTransaction(req)
    })
  },

  async update (q, u, o, req) {
    if (o && o.__isJsreportRequest__) {
      req = o
      o = {}
    }

    await this.beforeUpdateValidationListeners.fire(q, u, o, req)

    // internal entities are not in the model
    if (model.entitySets[entitySet] && model.entitySets[entitySet].entityTypeDef.name && u.$set.name !== undefined) {
      validateEntityName(u.$set.name)
    }

    const entityType = model.entitySets[entitySet] ? model.entitySets[entitySet].normalizedEntityTypeName : null

    if (entityType != null && validator.getSchema(entityType) != null) {
      const validationResult = validator.validate(entityType, u.$set)

      if (!validationResult.valid) {
        throw createError(`Error when trying to update "${entitySet}" collection. input contain values that does not match the schema. ${validationResult.fullErrorMessage}`, {
          weak: true,
          statusCode: 400
        })
      }
    }

    await this.beforeUpdateListeners.fire(q, u, o, req)

    const updateOpts = Object.assign({}, o)
    const activeTran = transactions.getActiveTransaction(req)

    if (activeTran) {
      updateOpts.transaction = activeTran
    }

    return provider.update(entitySet, q, u, updateOpts)
  },

  async remove (q, req) {
    await this.beforeRemoveListeners.fire(q, req)

    return provider.remove(entitySet, q, {
      transaction: transactions.getActiveTransaction(req)
    })
  },

  async serializeProperties (docs, customTypeDef) {
    let typeDef

    if (customTypeDef == null) {
      const entitySetInfo = model.entitySets[entitySet]
      const entityType = entitySetInfo.entityTypeDef
      typeDef = entityType
    } else {
      typeDef = customTypeDef
    }

    if (!typeDef) {
      return
    }

    return Promise.all(docs.map(async (doc) => {
      if (doc == null) {
        return doc
      }

      const newDoc = Object.assign({}, doc)

      for (const prop in newDoc) {
        if (!prop) {
          continue
        }

        const propDef = typeDef[prop]

        if (!propDef || propDef.type == null) {
          continue
        }

        const resolveResult = resolvePropDefinition(model, propDef)

        if (!resolveResult) {
          continue
        }

        const isCollection = resolveResult.def.type.startsWith('Collection(')

        if (propDef.encrypted === true) {
          if (isCollection && resolveResult.subType == null) {
            if (Array.isArray(newDoc[prop])) {
              for (const [idx, value] of Object.entries(newDoc[prop])) {
                newDoc[prop][idx] = await encryption.decrypt(value)
              }
            }
          } else if (resolveResult.def.type.startsWith('Edm')) {
            newDoc[prop] = await encryption.decrypt(newDoc[prop])
          }
        }

        if (
          isCollection ||
          resolveResult.subType
        ) {
          if (isCollection) {
            if (!Array.isArray(newDoc[prop])) {
              continue
            }

            if (resolveResult.subType) {
              const result = await this.serializeProperties(newDoc[prop], resolveResult.subType)
              newDoc[prop] = result
            }
          } else {
            const result = await this.serializeProperties([newDoc[prop]], resolveResult.subType)
            newDoc[prop] = result[0]
          }
        } else if (propDef.type === 'Edm.Binary') {
          newDoc[prop] = Buffer.from(newDoc[prop]).toString('base64')  // eslint-disable-line
        }
      }

      return newDoc
    }))
  },

  async deserializeProperties (docs, customTypeDef) {
    let typeDef

    if (customTypeDef == null) {
      const entitySetInfo = model.entitySets[entitySet]

      if (!entitySetInfo) {
        return []
      }

      const entityType = entitySetInfo.entityTypeDef

      if (!entityType) {
        return []
      }

      typeDef = entityType
    } else {
      typeDef = customTypeDef
    }

    return Promise.all(docs.map(async (doc) => {
      if (doc == null) {
        return doc
      }

      const newDoc = Object.assign({}, doc)

      for (const prop in newDoc) {
        if (!prop) {
          continue
        }

        const propDef = typeDef[prop]

        if (!propDef || propDef.type == null) {
          continue
        }

        const resolveResult = resolvePropDefinition(model, propDef)

        if (!resolveResult) {
          continue
        }

        const isCollection = resolveResult.def.type.startsWith('Collection(')

        if (
          isCollection ||
          resolveResult.subType
        ) {
          if (isCollection) {
            if (!Array.isArray(newDoc[prop])) {
              continue
            }

            if (resolveResult.subType) {
              const result = await this.deserializeProperties(newDoc[prop], resolveResult.subType)
              newDoc[prop] = result
            }
          } else {
            const result = await this.deserializeProperties([newDoc[prop]], resolveResult.subType)
            newDoc[prop] = result[0]
          }
        } else if (propDef.type === 'Edm.Binary') {
          newDoc[prop] = Buffer.from(newDoc[prop], 'base64')  // eslint-disable-line
        } else if (propDef.type === 'Edm.DateTimeOffset') {
          newDoc[prop] = new Date(newDoc[prop])
        }

        if (propDef.encrypted === true) {
          if (isCollection && resolveResult.subType == null) {
            if (Array.isArray(newDoc[prop])) {
              for (const [idx, value] of Object.entries(newDoc[prop])) {
                newDoc[prop][idx] = await encryption.encrypt(value)
              }
            }
          } else if (resolveResult.def.type.startsWith('Edm')) {
            newDoc[prop] = await encryption.encrypt(newDoc[prop])
          }
        }
      }

      return newDoc
    }))
  }
})
