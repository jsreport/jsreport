# jsreport-jsrender
[![NPM Version](http://img.shields.io/npm/v/jsreport-jsrender.svg?style=flat-square)](https://npmjs.com/package/jsreport-jsrender)
[![Build Status](https://travis-ci.org/jsreport/jsreport-jsrender.png?branch=master)](https://travis-ci.org/jsreport/jsreport-jsrender)

[jsrender](https://github.com/borismoore/jsrender) templating engine for jsreport.
See the docs https://jsreport.net/learn/jsrender

## Installation
> npm install jsreport-jsrender

## Usage
To use `jsrender` in for template rendering set `template.engine=jsrender` in the rendering request.

```js
{
  template: { content: '...', recipe: '...', engine: 'jsrender' }
}
```

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-jsrender')())
```
