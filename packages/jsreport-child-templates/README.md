# @jsreport/jsreport-child-templates
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-child-templates.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-child-templates)

**jsreport extension adding support to combine one template from multiple sub templates**

See https://jsreport.net/learn/child-templates

## Changelog

### 4.1.0

- internal changes to support new `response.output` api

### 4.0.0

- minimum node.js version is now `18.15.0`

### 3.1.0

- improve logging and errors

### 3.0.3

- changes to enable caching of system helpers

### 3.0.2

- update deps to fix npm vulnerabilities report

### 3.0.0-beta.1

Initial release for jsreport v3
New templating engine helpers introduced
```
{{#childTemplate pathOrName}}
```
