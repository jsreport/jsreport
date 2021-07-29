# jsreport-xlsx

[![NPM Version](http://img.shields.io/npm/v/jsreport-xlsx.svg?style=flat-square)](https://npmjs.com/package/jsreport-xlsx)
[![Build Status](https://travis-ci.org/jsreport/jsreport-xlsx.png?branch=master)](https://travis-ci.org/jsreport/jsreport-xlsx)

> jsreport recipe which renders excel reports based on uploaded excel templates by modifying the xlsx source using predefined templating engine helpers

See the docs https://jsreport.net/learn/xlsx

## Installation

>npm install jsreport-xlsx

## jsreport-core

```js
var fs = require('fs')
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-xlsx')())
jsreport.use(require('jsreport-handlebars')())

jsreport.init().then(function () {
  return jsreport.render({
    template: {
      recipe: 'xlsx',
      engine: 'handlebars',
      content: '{{{xlsxPrint}}}',
      xlsxTemplate: {
        content: fs.readFileSync('Book1.xlsx').toString('base64')
      }
    }
  }).then(function (report) {
    report.stream.pipe(fs.createWriteStream('out.xlsx'))
  })
})
```
