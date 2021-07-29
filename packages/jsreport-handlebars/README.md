# jsreport-handlebars
[![NPM Version](http://img.shields.io/npm/v/jsreport-handlebars.svg?style=flat-square)](https://npmjs.com/package/jsreport-handlebars)
[![Build Status](https://travis-ci.org/jsreport/jsreport-handlebars.png?branch=master)](https://travis-ci.org/jsreport/jsreport-handlebars)

[handlebars](http://handlebarsjs.com/) templating engine for jsreport. 
See the docs https://jsreport.net/learn/handlebars

## Installation
> npm install jsreport-handlebars

## Usage
To use `handlebars` in for template rendering set `template.engine=handlebars` in the rendering request.

```js
{
  template: { content: '...', recipe: '...', engine: 'handlebars' }
}
```

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-handlebars')())
```
