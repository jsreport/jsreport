# @jsreport/jsreport-pdf-utils
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-pdf-utils.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-pdf-utils)

**jsreport extension providing pdf operations like merge or concatenation**

See https://jsreport.net/learn/pdf-utils

## Changelog

### 3.8.0

- allow pdf-utils append/prepend operation at specific page #551 

### 3.7.0

- support copy outlines when doing merge/append
- add studio UI to handle pdfMeta custom metadata
- fix typo in definition of sandbox hidden property

### 3.6.0

- added support for specifying custom properties for PDF metadata
- dont fail when recipe null not yet validated

### 3.5.0

- add option `pdfAccessibility.enabled` to support copying accessibility tags
- add support for generating files with pdf/A compliance
- add `pdfDest` helper to support cross page clickable links
- support phantom with native header in pdf utils

### 3.4.1

- changes to enable caching of system helpers

### 3.4.0

- add support for checkboxes in pdf
- add support for attachments in pdf
- remove only the white default chrome background when merging

### 3.3.0

- improve merge of document with annotations
- update deps to fix npm audit warnings

### 3.0.1

- fix pdf utils merge operation never ending in profile

### 3.0.0-beta.1

Adaptations for the v3 APIs
