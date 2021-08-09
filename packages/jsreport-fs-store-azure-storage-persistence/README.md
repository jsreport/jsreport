# @jsreport/jsreport-fs-store-azure-storage-persistence
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-fs-store-azure-storage-persistence.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-fs-store-azure-storage-persistence)

**Make jsreport [fs store](https://jsreport.net/learn/fs-store) persisting entities into azure blob storage.**

## Installation
  
> npm install @jsreport/jsreport-fs-store-azure-storage-persistence

Create an azure storage account and copy account name and access key.  Then alter jsreport configuration:
```js
"store": {
  "provider": "fs"
},
"extensions": {
  "fs-store": {
    "persistence": {
      "provider": "azure-storage"
    }
  },
  "fs-store-azure-storage-persistence": {
    "accountName": "...",
    "accountKey": "...",
    // the rest is optional
    "container": "jsreport",
    "lock": {
      "retry": 100,
      "leaseDuration": 30,
      "enabled": true
    }
  }
}
```

## Changelog

### 3.0.0-beta.1

Adaptations for the v3 APIs
