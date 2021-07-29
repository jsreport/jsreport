# jsreport-chrome-pdf
[![NPM Version](http://img.shields.io/npm/v/jsreport-chrome-pdf.svg?style=flat-square)](https://npmjs.com/package/jsreport-chrome-pdf)
[![Build Status](https://travis-ci.org/jsreport/jsreport-chrome-pdf.png?branch=master)](https://travis-ci.org/jsreport/jsreport-chrome-pdf)

> jsreport recipe which is rendering pdf and images from html using headless chrome

See the docs

- https://jsreport.net/learn/chrome-pdf
- https://jsreport.net/learn/chrome-image

## Installation

> **npm install jsreport-chrome-pdf**


## Usage
To use `recipe` in for template rendering set `template.recipe=chrome-pdf` or `template.recipe=chrome-image` according to your needs in the rendering request.

chrome-pdf

```js
{
  template: { content: '...', recipe: 'chrome-pdf', engine: '...', chrome: { ... } }
}
```

chrome-image

```js
{
  template: { content: '...', recipe: 'chrome-image', engine: '...', chromeImage: { ... } }
}
```

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-chrome-pdf')())
```

## Troubleshooting

#### Table with a lot of rows never finish rendering

When rendering a table with a lot of rows (>4000) chrome can hang if the html contains a 5 level of tab indentation in the source, the fix for this is to keep the tab indentation bellow 4 levels. you can take a look at the problem [here](https://playground.jsreport.net/studio/workspace/ByLeJOiIM/7) and see how it is fixed by just updating the indentation [here](https://playground.jsreport.net/studio/workspace/rkvURPi8z/7).
