module.exports = (options) => {
  const storage = {}

  return {
    write (blobName, buffer) {
      storage[blobName] = buffer
      return blobName
    },

    read (blobName) {
      return storage[blobName]
    },

    remove (blobName) {
      delete storage[blobName]
    },

    append (blobName, buffer) {
      storage[blobName] = storage[blobName] || Buffer.from('')
      storage[blobName] = Buffer.concat([storage[blobName], buffer])
    },

    init () {

    }
  }
}
