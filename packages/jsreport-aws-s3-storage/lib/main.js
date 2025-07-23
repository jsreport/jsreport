const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, GetBucketLocationCommand } = require('@aws-sdk/client-s3')

module.exports = async function (reporter, definition) {
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

  const s3ClientConfig = { ...options.s3Options }

  if (options.accessKeyId && options.secretAccessKey) {
    s3ClientConfig.credentials = {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey
    }
  }

  if (!s3ClientConfig.region) {
    s3ClientConfig.region = await getBucketRegion(options.bucket, s3ClientConfig)
  }

  const s3 = new S3Client(s3ClientConfig)

  reporter.blobStorage.registerProvider({
    init: () => {},

    read: async (blobName) => {
      const params = {
        Bucket: options.bucket,
        Key: blobName
      }
      try {
        const command = new GetObjectCommand(params)
        const data = await s3.send(command)

        // Read the stream into a buffer
        return await streamToBuffer(data.Body)
      } catch (err) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
          return null
        }
        throw err
      }
    },

    write: async (defaultBlobName, buffer, request, response) => {
      const params = {
        Bucket: options.bucket,
        Key: defaultBlobName,
        Body: buffer
      }

      const command = new PutObjectCommand(params)
      await s3.send(command)
      return defaultBlobName
    },

    remove: async (blobName) => {
      const params = {
        Bucket: options.bucket,
        Key: blobName
      }

      const command = new DeleteObjectCommand(params)
      await s3.send(command)
    }
  })
}

// Helper function: convert ReadableStream to Buffer
async function streamToBuffer (stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.once('end', () => resolve(Buffer.concat(chunks)))
    stream.once('error', reject)
  })
}

async function getBucketRegion (bucket, s3Options = {}) {
  // Use us-east-1 to query bucket location (recommended by AWS)
  const s3 = new S3Client({ region: 'us-east-1', ...s3Options })

  const cmd = new GetBucketLocationCommand({ Bucket: bucket })
  const result = await s3.send(cmd)

  // result.LocationConstraint may be null, '', or a region string
  // See: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketLocation.html
  let region = result.LocationConstraint
  if (!region || region === '') {
    region = 'us-east-1' // us-east-1 is returned as null/empty
  } else if (region === 'EU') {
    region = 'eu-west-1' // legacy EU code
  }
  return region
}
