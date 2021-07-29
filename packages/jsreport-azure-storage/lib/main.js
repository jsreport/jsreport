const stream = require('stream')
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')
const { DefaultAzureCredential } = require('@azure/identity')

module.exports = function (reporter, definition) {
  if (reporter.options.blobStorage.provider !== 'azure-storage') {
    definition.options.enabled = false
    return
  }

  definition.options.container = definition.options.container || 'jsreport'

  let blobServiceClient

  if (definition.options.connectionString) {
    blobServiceClient = BlobServiceClient.fromConnectionString(definition.options.connectionString)
  } else {
    let credentials

    if (definition.options.accountKey) {
      credentials = new StorageSharedKeyCredential(definition.options.accountName, definition.options.accountKey)
    } else {
      credentials = new DefaultAzureCredential()
    }

    blobServiceClient = new BlobServiceClient(
      `https://${definition.options.accountName}.blob.core.windows.net`,
      credentials
    )
  }

  const containerClient = blobServiceClient.getContainerClient(definition.options.container)

  reporter.blobStorage.registerProvider({
    init: () => containerClient.createIfNotExists(),
    read: async (blobName) => {
      try {
        const res = await containerClient.getBlockBlobClient(blobName).download()
        return res.readableStreamBody
      } catch (e) {
        const r = stream.Readable()
        r._read = () => {}
        process.nextTick(() => r.emit('error', e))
        return r
      }
    },
    write: async (blobName, buffer) => {
      await containerClient.getBlockBlobClient(blobName).upload(buffer, Buffer.byteLength(buffer))
      return blobName
    },
    remove: (blobName) => containerClient.getBlockBlobClient(blobName).deleteIfExists(blobName)
  })
}
