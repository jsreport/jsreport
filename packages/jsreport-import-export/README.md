# @jsreport/jsreport-import-export
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-import-export.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-import-export)

**jsreport extension adding support for exporting and importing jsreport objects**

See http://jsreport.net/learn/import-export

## Changelog

### 4.0.8

- update deps to fix audit

### 4.0.7

- update deps to fix audit

### 4.0.6

- update axios to fix audit

### 4.0.5

- update axios to fix audit

### 4.0.4

- make export to not commit transaction to improve performance in stores

### 4.0.3

- fix snyk audit

### 4.0.2

- update axios to fix npm audit

### 4.0.1

- fix issues when importing an export that contain folder (and nested entities) inside the same folder

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.2.0

- refactor to use new methods `collection.findAdmin`, `collection.findOneAdmin`, `reporter.adminRequest`

### 3.1.3

- changes to studio ui to support multi-selection of entities
- fix npm audit

### 3.1.2

- fix import-export cli authorization errors when running

### 3.1.0

- compatibility updates for new version of jsreport-cli (import, export commands)

### 3.0.1

- refactor ListenerCollection usage for better stack traces

### 3.0.0-beta.1

Adaptations for the v3 APIs
