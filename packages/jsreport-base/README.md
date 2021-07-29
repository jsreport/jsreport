# jsreport-base

[![NPM Version](http://img.shields.io/npm/v/jsreport-base.svg?style=flat-square)](https://npmjs.com/package/jsreport-base)
[![Build Status](https://travis-ci.org/jsreport/jsreport-base.png?branch=master)](https://travis-ci.org/jsreport/jsreport-base)

jsreport extension automatically injecting [html base tag](https://www.tutorialspoint.com/html/html_base_tag.htm) to allow relative referencing of local files

See https://jsreport.net/learn/base

## Installation
> npm install jsreport-base

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-base')({ url: __dirname }))
```
