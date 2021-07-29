# jsreport-scripts
[![NPM Version](http://img.shields.io/npm/v/jsreport-scripts.svg?style=flat-square)](https://npmjs.com/package/jsreport-scripts)
[![Build Status](https://travis-ci.org/jsreport/jsreport-scripts.png?branch=master)](https://travis-ci.org/jsreport/jsreport-scripts)

> jsreport extension capable of running custom javascript functions during the rendering process

See https://jsreport.net/learn/scripts

## Installation
> npm install jsreport-scripts

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-scripts')({}))
```
