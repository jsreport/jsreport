# jsreport-cli

[![NPM Version](http://img.shields.io/npm/v/jsreport-cli.svg?style=flat-square)](https://npmjs.com/package/jsreport-cli)[![Build Status](https://travis-ci.org/jsreport/jsreport-cli.png?branch=master)](https://travis-ci.org/jsreport/jsreport-cli)

> Command line interface for jsreport

See http://jsreport.net/learn/cli for documentation

## Installation
> npm install jsreport-cli --production

## jsreport-core

You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
const jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-cli')({}))
```
