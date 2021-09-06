# jsreport-phantom-image
[![NPM Version](http://img.shields.io/npm/v/jsreport-phantom-image.svg?style=flat-square)](https://npmjs.com/package/jsreport-phantom-image)
[![Build Status](https://travis-ci.org/jsreport/jsreport-phantom-image.png?branch=master)](https://travis-ci.org/jsreport/jsreport-phantom-image)

> jsreport recipe which is rendering images from html using phantomjs

## Installation

> **npm install jsreport-phantom-image**

## Usage
To use `recipe` in for template rendering set `template.recipe=phantom-image` in the rendering request.

```js
{
  template: { content: '...', recipe: 'phantom-image', engine: '...', phantomImage: { ... } }
}
```

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-phantom-image')({ strategy: 'phantom-server' }))
```

## Configurations

- imageType - png, gif or jpeg, default png
- quality - quality (1-100) of output image, default 100
- printDelay - number of ms to wait before printing starts
- blockJavaScript - block running js on the page
- waitForJS - see [phantom-html-to-pdf](https://github.com/pofider/phantom-html-to-pdf) - the window variable to set in this case is `JSREPORT_READY_TO_START`
