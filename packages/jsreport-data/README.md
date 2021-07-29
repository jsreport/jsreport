# jsreport-data
[![NPM Version](http://img.shields.io/npm/v/jsreport-data.svg?style=flat-square)](https://npmjs.com/package/jsreport-data)
[![Build Status](https://travis-ci.org/jsreport/jsreport-data.png?branch=master)](https://travis-ci.org/jsreport/jsreport-data)

jsreport extension adding support for using sample data for previewing templates

See https://jsreport.net/learn/inline-data

## Installation
> npm install jsreport-data

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-data')())
```
