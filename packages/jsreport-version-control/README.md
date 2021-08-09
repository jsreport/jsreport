# jsreport-version-control
[![NPM Version](http://img.shields.io/npm/v/jsreport-version-control.svg?style=flat-square)](https://npmjs.com/package/jsreport-version-control)
[![Build Status](https://travis-ci.com/jsreport/jsreport-version-control.png?branch=master)](https://travis-ci.com/jsreport/jsreport-version-control)

> jsreport extension adding support for versioning entities and providing API as well as the studio UI for common commands like commit, diff, revert or history.

See https://jsreport.net/learn/version-control

![version control](https://jsreport.net/img/version-control.gif)

## Installation

```bash
npm install jsreport-version-control
```

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('@jsreport/jsreport-version-control')())
```
