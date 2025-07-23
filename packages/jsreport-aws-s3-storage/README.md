# @jsreport/jsreport-aws-s3-storage
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-aws-s3-storage.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-aws-s3-storage)

**jsreport extension adding support for storing blobs in aws s3**

Some of the jsreport extensions requires a blob storage for storing binary objects. This implementation stores these objects like output reports inside cost effective aws s3.

See the blob storages general documentation
https://jsreport.net/learn/blob-storages

See how to persist jsreport output reports
https://jsreport.net/learn/reports


## Installation

> npm install @jsreport/jsreport-aws-s3-storage

## Configuration

Required options is:
- `bucket`

In case you want to use IAM role, don't pass accessKey and secretAccessKey.

Optionally you can set
- `s3Options`: azure blob storage container, this defaults to jsreport

```js
{
	"blobStorage": {
		"provider": "aws-s3-storage"
	},
	"extensions": {
		"aws-s3-storage": {
			"accessKeyId": "...",
			"secretAccessKey": "...",
			"bucket": "...",
			"s3Options": {...}
		}
	}
}
```

## jsreport-core
```js
var jsreport = require('@jsreport/jsreport-core')({ blobStorage: { provider: 'aws-s3-storage' } })
jsreport.use(require('@jsreport/jsreport-aws-s3-storage')({...}))
```

## Changelog

### 4.1.0

- update aws client

### 4.0.0

- minimum node.js version is now `18.15.0`

### 3.0.0-beta.1

Adaptations for the v3 APIs
