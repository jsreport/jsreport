# jsreport-reports
[![NPM Version](http://img.shields.io/npm/v/jsreport-reports.svg?style=flat-square)](https://npmjs.com/package/jsreport-reports)
[![Build Status](https://travis-ci.com/jsreport/jsreport-reports.png?branch=master)](https://travis-ci.com/jsreport/jsreport-reports)

> jsreport extension adding support for storing rendering outputs for later use

See https://jsreport.net/learn/reports


## Installation
> npm install jsreport-reports

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-reports')())
```
