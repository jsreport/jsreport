# @jsreport/jsreport-ejs
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-ejs.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-ejs)

[EJS](http://www.embeddedjs.com/) templating engine for jsreport.
See the docs https://jsreport.net/learn/ejs

## Installation
> npm install @jsreport/jsreport-ejs

## Usage
To use `ejs` in for template rendering set `template.engine=ejs` in the rendering request.

```js
{
  template: { content: '...', recipe: '...', enginne: 'ejs' }
}
```

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-core)

```js
var jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('@jsreport/jsreport-ejs')())
```
