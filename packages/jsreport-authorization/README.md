# jsreport-authorization
[![NPM Version](http://img.shields.io/npm/v/jsreport-authorization.svg?style=flat-square)](https://npmjs.com/package/jsreport-authorization)
[![Build Status](https://travis-ci.org/jsreport/jsreport-authorization.png?branch=master)](https://travis-ci.org/jsreport/jsreport-authorization)

> Manage and delegate user permissions on jsreport objects. 

See https://jsreport.net/learn/authorization

## Installation

> **npm install jsreport-authorization**

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-authorization')()
```
