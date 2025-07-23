const path = require('path')
const {
  S3Client,
  ListObjectsV2Command, GetObjectCommand, HeadObjectCommand, GetBucketLocationCommand,
  CopyObjectCommand, PutObjectCommand, DeleteObjectsCommand, HeadBucketCommand
} = require('@aws-sdk/client-s3')
const { SQSClient, CreateQueueCommand, SendMessageCommand, ReceiveMessageCommand, ChangeMessageVisibilityCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs')
const { v4: uuidv4 } = require('uuid')
const instanceId = uuidv4()

module.exports = ({ logger, accessKeyId, secretAccessKey, bucket, prefix, lock = {}, s3Options = {} }) => {
  if (!bucket) {
    throw new Error('The fs store is configured to use aws s3 persistence but the bucket is not set. Use store.persistence.bucket or extensions.fs-store-aws-s3-persistence.bucket to set the proper value.')
  }

  const s3ClientConfig = { ...s3Options }
  if (accessKeyId && secretAccessKey) {
    s3ClientConfig.credentials = {
      accessKeyId,
      secretAccessKey
    }
  }

  let s3 = null

  // Helper: Convert Readable stream (from GetObjectCommand) to Buffer
  function streamToBuffer (stream) {
    return new Promise((resolve, reject) => {
      const chunks = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.once('end', () => resolve(Buffer.concat(chunks)))
      stream.once('error', reject)
    })
  }

  // List all S3 object keys under a prefix (recursively)
  async function listObjectKeys (p) {
    const opts = {
      Bucket: bucket,
      Prefix: p
    }
    const result = []
    let continuationToken
    do {
      const cmd = new ListObjectsV2Command({ ...opts, ContinuationToken: continuationToken })
      const data = await s3.send(cmd)
      continuationToken = data.NextContinuationToken
      if (data.Contents) {
        result.push(...data.Contents)
      }
    } while (continuationToken)

    return result
      .filter(e =>
        e.Key === p ||
        e.Key.startsWith(p + '/') ||
        p === '')
      .map(e => e.Key)
  }

  let queueUrl
  let sqs

  return {
    init: async () => {
      if (!s3ClientConfig.region) {
        s3ClientConfig.region = await getBucketRegion(bucket, s3ClientConfig)
      }
      s3 = new S3Client(s3ClientConfig)

      logger.info(`fs store is verifying aws s3 bucket ${bucket} exists and is accessible`)
      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }))
      } catch (e) {
        throw new Error(`fs store aws s3 bucket "${bucket}" doesn't exist or user doesn't have permissions to it. ` + e)
      }

      if (lock.enabled !== false) {
        lock.queueName = lock.queueName || 'jsreport-lock.fifo'
        lock.attributes = Object.assign({
          FifoQueue: 'true',
          MessageRetentionPeriod: '60',
          VisibilityTimeout: '10'
        }, lock.attributes)
        lock.region = lock.region || s3ClientConfig.region

        logger.info(`fs store is verifying SQS for locking in ${lock.region} with name ${lock.queueName} `)

        const sqsClientConfig = { region: lock.region }
        if (accessKeyId && secretAccessKey) {
          sqsClientConfig.credentials = {
            accessKeyId,
            secretAccessKey
          }
        }
        sqs = new SQSClient(sqsClientConfig)

        const queueRes = await sqs.send(new CreateQueueCommand({
          QueueName: lock.queueName,
          Attributes: lock.attributes
        }))
        queueUrl = queueRes.QueueUrl
      }
    },

    readdir: async (p) => {
      p = pathWithPrefix(p)
      const res = await listObjectKeys(p)
      const topFilesOrDirectories = res.map(e => e.replace(p, '').split('/').filter(f => f)[0]).filter(f => f)
      return [...new Set(topFilesOrDirectories)]
    },

    readFile: async (p) => {
      p = pathWithPrefix(p)
      const res = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: p
      }))
      // res.Body is a stream
      return await streamToBuffer(res.Body)
    },

    writeFile: async (p, c) => {
      p = pathWithPrefix(p)
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: p,
        Body: Buffer.from(c),
        Metadata: {
          mtime: new Date().getTime().toString()
        }
      }))
    },

    appendFile: async (p, c) => {
      p = pathWithPrefix(p)
      let existingBuffer = Buffer.from([])
      try {
        const res = await s3.send(new GetObjectCommand({
          Bucket: bucket,
          Key: p
        }))
        existingBuffer = await streamToBuffer(res.Body)
      } catch (e) {
        // doesn't exist yet
      }
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: p,
        Body: Buffer.concat([existingBuffer, Buffer.from(c)]),
        Metadata: {
          mtime: new Date().getTime().toString()
        }
      }))
    },

    rename: async (p, pp) => {
      p = pathWithPrefix(p)
      pp = pathWithPrefix(pp)
      const objectsToRename = await listObjectKeys(p)

      await Promise.all(objectsToRename.map(async (key) => {
        const newName = key.replace(p, pp)
        await s3.send(new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${encodeURIComponent(key)}`,
          Key: newName
        }))
      }))

      const chunks = objectsToRename.reduce((all, one, i) => {
        const ch = Math.floor(i / 1000)
        all[ch] = [].concat((all[ch] || []), one)
        return all
      }, [])

      await Promise.all(chunks.map(ch => s3.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: ch.map(e => ({ Key: e })),
          Quiet: true
        }
      }))))
    },

    exists: async (p) => {
      if (!p) {
        // root always exists
        return true
      }
      p = pathWithPrefix(p)
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: p }))
        return true
      } catch (e) {
        return false
      }
    },

    stat: async (p) => {
      p = pathWithPrefix(p)
      try {
        const r = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: p }))
        const mtime = r.Metadata?.mtime ? new Date(parseInt(r.Metadata.mtime)) : new Date(r.LastModified)
        return { isDirectory: () => false, mtime }
      } catch (e) {
        return { isDirectory: () => true }
      }
    },

    mkdir: async (p) => {},

    remove: async (p) => {
      p = pathWithPrefix(p)
      const blobsToRemove = await listObjectKeys(p)
      const chunks = blobsToRemove.reduce((all, one, i) => {
        const ch = Math.floor(i / 1000)
        all[ch] = [].concat((all[ch] || []), one)
        return all
      }, [])

      await Promise.all(chunks.map(ch => s3.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: ch.map(e => ({ Key: e })),
          Quiet: true
        }
      }))))
    },

    copyFile: async (p, pp) => {
      p = pathWithPrefix(p)
      pp = pathWithPrefix(pp)
      await s3.send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${encodeURIComponent(p)}`,
        Key: pp
      }))
    },

    path: {
      join: (...args) => args.filter(a => a).map(a => a.replace(/\/+$/, '').replace(/^\/+/, '')).join('/'),
      sep: '/',
      basename: path.basename
    },

    async lock () {
      if (lock.enabled === false) {
        return null
      }

      const start = Date.now()
      const lockId = uuidv4()

      const waitForMessage = async () => {
        if (start + 10000 < Date.now()) {
          return this.lock()
        }

        const res = await sqs.send(new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          WaitTimeSeconds: 1
        }))

        if (res.Messages && res.Messages.length) {
          const message = JSON.parse(res.Messages[0].Body)

          if (message.instanceId !== instanceId || message.lockId !== lockId) {
            if (message.sentOn && (message.sentOn + 10000 < Date.now())) {
              try {
                await sqs.send(new DeleteMessageCommand({
                  QueueUrl: queueUrl, ReceiptHandle: res.Messages[0].ReceiptHandle
                }))
              } catch (e) {}
            } else {
              try {
                await sqs.send(new ChangeMessageVisibilityCommand({
                  QueueUrl: queueUrl,
                  ReceiptHandle: res.Messages[0].ReceiptHandle,
                  VisibilityTimeout: 0
                }))
              } catch (e) {}
            }
            return waitForMessage()
          }

          return res
        }

        return waitForMessage()
      }

      await sqs.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ instanceId, lockId, sentOn: Date.now() }),
        MessageGroupId: 'default',
        MessageDeduplicationId: Date.now() + ''
      }))

      return waitForMessage()
    },

    releaseLock: async (l) => {
      if (lock.enabled === false) {
        return null
      }
      try {
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: l.Messages[0].ReceiptHandle
        }))
      } catch (e) {}
    }
  }

  function pathWithPrefix (p) {
    if (!prefix) {
      return p
    }
    const prefixNoSlash = prefix.endsWith('/') ? prefix.substring(0, prefix.length - 1) : prefix
    const pNoSlash = p.startsWith('/') ? p.substring(1) : p
    if (!p) {
      return prefixNoSlash
    }
    return prefixNoSlash + '/' + pNoSlash
  }
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
