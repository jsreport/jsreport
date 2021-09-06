# jsreport-wkhtmltopdf

[![NPM Version](http://img.shields.io/npm/v/jsreport-wkhtmltopdf.svg?style=flat-square)](https://npmjs.com/package/jsreport-wkhtmltopdf)
[![License](http://img.shields.io/npm/l/jsreport-wkhtmltopdf.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/jsreport/jsreport-wkhtmltopdf.png?branch=master)](https://travis-ci.org/jsreport/jsreport-wkhtmltopdf)

[jsreport](https://jsreport.net) recipe for rendering pdf using [wkhtmltopdf](http://wkhtmltopdf.org)

## Installation

> **npm install jsreport-wkhtmltopdf**

## Usage
To use `recipe` in for template rendering set `template.recipe=phantom-wkhtmltopdf` in the rendering request.

```js
{
  template: { content: '...', recipe: 'wkhtmltopdf', enginne: '...', wkhtmltopdf: { ... } }
}
```

See the docs https://jsreport.net/learn/wkhtmltopdf

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-wkhtmltopdf')())
```
