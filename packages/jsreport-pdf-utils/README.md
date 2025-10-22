# @jsreport/jsreport-pdf-utils
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-pdf-utils.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-pdf-utils)

**jsreport extension providing pdf operations like merge or concatenation**

See https://jsreport.net/learn/pdf-utils

## Changelog

### 4.4.1

- reflect and add guided autofix for the chromium 138 flexbox change
- adapt to work with uncompressed content streams produced by latest chromium

### 4.4.0

- add support for pdf compression

### 4.3.0

- update deps to fix audit
- support chrome 133 generated structures
- improve perf processSMask pdfA
- copy aria tags for chrome 131 generated pdfs

### 4.2.2

- improve manipulation support for more cases of external pdf files

### 4.2.1

- remove references to pdfjs-dist

### 4.2.0

- stop using pdfjs-dist for test parsing and use our implementation
- support external pdf with missing EOL after endstream improve merging pdf outlines

### 4.1.1

- dont set lang when it was already filled, fixes compatibility with newer chrome

### 4.1.0

- support merging/appending pdf with outlines
- internal changes to support new `response.output` api

### 4.0.2

- initial support of the pdf/ua

### 4.0.1

- fix hyperlinks not working when adding password to pdf

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.9.0

- improve the support for parsing and working with external pdfs
- support new option `appendAfterPageNumber` in jsreport-proxy `pdfUtils.append` to allowing appending new pages starting at specific index

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
