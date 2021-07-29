const awsSDK = require('aws-sdk')

module.exports = function (reporter, definition) {
  if (reporter.options.blobStorage.provider !== 'aws-s3-storage') {
    definition.options.enabled = false
    return
  }

  const options = Object.assign({}, definition.options)
  // avoid exposing connection string through /api/extensions
  definition.options = {}

  if (!options.bucket) {
    throw new Error('bucket must be provided to jsreport-aws-s3-storage')
  }

  let s3
  if (options.accessKeyId != null && options.secretAccessKey != null) {
    s3 = new awsSDK.S3({ accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey, ...options.s3Options })
  } else {
    s3 = new awsSDK.S3({ ...options.s3Options })
  }

  reporter.blobStorage.registerProvider({
    init: () => {},
    read: (blobName) => {
      const params = {
        Bucket: options.bucket,
        Key: blobName
      }

      const bufs = []
      return new Promise((resolve, reject) => {
        s3.getObject(params)
          .createReadStream()
          .on('data', (b) => bufs.push(b))
          .on('error', (err) => {
            if (err.code === 'NoSuchKey') {
              return resolve(null)
            }
            reject(err)
          })
          .on('end', () => resolve(Buffer.concat(bufs)))
      })
    },
    write: (defaultBlobName, buffer, request, response) => {
      const params = {
        Bucket: options.bucket,
        Key: defaultBlobName,
        Body: buffer
      }

      return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) {
            return reject(err)
          }

          resolve(defaultBlobName)
        })
      })
    },
    remove: (blobName) => {
      const params = {
        Bucket: options.bucket,
        Key: blobName
      }

      return new Promise((resolve, reject) => {
        s3.deleteObject(params, (err) => {
          if (err) {
            return reject(err)
          }

          resolve()
        })
      })
    }
  })
}
