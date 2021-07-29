# jsreport-public-templates
[![NPM Version](http://img.shields.io/npm/v/jsreport-public-templates.svg?style=flat-square)](https://npmjs.com/package/jsreport-public-templates)
[![Build Status](https://travis-ci.org/jsreport/jsreport-public-templates.png?branch=master)](https://travis-ci.org/jsreport/jsreport-public-templates)

jsreport extension for granting public access to particular templates

See http://jsreport.net/learn/public-templates


## Installation
> npm install jsreport-public-templates

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-public-templates')())
```
