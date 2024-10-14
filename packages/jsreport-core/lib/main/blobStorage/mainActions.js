module.exports = (reporter) => {
  reporter.registerMainAction('blobStorage.read', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    const res = await reporter.blobStorage.read(spec.blobName, localReq)

    if (res.length < 1000 * 1000 * 10) {
      return { content: res.toString('base64') }
    }

    const { pathToFile } = await reporter.writeTempFile((uuid) => `${uuid}.blob`, res)
    return { pathToFile }
  })

  reporter.registerMainAction('blobStorage.write', async (spec, originalReq) => {
    const localReq = reporter.Request(originalReq)
    if (spec.content) {
      return await reporter.blobStorage.write(spec.blobName, Buffer.from(spec.content, 'base64'), localReq)
    }

    const { content } = await reporter.readTempFile(spec.pathToFile)
    return await reporter.blobStorage.write(spec.blobName, content, localReq)
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
