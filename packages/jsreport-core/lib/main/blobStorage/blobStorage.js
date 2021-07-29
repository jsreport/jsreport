module.exports = (reporter, options) => {
  let provider

  return {
    async read (blobName, req) {
      const r = await provider.read(blobName, req)
      if (r == null) {
        throw reporter.createError(`Blob ${blobName} wasn't found`, {
          statusCode: 404
        })
      }
      return r
    },

    write (blobName, buffer, req) {
      return provider.write(blobName, buffer, req)
    },

    async remove (blobName, req) {
      return provider.remove(blobName)
    },

    async append (blobName, buffer, req) {
      if (!provider.append) {
        const existingBuf = await provider.read(blobName, req)
        return provider.write(blobName, existingBuf ? Buffer.concat([existingBuf, buffer]) : buffer, req)
      }
      return provider.append(blobName, buffer, req)
    },

    async init () {
      if (provider.init) {
        return provider.init()
      }
    },

    drop () {
      if (provider.drop) {
        return provider.drop()
      }
    },

    registerProvider (p) {
      provider = p
    }
  }
}
