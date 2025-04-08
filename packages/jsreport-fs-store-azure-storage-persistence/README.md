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
    // omit in case of azure managed identity  
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

### 4.1.0

- support azure managed identity
- reimplement using @azure/storage-blob dep

### 4.0.1

- fix jsreport v4 regression #1104

### 4.0.0

- minimum node.js version is now `18.15.0`

### 3.0.0-beta.1

Adaptations for the v3 APIs
