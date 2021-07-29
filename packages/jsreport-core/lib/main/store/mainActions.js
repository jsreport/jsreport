module.exports = (reporter) => {
  reporter.registerMainAction('documentStore.collection.find', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    localReq.context.userFindCall = true
    const res = await reporter.documentStore.collection(spec.collection).find(spec.query, localReq)
    return res
  })

  reporter.registerMainAction('documentStore.collection.findOne', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    localReq.context.userFindCall = true
    const res = await reporter.documentStore.collection(spec.collection).findOne(spec.query, localReq)
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
