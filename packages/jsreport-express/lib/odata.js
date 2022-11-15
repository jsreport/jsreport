const ODataServer = require('simple-odata-server')
const unset = require('lodash.unset')

function collectHiddenPropertiesInType (model, entityType, hiddenProps, baseName) {
  Object.keys(entityType).forEach((p) => {
    const currentPath = baseName !== '' ? baseName + '.' + p : p
    if (entityType[p].visible === false) {
      hiddenProps.push(currentPath)
    } else {
      if (entityType[p].type.startsWith(model.namespace)) {
        const complexType = model.complexTypes[entityType[p].type.replace(`${model.namespace}.`, '')]
        collectHiddenPropertiesInType(model, complexType, hiddenProps, currentPath)
      }
    }
  })

  return hiddenProps
}

function collectHiddenProperties (model) {
  const hiddenProps = {}
  Object.keys(model.entitySets).forEach((es) => {
    const entitySet = model.entitySets[es]
    const entityTypeName = entitySet.entityType.replace(`${model.namespace}.`, '')
    const entityType = model.entityTypes[entityTypeName]
    hiddenProps[es] = []
    collectHiddenPropertiesInType(model, entityType, hiddenProps[es], '')
  })
  return hiddenProps
}

module.exports = (reporter) => {
  const odataServer = ODataServer()

  const hiddenProps = collectHiddenProperties(reporter.documentStore.model)

  odataServer
    .model(reporter.documentStore.model)
    .beforeQuery((col, query, req, cb) => {
      reporter.logger.debug('OData query on ' + col)
      cb()
    }).beforeUpdate((col, query, update, req, cb) => {
      reporter.logger.debug('OData update on ' + col)
      cb()
    }).beforeRemove((col, query, req, cb) => {
      reporter.logger.debug('OData remove from ' + col)
      cb()
    }).beforeInsert((col, doc, req, cb) => {
      reporter.logger.debug('OData insert into ' + col)
      cb()
    }).update((col, query, update, req, cb) => {
      return Promise.resolve(reporter.documentStore.collection(col).update(query, update, req)).then((result) => cb(null, result), (err) => cb(err))
    })
    .insert((col, doc, req, cb) => {
      return Promise.resolve(reporter.documentStore.collection(col).insert(doc, req)).then((result) => cb(null, result), (err) => cb(err))
    })
    .remove((col, query, req, cb) => {
      return Promise.resolve(reporter.documentStore.collection(col).remove(query, req)).then((result) => cb(null, result), (err) => cb(err))
    })
    .query((col, query, req, cb) => {
      const localReq = reporter.Request(req)

      // we put here this value in context as a hint that this call should execute under strict user permissions check
      localReq.context.userFindCall = true

      let cursor = reporter.documentStore.collection(col).find(query.$filter, query.$select || {}, localReq)

      if (query.$sort) {
        cursor = cursor.sort(query.$sort)
      }
      if (query.$skip) {
        cursor = cursor.skip(query.$skip)
      }
      if (query.$limit) {
        cursor = cursor.limit(query.$limit)
      }

      if (query.$count) {
        return Promise.resolve(cursor.count()).then((result) => cb(null, result), (err) => cb(err))
      }

      if (!query.$inlinecount) {
        return Promise.resolve(cursor.toArray())
          .then((items) => items.map((i) => {
            for (const p of hiddenProps[col]) {
              unset(i, p)
            }
            return i
          }))
          .then((result) => cb(null, result), (err) => cb(err))
      }

      Promise.resolve(cursor.toArray().then((res) => {
        return reporter.documentStore.collection(col).find(query.$filter, localReq).count().then((c) => {
          // lodash does not support deep omit
          for (const r of res) {
            for (const p of hiddenProps[col]) {
              unset(r, p)
            }
          }
          return {
            value: res,
            count: c
          }
        })
      })).then((result) => cb(null, result), (err) => cb(err))
    }).error((req, res, err, def) => {
      if (err.code === 'UNAUTHORIZED') {
        res.error(err)
      } else {
        reporter.logger.error('Error when processing OData ' + req.method + ': ' + req.originalUrl + ' ' + err.stack)
        def(err)
      }
    })

  return odataServer
}
