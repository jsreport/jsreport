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
        let existingBuf = Buffer.from([])
        try {
          existingBuf = await provider.read(blobName, req)
          await provider.remove(blobName, req)
        } catch (e) {
          // so far blob storage throws when blob doesnt exit
        }
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

    get supportsAppend () {
      return provider.append instanceof Function
    },

    get _provider () {
      return provider
    },

    registerProvider (p) {
      provider = p
    }
  }
}
