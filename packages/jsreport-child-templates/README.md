# jsreport-child-templates
[![NPM Version](http://img.shields.io/npm/v/jsreport-child-templates.svg?style=flat-square)](https://npmjs.com/package/jsreport-child-templates)
[![Build Status](https://travis-ci.org/jsreport/jsreport-child-templates.png?branch=master)](https://travis-ci.org/jsreport/jsreport-child-templates)

> jsreport extension adding support to combine one template from multiple sub templates

See https://jsreport.net/learn/child-templates

## Installation
> npm install jsreport-child-templates

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-child-templates')())
```
