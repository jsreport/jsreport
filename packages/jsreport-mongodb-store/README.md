# jsreport-mongodb-store

[![Build Status](https://travis-ci.org/jsreport/jsreport-mongodb-store.png?branch=master)](https://travis-ci.org/jsreport/jsreport-mongodb-store)

[jsreport](http://jsreport.net/) extension adding support for storing templates and reports inside [mongodb](https://www.mongodb.org/).

## Installation

> npm install jsreport-mongodb-store

Then alter jsreport configuration with:

```js
{
  ....
  "store": {
    "provider": "mongodb",
  },
  "blobStorage": {
    "provider": "gridFS"
  },
  "extensions": {
    "mongodb-store": {
      "address": "127.0.0.1",
      "databaseName" : "std",
      "connectOptions": { /* any custom mongodb connection options can be passed here */ },
      "prefix": "jsreport_" // optional prefix for jsreport collections, defaults to no prefix
    }
  }
}
```

Connection options can be passed as values of `mongodb-store` key in config or as values inside the `connectOptions` key.

Note that both features are optional, you can use mongodb GridFS only for reports storage and fs-store (or any other store) for storing templates, also you can keep using file system storage for reports when required. In this case change `blobStorage` value to `fileSystem`.

You can also pass connection uri like this

```js
"store": {
  "provider": "mongodb"
},
"extensions": {
  "mongodb-store": {
    "uri": "mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test"
  }
}
```

