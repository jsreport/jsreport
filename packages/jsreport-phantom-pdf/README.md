**⚠️ This repository has been moved to the monorepo [jsreport/jsreport](https://github.com/jsreport/jsreport)**
--

# jsreport-phantom-pdf
[![NPM Version](http://img.shields.io/npm/v/jsreport-phantom-pdf.svg?style=flat-square)](https://npmjs.com/package/jsreport-phantom-pdf)
[![Build Status](https://travis-ci.org/jsreport/jsreport-phantom-pdf.png?branch=master)](https://travis-ci.org/jsreport/jsreport-phantom-pdf)

> jsreport recipe which is rendering pdf from html using phantomjs

See the docs https://jsreport.net/learn/phantom-pdf

## Installation

> **npm install jsreport-phantom-pdf**


## Usage
To use `recipe` in for template rendering set `template.recipe=phantom-pdf` in the rendering request.

```js
{
  template: { content: '...', recipe: 'phantom-pdf', engine: '...', phantom: { ... } }
}
```

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-phantom-pdf')({ strategy: 'phantom-server' }))
```

