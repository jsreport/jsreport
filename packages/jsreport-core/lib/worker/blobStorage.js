module.exports = (executeMainAction, { writeTempFile, readTempFile }) => {
  return {
    async read (blobName, req) {
      const r = await executeMainAction('blobStorage.read', {
        blobName
      }, req)

      if (r.content) {
        return Buffer.from(r.content, 'base64')
      }

      const { content } = await readTempFile(r.pathToFile)
      return content
    },

    async write (blobName, content, req) {
      const message = {
        blobName
      }

      if (content.length < 1000 * 1000 * 10) {
        message.content = Buffer.from(content).toString('base64')
      } else {
        const { pathToFile } = await writeTempFile((uuid) => `${uuid}.blob`, content)
        message.pathToFile = pathToFile
      }

      return executeMainAction('blobStorage.write', message, req)
    },

    remove (blobName, req) {
      return executeMainAction('blobStorage.remove', {
        blobName
      }, req)
    },

    append (blobName, content, req) {
      return executeMainAction('blobStorage.append', {
        blobName,
        content: Buffer.from(content).toString('base64')
      }, req)
    },

    init () {

    }
  }
}
