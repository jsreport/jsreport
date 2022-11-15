
module.exports = (reporter) => {
  reporter.registerMainAction('documentStore.collection.find', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)

    localReq.context.userFindCall = true

    const collection = reporter.documentStore.collection(spec.collection)
    let method = 'find'

    if (spec.admin) {
      method = 'findAdmin'
    }

    const res = await collection[method](spec.query, localReq)
    return res
  })

  reporter.registerMainAction('documentStore.collection.findOne', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)

    localReq.context.userFindCall = true

    const collection = reporter.documentStore.collection(spec.collection)
    let method = 'findOne'

    if (spec.admin) {
      method = 'findOneAdmin'
    }

    const res = await collection[method](spec.query, localReq)
    return res
  })

  reporter.registerMainAction('documentStore.collection.insert', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    const res = await reporter.documentStore.collection(spec.collection).insert(spec.doc, localReq)
    return res
  })

  reporter.registerMainAction('documentStore.collection.update', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    const res = await reporter.documentStore.collection(spec.collection).update(spec.query, spec.update, spec.options, localReq)

    return res
  })
}
