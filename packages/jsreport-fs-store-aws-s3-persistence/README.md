# jsreport-fs-store-aws-s3-persistence
[![NPM Version](http://img.shields.io/npm/v/jsreport-fs-store-aws-s3-persistence.svg?style=flat-square)](https://npmjs.com/package/jsreport-fs-store-aws-s3-persistence)
[![Build Status](https://travis-ci.org/jsreport/jsreport-fs-store-aws-s3-persistence.png?branch=master)](https://travis-ci.org/jsreport/jsreport-fs-store-aws-s3-persistence)

**Make jsreport [fs store](https://github.com/jsreport/jsreport-fs-store) persisting entities into AWS S3.**


## Installation

> npm install jsreport-fs-store
> npm install jsreport-fs-store-aws-s3-persistence

Create an IAM user with permissions to S3 and SQS and copy the access key and secret access key.
Create a bucket and copy its name. Then alter the jsreport configuration:
```js
"store": {
  "provider": "fs"
},
"extensions": {
  "fs-store": {
    "persistence": {
      "provider": "aws-s3"
    },
    // it is typically good idea to increase the compacting flat files interval from 5000
    // otherwise store does too many locks which can be slow when s3 not in the same datacenter
    "compactionInterval": 20000
  },
  "fs-store-aws-s3-persistence": {
    "bucket": "...",
    // the rest is otional
    "accessKeyId": "...",
    "secretAccessKey": "...",
    "lock": {
      "queueName": "jsreport-lock.fifo",
      "region": "us-east-1",
      "enabled": true,
      "attributes": {}
    },
    "s3Options": {
       // additional s3 constructor options
       "maxRetries": 10
    }
  }
}
```

This persistence implementation also guarantees consistency for parallel access from multiple instances. This is assured using locking mechanism enabling only single write at once. The locking is implemented trough AWS SQS. The queue is automatically created during the instance startup with attributes specified in the configuration `lock`. You can disable it by setting `false` to `lock.enabled`.
