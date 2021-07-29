# jsreport-scheduling
[![NPM Version](http://img.shields.io/npm/v/jsreport-scheduling.svg?style=flat-square)](https://npmjs.com/package/jsreport-scheduling)
[![Build Status](https://travis-ci.org/jsreport/jsreport-scheduling.png?branch=master)](https://travis-ci.org/jsreport/jsreport-scheduling)

> jsreport extension for scheduling background rendering jobs

See https://jsreport.net/learn/scheduling


## Installation
> npm install jsreport-resources

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-scheduling)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-scheduling')({}))
```
