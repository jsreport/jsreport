# @jsreport/jsreport-pptx
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-pptx.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-pptx)

**jsreport recipe for creating pptx reports**

See https://jsreport.net/learn/pptx

## Changelog

### 4.4.2

- update deps to fix audit

### 4.4.1

- update deps to fix audit

### 4.4.0

- update deps to fix audit
- pptxTable support col width customization

### 4.3.2

- update axios to fix audit

### 4.3.1

- usage of Handlebars.createFrame should inherit existing data to ensure it correctly propagates existing values

### 4.3.0

- support for dynamic rows, columns generation
- add support for hyperlinks in loop
- use decodeURIComponentRecursive helper to handle better different cases of MS Programs storing encoding target urls

### 4.2.1

- update @jsreport/office to fix set `res.meta.fileExtension` without starting `.`

### 4.2.0

- fix concat tags logic
- fix can not render report using pptxSlides with one item array
- throw better error when pptxSlides is used as a block helper call
- internal changes to support new `response.output` api

### 4.1.0

- add pptxStyle support
- add pptxChart support

### 4.0.1

- make handlebars partials to work
- remove NUL, VERTICAL TAB characters

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.4.0

- fix pptxSlides issues with updates after xmldom dep update

### 3.3.0

- fix support of pptxTable and add support for vertical tables
- pptxImage now support same options as `docxImage` (usePlaceholderSize, width, height options)
- accept buffer strings as base64 and throw better error when failed to parse office template input

### 3.2.1

- changes to enable caching of system helpers

### 3.2.0

- update to support new api for office asset display

### 3.0.1

- fix errorLine in stack trace when propagating from pptx

### 3.0.0-beta.1

Adaptations for the v3 APIs
