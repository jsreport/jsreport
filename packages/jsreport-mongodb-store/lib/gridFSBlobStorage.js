const mongodb = require('mongodb')
const Promise = require('bluebird')

module.exports = (client, db) => ({
  write (blobName, buffer) {
    return new Promise((resolve, reject) => {
      const gs = new mongodb.GridFSBucket(db)
      const stream = gs.openUploadStream(blobName)
      stream.on('finish', () => resolve(blobName))
      stream.on('error', reject)
      stream.write(buffer)
      stream.end()
    })
  },

  async read (blobName) {
    const gs = new mongodb.GridFSBucket(db)
    const stream = gs.openDownloadStreamByName(blobName)

    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  },

  async remove (blobName) {
    const file = await db.collection('fs.files').findOne({ filename: blobName })
    const gs = new mongodb.GridFSBucket(db)
    return gs.delete(file._id)
  },

  init () {

  }
})
