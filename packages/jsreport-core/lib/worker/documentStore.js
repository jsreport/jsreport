module.exports = ({ model, collections }, executeMainAction) => {
  const store = {
    model,
    collection: (name) => ({
      find: findMethod('documentStore.collection.find', name, false, executeMainAction),
      findOne: findMethod('documentStore.collection.findOne', name, false, executeMainAction),
      findAdmin: findMethod('documentStore.collection.find', name, true, executeMainAction),
      findOneAdmin: findMethod('documentStore.collection.findOne', name, true, executeMainAction),
      insert: async (doc, req) => {
        const entity = await executeMainAction('documentStore.collection.insert', {
          doc,
          collection: name
        }, req)
        doc._id = entity._id
        return entity
      },
      update: async (query, update, options, req) => {
        if (req == null) {
          req = options
          options = {}
        }

        const r = await executeMainAction('documentStore.collection.update', {
          query,
          update,
          options,
          collection: name
        }, req)

        return r
      }
    })
  }

  store.collections = {}

  for (const colName of collections) {
    store.collections[colName] = {
      name: colName,
      ...store.collection(colName)
    }
  }

  return store
}

function findMethod (actionName, collectionName, admin, executeMainAction) {
  return async (q, req) => {
    const payload = {
      query: q,
      collection: collectionName
    }

    if (admin) {
      payload.admin = admin
    }

    return executeMainAction(actionName, payload, req)
  }
}
