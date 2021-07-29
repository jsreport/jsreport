# jsreport-import-export

[![NPM Version](http://img.shields.io/npm/v/jsreport-import-export.svg?style=flat-square)](https://npmjs.com/package/jsreport-import-export)
[![Build Status](https://travis-ci.com/jsreport/jsreport-import-export.png?branch=master)](https://travis-ci.com/jsreport/jsreport-import-export)

> jsreport extension adding support for exporting and importing jsreport objects

See http://jsreport.net/learn/import-export

## Installation
> npm install jsreport-import-export --production

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-import-export')({}))
```
