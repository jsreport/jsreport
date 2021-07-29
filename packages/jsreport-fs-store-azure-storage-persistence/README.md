# jsreport-fs-store-azure-storage-persistence
[![NPM Version](http://img.shields.io/npm/v/jsreport-fs-store-azure-storage-persistence.svg?style=flat-square)](https://npmjs.com/package/jsreport-fs-store-azure-storage-persistence)
[![Build Status](https://travis-ci.org/jsreport/jsreport-fs-store-azure-storage-persistence.png?branch=master)](https://travis-ci.org/jsreport/jsreport-fs-store-azure-storage-persistence)

**Make jsreport [fs store](https://github.com/jsreport/jsreport-fs-store) persisting entities into azure blob storage.**


## Installation

> npm install jsreport-fs-store    
> npm install jsreport-fs-store-azure-storage-persistence

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
