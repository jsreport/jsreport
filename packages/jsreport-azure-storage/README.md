
# @jsreport/jsreport-azure-storage
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-azure-storage.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-azure-storage)

**jsreport extension adding support for storing blobs in azure storage**

Some of the jsreport extensions require a blob storage for storing binary objects. This implementation stores these objects like output reports inside cost-effective azure blob storage.

See the blob storages general documentation
https://jsreport.net/learn/blob-storages

See how to persist jsreport output reports
https://jsreport.net/learn/reports

## Installation

> npm install @jsreport/jsreport-azure-storage

## Configuration

- `accountName`:  azure blob storage account name
- `accountKey`:  azure blob storage account key
- `connectionString`: azure blob storage connection string
- `container`: azure blob storage container, this defaults to jsreport

You have three options:
1. Set just `connectionString`
2. Set `accountName` and `accountKey`
3. Set only `accountName` and let storage connect using azure managed identity

You can pass the options into jsreport in the following ways:

- Through global `blobStorage` options
```js
{
	"blobStorage": {
		"provider": "azure-storage"
	},
	"extensions": {
		"azure-storage": {
			"accountName": "...",
			"accountKey": "...",
			"container": "..."
		}
	}
}
```

- Pass options directly when using jsreport-core manually
```js
var jsreport = require('@jsreport/jsreport-core')({ blobStorage: { provider: 'azure-storage' } })
jsreport.use(require('@jsreport/jsreport-azure-storage')({}))
```

## Changelog

### 3.0.0-beta.1

Adaptations for the v3 APIs
