module.exports = (reporter) => {
  reporter.registerMainAction('blobStorage.read', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    const res = await reporter.blobStorage.read(spec.blobName, localReq)

    return res.toString('base64')
  })

  reporter.registerMainAction('blobStorage.write', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)

    return await reporter.blobStorage.write(spec.blobName, Buffer.from(spec.content, 'base64'), localReq)
  })

  reporter.registerMainAction('blobStorage.remove', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    return reporter.blobStorage.remove(spec.blobName, localReq)
  })

  reporter.registerMainAction('blobStorage.append', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    return reporter.blobStorage.append(spec.blobName, Buffer.from(spec.content, 'base64'), localReq)
  })
}
