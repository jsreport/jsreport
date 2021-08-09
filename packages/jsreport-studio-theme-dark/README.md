# jsreport-studio-theme-dark

[![NPM Version](http://img.shields.io/npm/v/jsreport-studio-theme-dark.svg?style=flat-square)](https://npmjs.com/package/jsreport-studio-theme-dark)
[![Build Status](https://travis-ci.org/jsreport/jsreport-studio-theme-dark.png?branch=master)](https://travis-ci.org/jsreport/jsreport-studio-theme-dark)

> Dark theme for jsreport studio

See http://jsreport.net/learn/studio#themes

## Installation
> npm install jsreport-studio-theme-dark

## jsreport-core

You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('@jsreport/jsreport-studio')({}))
jsreport.use(require('@jsreport/jsreport-studio-theme-dark')({}))
```
