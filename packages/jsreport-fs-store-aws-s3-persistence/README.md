# @jsreport/jsreport-fs-store-aws-s3-persistence
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-fs-store-aws-s3-persistence.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-fs-store-aws-s3-persistence)

**Make jsreport [fs store](https://jsreport.net/learn/fs-store) persisting entities into AWS S3.**

## Installation

> npm install @jsreport/jsreport-fs-store-aws-s3-persistence

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

## Changelog

### 3.0.1

fix for persisting more than 1000 files


### 3.0.0-beta.1

Adaptations for the v3 APIs
