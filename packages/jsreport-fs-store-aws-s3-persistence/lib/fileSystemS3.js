const util = require('util')
const path = require('path')
const S3 = require('aws-sdk/clients/s3')
const SQS = require('aws-sdk/clients/sqs')
const { v4: uuidv4 } = require('uuid')
const instanceId = uuidv4()

module.exports = ({ logger, accessKeyId, secretAccessKey, bucket, lock = {}, s3Options = {} }) => {
  if (!bucket) {
    throw new Error('The fs store is configured to use aws s3 persistence but the bucket is not set. Use store.persistence.bucket or extensions.fs-store-aws-s3-persistence.bucket to set the proper value.')
  }

  let s3

  if (accessKeyId != null && secretAccessKey != null) {
    s3 = new S3({ accessKeyId: accessKeyId, secretAccessKey: secretAccessKey, ...s3Options })
  } else {
    s3 = new S3({ ...s3Options })
  }

  const s3Async = {
    listObjectsV2: util.promisify(s3.listObjectsV2).bind(s3),
    getObject: util.promisify(s3.getObject).bind(s3),
    headObject: util.promisify(s3.headObject).bind(s3),
    copyObject: util.promisify(s3.copyObject).bind(s3),
    putObject: util.promisify(s3.putObject).bind(s3),
    deleteObject: util.promisify(s3.deleteObject).bind(s3),
    deleteObjects: util.promisify(s3.deleteObjects).bind(s3),
    headBucket: util.promisify(s3.headBucket).bind(s3)
  }

  async function listObjectKeys (p) {
    const opts = {
      Bucket: bucket,
      Prefix: p
    }
    const result = []
    do {
      const data = await s3Async.listObjectsV2(opts)
      opts.ContinuationToken = data.NextContinuationToken
      result.push(...data.Contents)
    } while (opts.ContinuationToken)

    return result
      .filter(e =>
        e.Key === p ||
        e.Key.startsWith(p + '/') ||
        p === '')
      .map(e => e.Key)
  }

  let queueUrl
  let sqsAsync

  return {
    init: async () => {
      logger.info(`fs store is verifying aws s3 bucket ${bucket} exists and is accessible`)
      try {
        await s3Async.headBucket({ Bucket: bucket })
      } catch (e) {
        throw new Error(`fs store aws s3 bucket "${bucket}" doesn't exist or user doesn't have permissions to it. ` + e)
      }

      if (lock.enabled !== false) {
        lock.queueName = lock.queueName || 'jsreport-lock.fifo'
        lock.attributes = Object.assign({
          FifoQueue: 'true',
          // we don't need lock messages to be stored by aws longer than 1min which is the lowest AWS value
          MessageRetentionPeriod: '60',
          // the time in s for which the message is blocked for others when we pop it up
          VisibilityTimeout: '10'
        }, lock.attributes)
        lock.region = lock.region || 'us-east-1'

        logger.info(`fs store is verifying SQS for locking in ${lock.region} with name ${lock.queueName} `)

        let sqs

        if (accessKeyId != null && secretAccessKey != null) {
          sqs = new SQS({ accessKeyId: accessKeyId, secretAccessKey: secretAccessKey, region: lock.region })
        } else {
          sqs = new SQS({ region: lock.region })
        }

        sqsAsync = {
          createQueue: util.promisify(sqs.createQueue).bind(sqs),
          sendMessage: util.promisify(sqs.sendMessage).bind(sqs),
          receiveMessage: util.promisify(sqs.receiveMessage).bind(sqs),
          changeMessageVisibility: util.promisify(sqs.changeMessageVisibility).bind(sqs),
          deleteMessage: util.promisify(sqs.deleteMessage).bind(sqs)
        }

        const queueRes = await sqsAsync.createQueue({
          QueueName: lock.queueName,
          Attributes: lock.attributes
        })
        queueUrl = queueRes.QueueUrl
      }
    },
    readdir: async (p) => {
      const res = await listObjectKeys(p)
      const topFilesOrDirectories = res.map(e => e.replace(p, '').split('/').filter(f => f)[0]).filter(f => f)
      return [...new Set(topFilesOrDirectories)]
    },
    readFile: async (p) => {
      const res = await s3Async.getObject({
        Bucket: bucket,
        Key: p
      })
      return res.Body
    },
    writeFile: (p, c) => s3Async.putObject({
      Bucket: bucket,
      Key: p,
      Body: c,
      Metadata: {
        mtime: new Date().getTime().toString()
      }
    }),
    appendFile: async (p, c) => {
      let existingBuffer = Buffer.from([])
      try {
        const res = await s3Async.getObject({
          Bucket: bucket,
          Key: p
        })
        existingBuffer = res.Body
      } catch (e) {
        // doesn't exists yet
      }

      return s3Async.putObject({
        Bucket: bucket,
        Key: p,
        Body: Buffer.concat([existingBuffer, Buffer.from(c)]),
        Metadata: {
          mtime: new Date().getTime().toString()
        }
      })
    },
    rename: async (p, pp) => {
      const objectsToRename = await listObjectKeys(p)

      await Promise.all(objectsToRename.map(async (key) => {
        const newName = key.replace(p, pp)
        await s3Async.copyObject({
          Bucket: bucket,
          CopySource: `/${bucket}/${encodeURIComponent(key)}`,
          Key: newName
        })
      }))

      const chunks = objectsToRename.reduce((all, one, i) => {
        const ch = Math.floor(i / 1000)
        all[ch] = [].concat((all[ch] || []), one)
        return all
      }, [])

      await Promise.all(chunks.map(ch => s3Async.deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: ch.map(e => ({ Key: e })),
          Quiet: true
        }
      })))
    },
    exists: async (p) => {
      try {
        await s3Async.headObject({ Bucket: bucket, Key: p })
        return true
      } catch (e) {
        return false
      }
    },
    stat: async (p) => {
      // directory always fail for some reason
      try {
        const r = await s3Async.headObject({ Bucket: bucket, Key: p })
        const mtime = r.Metadata.mtime ? new Date(parseInt(r.Metadata.mtime)) : new Date(r.lastModified)
        return { isDirectory: () => false, mtime }
      } catch (e) {
        return { isDirectory: () => true }
      }
    },
    mkdir: (p) => Promise.resolve(),
    remove: async (p) => {
      const blobsToRemove = await listObjectKeys(p)
      const chunks = blobsToRemove.reduce((all, one, i) => {
        const ch = Math.floor(i / 1000)
        all[ch] = [].concat((all[ch] || []), one)
        return all
      }, [])

      await Promise.all(chunks.map(ch => s3Async.deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: ch.map(e => ({ Key: e })),
          Quiet: true
        }
      })))
    },
    copyFile: (p, pp) => s3Async.copyObject({
      Bucket: bucket,
      CopySource: `/${bucket}/${encodeURIComponent(p)}`,
      Key: pp
    }),
    path: {
      join: (...args) => args.filter(a => a).join('/'),
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

        const res = await sqsAsync.receiveMessage({
          QueueUrl: queueUrl,
          WaitTimeSeconds: 1
        })

        if (res.Messages && res.Messages.length) {
          const message = JSON.parse(res.Messages[0].Body)

          if (message.instanceId !== instanceId || message.lockId !== lockId) {
            if (message.sentOn && (message.sentOn + 10000 < Date.now())) {
              try {
                await sqsAsync.deleteMessage({ QueueUrl: queueUrl, ReceiptHandle: res.Messages[0].ReceiptHandle })
              } catch (e) {
              }
            } else {
              // we have event that the original locker is waiting for
              // unblock the message for other receivers
              try {
                await sqsAsync.changeMessageVisibility({
                  QueueUrl: queueUrl,
                  ReceiptHandle: res.Messages[0].ReceiptHandle,
                  VisibilityTimeout: 0
                })
              } catch (e) {
              }
            }

            return waitForMessage()
          }

          return res
        }

        return waitForMessage()
      }

      await sqsAsync.sendMessage({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ instanceId, lockId, sentOn: Date.now() }),
        MessageGroupId: 'default',
        MessageDeduplicationId: Date.now() + ''
      })

      return waitForMessage()
    },
    releaseLock: async (l) => {
      if (lock.enabled === false) {
        return null
      }

      try {
        await sqsAsync.deleteMessage({ QueueUrl: queueUrl, ReceiptHandle: l.Messages[0].ReceiptHandle })
      } catch (e) {

      }
    }
  }
}
