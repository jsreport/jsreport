# jsreport-localization
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-localization.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-localization)

**jsreport exension adding `localize` helper**

See https://jsreport.net/learn/localization

## Changelog

### 4.0.1

- support localization with nested objects

### 4.0.0

- cache localization calls to improve performance
- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.2.2

- use old `req.options.language` when `req.template.localization` is empty

### 3.2.1

- changes to enable caching of system helpers

### 3.2.0

accept object for localize function and propagate req.template.localization to the child templates

### 3.0.1

- use relative path to the currently evaluated entity (when localization is used from script the current path is equal to the running script)

### 3.0.0-beta.1

Adaptations for the v3 APIs
