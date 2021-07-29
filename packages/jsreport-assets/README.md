# jsreport-assets

[![NPM Version](http://img.shields.io/npm/v/jsreport-assets.svg?style=flat-square)](https://npmjs.com/package/jsreport-assets)
[![Build Status](https://travis-ci.org/jsreport/jsreport-assets.png?branch=master)](https://travis-ci.org/jsreport/jsreport-assets)

> jsreport extension embedding static assets like fonts or helpers into the templates

See https://jsreport.net/learn/assets

## Installation
> npm install jsreport-assets --production

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-assets')({}))
```
