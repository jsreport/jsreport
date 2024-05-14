# @jsreport/jsreport-html-to-xlsx
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-html-to-xlsx.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-html-to-xlsx)

**jsreport recipe capable of converting html into excel**

See https://jsreport.net/learn/html-to-xlsx

## Changelog

### 4.1.2

- update @jsreport/office to fix set `res.meta.fileExtension` without starting `.`

### 4.1.1

- update chrome-page-eval to fix compatibility with newer chrome

### 4.1.0

- performance optimizations
- update html-to-xlsx to fix audit
- internal changes to support new `response.output` api

### 4.0.1

- update chrome-page-eval to fix issues with aws lambda
- update @jsreport/office

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.3.2

- fix passing chrome launchOptions to chrome-page-eval

### 3.3.1

- update html-to-xlsx to fix npm audit

### 3.3.0

- no table elements should be a weak error

### 3.2.3

- fix run of html-to-xlsx with phantom
- fix htmlToXlsxEachRows helper not being present when rendering html-to-xlsx recipe
- mark user logs appropriately to the logger

### 3.2.2

- changes to enable caching of system helpers

### 3.2.1

- fix not considering `reportTimeout` for the recipe execution

### 3.2.0

- update deps to fix npm audit

### 3.0.1

- fix error line numbers in html to xlsx

### 3.0.0-beta.1

Adaptations for the v3 APIs
